import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../../services/api';
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
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';

export default function BranchManagement() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: ''
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await getBranches();
      setBranches(response || []);
    } catch (err) {
      showToast('Filiallarni yuklashda xato: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleToastClose = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('Filial nomi kiritilishi shart', 'error');
      return;
    }

    try {
      setLoading(true);
      if (editId) {
        await updateBranch(editId, formData);
        showToast('Filial muvaffaqiyatli tahrirlandi!', 'success');
      } else {
        await createBranch(formData);
        showToast('Filial muvaffaqiyatli qo\'shildi!', 'success');
      }
      setShowForm(false);
      setEditId(null);
      setFormData({ name: '', address: '', phone: '' });
      await fetchBranches();
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(false);
    }
  };

  const handleEdit = (branch) => {
    setFormData({
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || ''
    });
    setEditId(branch.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu filialni o\'chirishni xohlaysizmi?')) return;
    try {
      setLoading(true);
      await deleteBranch(id);
      showToast('Filial o\'chirildi!', 'success');
      await fetchBranches();
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(false);
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
      <Box sx={{ width: '100%' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon /> Filiallarni Boshqarish
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setShowForm(true);
              setEditId(null);
              setFormData({ name: '', address: '', phone: '' });
            }}
            sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
          >
            Yangi Filial
          </Button>
        </Box>

        {/* Loading Spinner */}
        {loading && branches.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {branches.length === 0 ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 6, textAlignment: 'center', border: '1px dashed #cbd5e1', bgcolor: 'transparent', borderRadius: 3 }}>
                  <Typography variant="body1" color="text.secondary" align="center">
                    Filiallar topilmadi
                  </Typography>
                </Paper>
              </Grid>
            ) : (
              branches.map((branch) => (
                <Grid item xs={12} sm={6} md={4} key={branch.id}>
                  <Card
                    elevation={0}
                    sx={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 3,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      '&:hover': {
                        boxShadow: '0 8px 16px -4px rgba(0,0,0,0.08)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(37, 99, 235, 0.05)', color: '#2563eb' }}>
                          <BusinessIcon />
                        </Box>
                        <Typography variant="subtitle1" fontWeight="700" color="#0f172a">
                          {branch.name}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {branch.address && (
                          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <LocationIcon fontSize="small" sx={{ color: 'text.secondary' }} /> {branch.address}
                          </Typography>
                        )}
                        {branch.phone && (
                          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <PhoneIcon fontSize="small" sx={{ color: 'text.secondary' }} /> {branch.phone}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="Tahrirlash">
                        <IconButton size="small" color="info" onClick={() => handleEdit(branch)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="O'chirish">
                        <IconButton size="small" color="error" onClick={() => handleDelete(branch.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}

        {/* Create/Edit Branch Dialog */}
        <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="700">
              {editId ? 'Filialni Tahrirlash' : 'Yangi Filial Qo\'shish'}
            </Typography>
            <IconButton onClick={() => setShowForm(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent dividers>
              <TextField
                required
                fullWidth
                label="Filial nomi"
                size="small"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ mb: 2.5 }}
              />
              <TextField
                fullWidth
                label="Manzili"
                size="small"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                sx={{ mb: 2.5 }}
              />
              <TextField
                fullWidth
                label="Telefon raqami"
                placeholder="+998 XX XXX XX XX"
                size="small"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setShowForm(false)} color="inherit" sx={{ textTransform: 'none' }}>
                Bekor qilish
              </Button>
              <Button type="submit" variant="contained" color="primary" sx={{ textTransform: 'none', px: 3 }}>
                {editId ? 'Saqlash' : 'Qo\'shish'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Toast Notification */}
        <Snackbar open={toast.open} autoHideDuration={4000} onClose={handleToastClose}>
          <Alert onClose={handleToastClose} severity={toast.severity} sx={{ width: '100%', borderRadius: 2 }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
}