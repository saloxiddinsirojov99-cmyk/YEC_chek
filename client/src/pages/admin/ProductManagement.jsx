import { useEffect, useState, useMemo } from 'react';
import Layout from '../../components/Layout';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCollections,
  previewBulkPrice,
  bulkUpdatePrice
} from '../../services/api';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  Tabs,
  Tab,
  Chip,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Inventory as InventoryIcon,
  Search as SearchIcon,
  PriceChange as PriceChangeIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Layers as LayersIcon
} from '@mui/icons-material';

const PAGE_SIZE = 24;

export default function ProductManagement() {
  // Tabs: 0 = Products list, 1 = Bulk m² price update
  const [activeTab, setActiveTab] = useState(0);

  // Products state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Single Product Modal
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'rol',
    description: '',
    price: 0,
    is_active: 1
  });

  // Bulk m² Price Editor state
  const [collectionsList, setCollectionsList] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkCategory, setBulkCategory] = useState('all');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState({ count: 0, preview: [] });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchProducts();
    fetchCollections();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts();
      setProducts(response || []);
    } catch (err) {
      showToast('Mahsulotlarni yuklashda xato: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await getCollections();
      setCollectionsList(response || []);
    } catch (err) {
      console.error('Kolleksiyalarni olishda xato:', err);
    }
  };

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleToastClose = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  // Filtered & Paginated Products for Tab 1
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [products, categoryFilter, searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

  // Single Product Create / Edit Handlers
  const handleOpenCreate = () => {
    setEditId(null);
    setFormData({
      name: '',
      code: '',
      category: 'rol',
      description: '',
      price: 0,
      is_active: 1
    });
    setShowForm(true);
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name || '',
      code: product.code || '',
      category: product.category || 'rol',
      description: product.description || '',
      price: product.price || 0,
      is_active: product.is_active !== undefined ? product.is_active : 1
    });
    setEditId(product.id);
    setShowForm(true);
  };

  // Codes parsed for multi-code creation
  const parsedCodes = useMemo(() => {
    if (!formData.code || typeof formData.code !== 'string') return [];
    return formData.code.split(/[,;\n\s]+/).map(c => c.trim()).filter(Boolean);
  }, [formData.code]);

  const previewProductNames = useMemo(() => {
    const baseName = formData.name ? formData.name.trim() : '';
    if (!baseName) return [];
    if (parsedCodes.length === 0) return [baseName];
    return parsedCodes.map(c => {
      const regex = new RegExp(`\\(${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)$`, 'i');
      return regex.test(baseName) ? baseName : `${baseName} (${c})`;
    });
  }, [formData.name, parsedCodes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.price < 0) {
      showToast('Iltimos, mahsulot nomi va narxini to\'g\'ri kiriting', 'error');
      return;
    }

    try {
      setFormSubmitting(true);
      if (editId) {
        let finalName = formData.name.trim();
        if (formData.code && formData.code.trim()) {
          const c = formData.code.trim();
          const regex = new RegExp(`\\(${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)$`, 'i');
          if (!regex.test(finalName)) {
            finalName = `${finalName} (${c})`;
          }
        }
        await updateProduct(editId, { ...formData, name: finalName });
        showToast('Mahsulot muvaffaqiyatli tahrirlandi!', 'success');
      } else {
        const payload = {
          ...formData,
          name: formData.name.trim(),
          codes: parsedCodes.length > 0 ? parsedCodes : (formData.code ? [formData.code.trim()] : [])
        };
        const res = await createProduct(payload);
        const count = res?.count || (Array.isArray(res?.data) ? res.data.length : 1);
        showToast(count > 1 ? `${count} ta mahsulot muvaffaqiyatli yaratildi!` : 'Yangi mahsulot muvaffaqiyatli qo\'shildi!', 'success');
      }
      setShowForm(false);
      setEditId(null);
      await fetchProducts();
      await fetchCollections();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu mahsulotni o\'chirishni xohlaysizmi?')) return;
    try {
      setLoading(true);
      await deleteProduct(id);
      showToast('Mahsulot muvaffaqiyatli o\'chirildi!', 'success');
      await fetchProducts();
      await fetchCollections();
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(false);
    }
  };

  // Bulk Price Update Handlers
  useEffect(() => {
    if (selectedCollections.length === 0) {
      setBulkPreview({ count: 0, preview: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const data = await previewBulkPrice({
          collections: selectedCollections,
          category: bulkCategory
        });
        setBulkPreview(data || { count: 0, preview: [] });
      } catch (err) {
        console.error('Preview error:', err);
      } finally {
        setPreviewLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedCollections, bulkCategory]);

  const handleBulkUpdateSubmit = async () => {
    const numPrice = parseFloat(bulkPrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      showToast('Iltimos, yaroqli m² narxini kiriting (0 dan katta bo\'lishi shart)', 'error');
      return;
    }
    if (selectedCollections.length === 0) {
      showToast('Kamida bitta kolleksiya yoki nom tanlang', 'error');
      return;
    }

    try {
      setBulkLoading(true);
      setConfirmDialogOpen(false);
      const res = await bulkUpdatePrice({
        collections: selectedCollections,
        price: numPrice,
        category: bulkCategory
      });
      showToast(res.message || `${res.updatedCount} ta mahsulot narxi muvaffaqiyatli yangilandi!`, 'success');
      
      // Reset form
      setSelectedCollections([]);
      setBulkPrice('');
      setBulkPreview({ count: 0, preview: [] });

      // Refresh data
      await fetchProducts();
      await fetchCollections();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Asosiy' },
    { path: '/admin/products', label: 'Mahsulotlar' },
    { path: '/admin/branches', label: 'Filiallar' },
    { path: '/admin/users', label: 'Foydalanuvchilar' },
    { path: '/admin/orders', label: 'Buyurtmalar' },
    { path: '/admin/statistics', label: 'Statistika' }
  ];

  return (
    <Layout navItems={navItems}>
      <Box sx={{ width: '100%', pb: 6 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Mahsulotlarni Boshqarish
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bazada jami {products.length.toLocaleString()} ta mahsulot mavjud
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={() => { fetchProducts(); fetchCollections(); }}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Yangilash
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 2.5,
                fontWeight: 600,
                boxShadow: '0 4px 14px 0 rgba(26, 86, 219, 0.35)'
              }}
            >
              Yangi Mahsulot
            </Button>
          </Stack>
        </Box>

        {/* Main Navigation Tabs */}
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, mb: 3, overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            indicatorColor="primary"
            textColor="primary"
            sx={{
              px: 2,
              '& .MuiTab-root': {
                py: 2,
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 700,
                minHeight: 56
              }
            }}
          >
            <Tab icon={<InventoryIcon sx={{ fontSize: 20 }} />} iconPosition="start" label={`Mahsulotlar Ro'yxati (${filteredProducts.length})`} />
            <Tab
              icon={<PriceChangeIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="m² Narxlarni Ommaviy Tahrirlash (Multi-Select)"
              sx={{
                color: activeTab === 1 ? 'primary.main' : '#047857',
                '&.Mui-selected': { color: '#047857' }
              }}
            />
          </Tabs>
        </Paper>

        {/* TAB 0: Products List */}
        {activeTab === 0 && (
          <Box>
            {/* Filters Bar */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Mahsulot nomi, kodi yoki tavsifidan qidirish..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearchQuery('')}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                    <Chip
                      label="Barchasi"
                      clickable
                      color={categoryFilter === 'all' ? 'primary' : 'default'}
                      variant={categoryFilter === 'all' ? 'filled' : 'outlined'}
                      onClick={() => { setCategoryFilter('all'); setPage(1); }}
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      label="Metraj / Rol (Tufting)"
                      clickable
                      color={categoryFilter === 'rol' ? 'primary' : 'default'}
                      variant={categoryFilter === 'rol' ? 'filled' : 'outlined'}
                      onClick={() => { setCategoryFilter('rol'); setPage(1); }}
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      label="Tayyor / Statick"
                      clickable
                      color={categoryFilter === 'statick' ? 'primary' : 'default'}
                      variant={categoryFilter === 'statick' ? 'filled' : 'outlined'}
                      onClick={() => { setCategoryFilter('statick'); setPage(1); }}
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* Products Grid */}
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary">Mahsulotlar yuklanmoqda...</Typography>
              </Box>
            ) : paginatedProducts.length === 0 ? (
              <Paper sx={{ p: 8, textAlign: 'center', border: '1px dashed #cbd5e1', bgcolor: '#f8fafc', borderRadius: 3 }}>
                <InventoryIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />
                <Typography variant="h6" fontWeight="600" color="#334155">
                  Mahsulotlar topilmadi
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Qidiruv so'zini yoki tanlangan kategoriyani o'zgartirib ko'ring
                </Typography>
              </Paper>
            ) : (
              <>
                <Grid container spacing={2.5}>
                  {paginatedProducts.map((product) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                      <Card
                        elevation={0}
                        sx={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 3,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 12px 24px -4px rgba(15, 23, 42, 0.08)',
                            borderColor: '#cbd5e1'
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Chip
                              label={product.category === 'rol' ? 'Metraj (Rol)' : 'Tayyor (Statick)'}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                bgcolor: product.category === 'rol' ? '#eff6ff' : '#f0fdf4',
                                color: product.category === 'rol' ? '#1d4ed8' : '#15803d',
                                border: '1px solid',
                                borderColor: product.category === 'rol' ? '#bfdbfe' : '#bbf7d0'
                              }}
                            />
                            {product.code && (
                              <Typography variant="caption" sx={{ bgcolor: '#f1f5f9', color: '#475569', px: 1, py: 0.3, borderRadius: 1, fontWeight: 700 }}>
                                Kod: {product.code}
                              </Typography>
                            )}
                          </Box>

                          <Typography variant="subtitle1" fontWeight="700" color="#0f172a" sx={{ lineHeight: 1.3, minHeight: '38px', mt: 1 }}>
                            {product.name}
                          </Typography>

                          {product.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt: 0.5,
                                fontSize: '0.82rem',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                minHeight: '34px'
                              }}
                            >
                              {product.description}
                            </Typography>
                          )}

                          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.2 }}>
                              {product.category === 'rol' ? 'm² narxi:' : 'Dona narxi:'}
                            </Typography>
                            <Typography variant="h6" color="#047857" fontWeight="800">
                              {product.price.toLocaleString()} so'm
                            </Typography>
                          </Box>
                        </CardContent>

                        <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="Tahrirlash">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEdit(product)}
                              sx={{ bgcolor: '#f0fdf4', '&:hover': { bgcolor: '#dcfce7' } }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="O'chirish">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(product.id)}
                              sx={{ bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(e, val) => {
                        setPage(val);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      color="primary"
                      size="large"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {/* TAB 1: Bulk m² Price Editor */}
        {activeTab === 1 && (
          <Box>
            <Grid container spacing={3}>
              {/* Form Card */}
              <Grid item xs={12} md={5}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#ecfdf5', color: '#059669' }}>
                      <PriceChangeIcon />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight="700" color="#0f172a">
                        m² Narxlarni Ommaviy O'zgartirish
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Tanlangan nomlar bo'yicha barcha mahsulotlar yangilanadi
                      </Typography>
                    </Box>
                  </Box>

                  <Alert severity="info" sx={{ mb: 3, borderRadius: 2, fontSize: '0.85rem' }}>
                    Multi-select maydonida bir yoki bir nechta kolleksiyani tanlang (masalan: <b>Grafik</b>, <b>Zumrud</b>).
                    Shu nom qatnashgan barcha mahsulotlar (masalan: <i>Grafik 7000</i>, <i>Grafik-01</i>, <i>Zumrud 555</i>) bitta bosish bilan yangilanadi!
                  </Alert>

                  {/* Multi-Select Collections / Names */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight="700" color="#334155" sx={{ mb: 1 }}>
                      Kolleksiyalar / Nomlar (Multi-Select) *
                    </Typography>
                    <Autocomplete
                      multiple
                      freeSolo
                      options={collectionsList.map(c => c.collection)}
                      value={selectedCollections}
                      onChange={(e, newValue) => setSelectedCollections(newValue)}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            variant="filled"
                            color="primary"
                            label={option}
                            size="small"
                            {...getTagProps({ index })}
                            key={option}
                            sx={{ fontWeight: 600, m: 0.3 }}
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Nom tanlang yoki yozib Enter bosing..."
                          helperText="Masalan: Grafik, Zumrud, Luna, Touch, Steffano..."
                        />
                      )}
                    />
                  </Box>

                  {/* Quick Select Popular Chips */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="caption" fontWeight="700" color="#64748b" sx={{ display: 'block', mb: 0.8 }}>
                      Tezkor tanlash (Bozordagi ommabop kolleksiyalar):
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                      {['Grafik', 'Zumrud', 'Luna', 'Touch', 'Etalon', 'Zeugma', 'Zenit', 'Trio', 'Steffano'].map((coll) => {
                        const isSelected = selectedCollections.includes(coll);
                        return (
                          <Chip
                            key={coll}
                            label={coll}
                            size="small"
                            clickable
                            color={isSelected ? 'success' : 'default'}
                            variant={isSelected ? 'filled' : 'outlined'}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedCollections(selectedCollections.filter(c => c !== coll));
                              } else {
                                setSelectedCollections([...selectedCollections, coll]);
                              }
                            }}
                            sx={{ fontWeight: 600 }}
                          />
                        );
                      })}
                    </Box>
                  </Box>

                  {/* New Price Input */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight="700" color="#334155" sx={{ mb: 1 }}>
                      Yangi m² Narxi (so'mda) *
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      placeholder="Masalan: 160000"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">so'm / m²</InputAdornment>
                      }}
                      helperText={
                        bulkPrice && !isNaN(parseFloat(bulkPrice))
                          ? `Kiritilgan narx: ${parseFloat(bulkPrice).toLocaleString()} so'm / m²`
                          : "m² uchun belgilangan yangi narx"
                      }
                    />
                  </Box>

                  {/* Optional Category Filter */}
                  <Box sx={{ mb: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="bulk-cat-label">Kategoriya bo'yicha filter (Ixtiyoriy)</InputLabel>
                      <Select
                        labelId="bulk-cat-label"
                        value={bulkCategory}
                        label="Kategoriya bo'yicha filter (Ixtiyoriy)"
                        onChange={(e) => setBulkCategory(e.target.value)}
                      >
                        <MenuItem value="all">Barcha mahsulotlar (Metraj ham, Tayyor ham)</MenuItem>
                        <MenuItem value="rol">Faqat Metraj / Rol (Tufting)</MenuItem>
                        <MenuItem value="statick">Faqat Tayyor / Statick</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Actions */}
                  <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() => {
                        setSelectedCollections([]);
                        setBulkPrice('');
                        setBulkPreview({ count: 0, preview: [] });
                      }}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                      Tozalash
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      disabled={selectedCollections.length === 0 || !bulkPrice || bulkPreview.count === 0 || bulkLoading}
                      onClick={() => setConfirmDialogOpen(true)}
                      startIcon={bulkLoading ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 700,
                        py: 1.2,
                        fontSize: '0.95rem',
                        boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.4)'
                      }}
                    >
                      {bulkLoading ? 'Yangilanmoqda...' : `${bulkPreview.count} ta Mahsulot Narxini Yangilash`}
                    </Button>
                  </Stack>
                </Paper>
              </Grid>

              {/* Preview Table Card */}
              <Grid item xs={12} md={7}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LayersIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" fontWeight="700" color="#0f172a">
                        O'zgaradigan Mahsulotlar Ro'yxati (Oldindan Ko'rish)
                      </Typography>
                    </Box>
                    {previewLoading && <CircularProgress size={20} />}
                  </Box>

                  {selectedCollections.length === 0 ? (
                    <Box sx={{ py: 8, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                      <Typography variant="body1" color="text.secondary" fontWeight="500">
                        Chap tomondan kamida bitta kolleksiya yoki nom tanlang (masalan: Grafik, Zumrud)
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Shunda bu yerda ta'sirlanuvchi mahsulotlar va ularning joriy narxi ko'rsatiladi
                      </Typography>
                    </Box>
                  ) : bulkPreview.count === 0 ? (
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                      Tanlangan <b>{selectedCollections.join(', ')}</b> nomlari bo'yicha hech qanday mahsulot topilmadi.
                    </Alert>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#ecfdf5', borderRadius: 2, mb: 2, border: '1px solid #a7f3d0' }}>
                        <Typography variant="subtitle2" fontWeight="700" color="#065f46">
                          Jami {bulkPreview.count} ta mahsulot yangilanishi kutilmoqda
                        </Typography>
                        {bulkPrice && !isNaN(parseFloat(bulkPrice)) && (
                          <Typography variant="body2" fontWeight="700" color="#047857">
                            Yangi narx: {parseFloat(bulkPrice).toLocaleString()} so'm
                          </Typography>
                        )}
                      </Box>

                      <TableContainer sx={{ maxHeight: 440, border: '1px solid #f1f5f9', borderRadius: 2 }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Mahsulot nomi</TableCell>
                              <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Kodi</TableCell>
                              <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Kategoriya</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Joriy narx</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#047857' }}>Yangi narx</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {bulkPreview.preview.map((p) => {
                              const newP = parseFloat(bulkPrice);
                              return (
                                <TableRow key={p.id} hover>
                                  <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{p.code || '—'}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={p.category === 'rol' ? 'Rol' : 'Statick'}
                                      size="small"
                                      sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: '#475569' }}>
                                    {p.price.toLocaleString()} so'm
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700, color: newP ? '#047857' : '#94a3b8' }}>
                                    {newP ? `${newP.toLocaleString()} so'm` : '—'}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {bulkPreview.count > 60 && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                          (Ro'yxatda dastlabki 60 ta mahsulot ko'rsatilmoqda. Jami {bulkPreview.count} ta mahsulotning barchasi yangilanadi)
                        </Typography>
                      )}
                    </>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Create / Edit Single Product Dialog */}
        <Dialog open={showForm} onClose={() => !formSubmitting && setShowForm(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
            <Typography variant="h6" fontWeight="700">
              {editId ? 'Mahsulotni Tahrirlash' : 'Yangi Mahsulot Qo\'shish'}
            </Typography>
            <IconButton onClick={() => setShowForm(false)} disabled={formSubmitting}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent dividers sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={editId ? 7 : 6}>
                  <TextField
                    required
                    fullWidth
                    label={editId ? "Mahsulot nomi" : "Mahsulot asosiy nomi"}
                    size="small"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={editId ? "Masalan: iran (PR27A)" : "Masalan: iran yoki zumrud"}
                    helperText={!editId ? "Asosiy nom (masalan: iran). Kodlar avtomatik qavsda qo'shiladi" : ""}
                  />
                </Grid>
                <Grid item xs={12} sm={editId ? 5 : 6}>
                  <TextField
                    fullWidth
                    label={editId ? "Mahsulot Kodi" : "Mahsulot Kodlari (bir nechta)"}
                    size="small"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={editId ? "Masalan: PR27A" : "Masalan: PR27A, PR28B, 1011"}
                    helperText={!editId ? "Bir nechta bo'lsa vergul yoki bo'sh joy bilan yozing" : ""}
                  />
                </Grid>

                {/* Jonli Oldindan Ko'rish (Live Preview) */}
                {!editId && formData.name.trim() && previewProductNames.length > 0 && (
                  <Grid item xs={12}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        bgcolor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 2
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#166534',
                          fontWeight: 700,
                          display: 'block',
                          mb: 0.8
                        }}
                      >
                        ✨ Yaratiladigan mahsulotlar ({previewProductNames.length} ta):
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                        {previewProductNames.map((pName, idx) => (
                          <Chip
                            key={idx}
                            label={pName}
                            size="small"
                            color="success"
                            variant="filled"
                            sx={{ fontWeight: 600, fontSize: '0.8rem' }}
                          />
                        ))}
                      </Box>
                    </Paper>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="category-select-label">Kategoriya</InputLabel>
                    <Select
                      labelId="category-select-label"
                      value={formData.category}
                      label="Kategoriya"
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <MenuItem value="rol">Metraj / Rol (Tufting) - m² narx</MenuItem>
                      <MenuItem value="statick">Tayyor / Statick - dona narx</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    type="number"
                    label={formData.category === 'rol' ? "m² Narxi (so'm)" : "Dona Narxi (so'm)"}
                    size="small"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Tavsifi / Kolleksiya ma'lumoti"
                    size="small"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Masalan: Kolleksiya: Grafik-01, Turi: Metraj (Rol/Tufting)"
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
              <Button onClick={() => setShowForm(false)} color="inherit" disabled={formSubmitting} sx={{ textTransform: 'none' }}>
                Bekor qilish
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={formSubmitting}
                startIcon={formSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ textTransform: 'none', px: 3, fontWeight: 600 }}
              >
                {formSubmitting ? 'Saqlanmoqda...' : (editId ? 'Saqlash' : 'Qo\'shish')}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Confirmation Dialog for Bulk Update */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
            Narxlarni yangilashni tasdiqlaysizmi?
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Siz tanlagan <b>{selectedCollections.join(', ')}</b> bo'yicha jami <b>{bulkPreview.count} ta</b> mahsulotning narxi <b>{parseFloat(bulkPrice || 0).toLocaleString()} so'm</b> qilib yangilanadi.
            </Typography>
            <Alert severity="warning" sx={{ fontSize: '0.82rem' }}>
              Bu amal barcha mos kelgan mahsulotlarning bazadagi narxini darhol o'zgartiradi.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setConfirmDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
              Bekor qilish
            </Button>
            <Button
              onClick={handleBulkUpdateSubmit}
              variant="contained"
              color="success"
              sx={{ textTransform: 'none', px: 3, fontWeight: 700 }}
            >
              Ha, Yangilansin
            </Button>
          </DialogActions>
        </Dialog>

        {/* Toast Notification */}
        <Snackbar open={toast.open} autoHideDuration={4000} onClose={handleToastClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert onClose={handleToastClose} severity={toast.severity} sx={{ width: '100%', borderRadius: 2, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
}