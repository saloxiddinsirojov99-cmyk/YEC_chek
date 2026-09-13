import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getOrders, getOrderById, updateOrder, deleteOrder, getProducts, createOrder } from '../../services/api';
import Receipt from '../../components/Receipt';
import ProductSearchModal from '../../components/ProductSearchModal';
import UzPhoneField, { toBackendPhone, getLocalDigits, formatPersonName } from '../../components/UzPhoneField';
import UzDateField, { isValidDateDDMMYYYY, toBackendDate, toDisplayDate, getTodayDisplayDate } from '../../components/UzDateField';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Card,
  CardContent,
  Tooltip,
  FormHelperText
} from '@mui/material';
import {
  Visibility,
  Edit,
  Delete,
  Add,
  Search,
  FilterList,
  CalendarToday,
  Close,
  CheckCircle,
  Phone,
  LocationOn,
  Note,
  Cancel
} from '@mui/icons-material';

// Helper utilities for dimension parsing and naming
function capitalizeFirstLetter(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function cleanName(str) {
  return str.replace(/\s+/g, ' ').trim();
}

function isValidPhone(phone) {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 9; // relaxed check for ease of use
}

function normalizeRazmer(value) {
  let s = value.replace(/,/g, '.');
  s = s.replace(/[×*]/g, 'x');
  s = s.replace(/\s*[xX]\s*/g, 'x');
  s = s.replace(/\s/g, '');
  s = s.replace(/[^0-9.xga]/g, '');
  return s;
}

function parseRazmer(value) {
  let cleaned = value.replace(/\s/g, '');
  let parts = null;
  
  if (cleaned.includes('x')) parts = cleaned.split('x');
  else if (cleaned.includes('X')) parts = cleaned.split('X');
  else if (cleaned.includes('ga')) parts = cleaned.split('ga');
  else if (cleaned.includes('*')) parts = cleaned.split('*');
  else if (cleaned.includes('×')) parts = cleaned.split('×');

  if (parts && parts.length === 2) {
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      return { width: w, height: h };
    }
  }
  return null;
}

export default function OrderList() {
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals & Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editOrderData, setEditOrderData] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [deliveryConfirmOrder, setDeliveryConfirmOrder] = useState(null);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchTargetIndex, setSearchTargetIndex] = useState(null);
  const [searchIsEdit, setSearchIsEdit] = useState(false);

  // Filters state
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    customer: '',
    phone: '',
    date_from: '',
    date_to: '',
  });

  // Toast Notification state
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Order forms state
  const [formFields, setFormFields] = useState({
    first_name: '',
    last_name: '',
    customer_phone: '',
    customer_phone2: '',
    customer_address: '',
    delivery_date: '',
    paid_amount: '',
    note: ''
  });
  const [formItems, setFormItems] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  // Field references for sequential keyboard navigation
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const phone1Ref = useRef(null);
  const phone2Ref = useRef(null);
  const deliveryDateRef = useRef(null);
  const addressRef = useRef(null);

  // Auto-focus first name input whenever Create Order Dialog opens
  useEffect(() => {
    if (createDialogOpen) {
      const timer = setTimeout(() => {
        if (firstNameRef.current) {
          firstNameRef.current.focus();
          firstNameRef.current.select?.();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [createDialogOpen]);

  // Enter key sequential navigation handlers
  const handleFirstNameKeyDown = (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!formFields.first_name || !formFields.first_name.trim()) {
        setFormErrors(prev => ({ ...prev, first_name: 'Ism kiritilishi shart (faqat harflar, bo\'sh joy kiritilmaydi)' }));
        firstNameRef.current?.focus();
        return;
      }
      setFormErrors(prev => ({ ...prev, first_name: '' }));
      lastNameRef.current?.focus();
      lastNameRef.current?.select?.();
    }
  };

  const handleLastNameKeyDown = (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!formFields.last_name || !formFields.last_name.trim()) {
        setFormErrors(prev => ({ ...prev, last_name: 'Familiya kiritilishi shart (faqat harflar, bo\'sh joy kiritilmaydi)' }));
        lastNameRef.current?.focus();
        return;
      }
      setFormErrors(prev => ({ ...prev, last_name: '' }));
      phone1Ref.current?.focus();
    }
  };

  const handlePhone1KeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const digits = getLocalDigits(formFields.customer_phone);
      if (digits.length !== 9) {
        setFormErrors(prev => ({
          ...prev,
          customer_phone: 'Telefon raqam to\'liq kiritilishi shart (9 ta raqam)'
        }));
        phone1Ref.current?.focus();
        return;
      }
      setFormErrors(prev => ({ ...prev, customer_phone: '' }));
      phone2Ref.current?.focus();
    }
  };

  const handlePhone2KeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const digits2 = getLocalDigits(formFields.customer_phone2);
      if (digits2.length > 0 && digits2.length !== 9) {
        setFormErrors(prev => ({
          ...prev,
          customer_phone2: '2-Telefon raqam to\'liq bo\'lishi kerak (9 ta raqam) yoki bo\'sh qoldiring'
        }));
        phone2Ref.current?.focus();
        return;
      }
      setFormErrors(prev => ({ ...prev, customer_phone2: '' }));
      deliveryDateRef.current?.focus();
    }
  };

  const handleDeliveryDateKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!formFields.delivery_date || !isValidDateDDMMYYYY(formFields.delivery_date)) {
        setFormErrors(prev => ({
          ...prev,
          delivery_date: 'Yetkazish kuni noto\'g\'ri. Format: kun/oy/yil (Mas: 13/09/2026)'
        }));
        deliveryDateRef.current?.focus();
        return;
      }
      setFormErrors(prev => ({ ...prev, delivery_date: '' }));
      addressRef.current?.focus();
      addressRef.current?.select?.();
    }
  };

  const handleAddressKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      openProductSearch(0, false);
    }
  };

  useEffect(() => {
    fetchData();
    if (location.state?.openCreate) {
      handleOpenCreate();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const ordersData = await getOrders();
      const productsData = await getProducts();
      setOrders(ordersData || []);
      setProducts(productsData || []);
      setLoading(false);
    } catch (err) {
      showToast('Ma\'lumotlarni yuklashda xatolik: ' + err.message, 'error');
      setLoading(false);
    }
  };

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  // Check if any order is due for delivery today
  useEffect(() => {
    if (orders.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const pendingDue = orders.find(o => o.status === 'pending' && o.delivery_date <= today);
      if (pendingDue) {
        setDeliveryConfirmOrder(pendingDue);
      }
    }
  }, [orders]);

  const handleDeliveryConfirm = async (delivered) => {
    if (!deliveryConfirmOrder) return;
    try {
      if (delivered) {
        await updateOrder(deliveryConfirmOrder.id, { status: 'completed' });
        showToast(`Buyurtma #${deliveryConfirmOrder.order_number} yakunlandi!`, 'success');
      } else {
        const newDate = prompt('Yangi yetkazish sanasini kiriting (YYYY-MM-DD):', deliveryConfirmOrder.delivery_date);
        if (newDate) {
          await updateOrder(deliveryConfirmOrder.id, { delivery_date: newDate });
          showToast(`Yetkazish sanasi yangilandi: ${newDate}`, 'success');
        }
      }
      setDeliveryConfirmOrder(null);
      fetchData();
    } catch (err) {
      showToast('Xatolik yuz berdi: ' + err.message, 'error');
    }
  };

  // Create Order Handlers
  const handleOpenCreate = () => {
    setFormFields({
      first_name: '',
      last_name: '',
      customer_phone: '+998 ',
      customer_phone2: '',
      customer_address: '',
      delivery_date: getTodayDisplayDate(),
      paid_amount: '',
      note: ''
    });
    setFormItems([{
      product_id: '',
      product_name: '',
      product_code: '',
      razmer: '',
      width: 0,
      height: 0,
      quantity: 1,
      price: 0,
      discount_amount: '',
      note: ''
    }]);
    setFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleAddItem = (isEdit = false) => {
    const newItem = {
      product_id: '',
      product_name: '',
      product_code: '',
      razmer: '',
      width: 0,
      height: 0,
      quantity: 1,
      price: 0,
      discount_amount: '',
      note: ''
    };
    if (isEdit) {
      setEditOrderData(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
    } else {
      setFormItems(prev => [...prev, newItem]);
    }
  };

  const openProductSearch = (index, isEdit = false) => {
    setSearchTargetIndex(index);
    setSearchIsEdit(isEdit);
    setShowProductSearch(true);
  };

  const handleProductSelect = (product) => {
    if (searchTargetIndex === null) return;

    if (searchIsEdit) {
      const itemsCopy = [...editOrderData.items];
      itemsCopy[searchTargetIndex] = {
        ...itemsCopy[searchTargetIndex],
        product_id: product.id,
        product_name: product.name,
        product_code: product.code || '',
        price: product.price
      };
      setEditOrderData(prev => ({ ...prev, items: itemsCopy }));
    } else {
      const itemsCopy = [...formItems];
      itemsCopy[searchTargetIndex] = {
        ...itemsCopy[searchTargetIndex],
        product_id: product.id,
        product_name: product.name,
        product_code: product.code || '',
        price: product.price
      };
      setFormItems(itemsCopy);
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[`item_${searchTargetIndex}_product`];
        delete next[`item_${searchTargetIndex}_price`];
        return next;
      });
    }

    setShowProductSearch(false);
    setSearchTargetIndex(null);
  };

  const handleRemoveItem = (index, isEdit = false) => {
    if (isEdit) {
      const itemsCopy = [...editOrderData.items];
      itemsCopy.splice(index, 1);
      setEditOrderData(prev => ({ ...prev, items: itemsCopy }));
    } else {
      const itemsCopy = [...formItems];
      itemsCopy.splice(index, 1);
      setFormItems(itemsCopy);
    }
  };

  const handleFormItemChange = (index, field, value, isEdit = false) => {
    const itemsList = isEdit ? [...editOrderData.items] : [...formItems];
    const currentItem = { ...itemsList[index] };

    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        currentItem.product_id = value;
        currentItem.product_name = selectedProduct.name;
        currentItem.product_code = selectedProduct.code || '';
        currentItem.price = selectedProduct.price;
      }
    } else if (field === 'razmer') {
      const normalized = normalizeRazmer(value);
      currentItem.razmer = normalized;
      const parsed = parseRazmer(normalized);
      if (parsed) {
        currentItem.width = parsed.width;
        currentItem.height = parsed.height;
        currentItem.quantity = Math.round(parsed.width * parsed.height * 100) / 100;
      } else {
        currentItem.width = 0;
        currentItem.height = 0;
        currentItem.quantity = 1;
      }
    } else {
      currentItem[field] = value;
    }

    itemsList[index] = currentItem;

    if (isEdit) {
      setEditOrderData(prev => ({ ...prev, items: itemsList }));
    } else {
      setFormItems(itemsList);
    }
  };

  const calculateItemSum = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const prc = parseFloat(item.price) || 0;
    const disc = parseFloat(item.discount_amount) || 0;
    const total = qty * prc - disc;
    return total > 0 ? total : 0;
  };

  const calculateTotal = (itemsList) => {
    return itemsList.reduce((sum, item) => sum + calculateItemSum(item), 0);
  };  const validateForm = (fields, itemsList) => {
    const errors = {};
    if (!fields.first_name || !fields.first_name.trim()) errors.first_name = 'Ism kiritilishi shart (faqat harflar, bo\'sh joy kiritilmaydi)';
    if (!fields.last_name || !fields.last_name.trim()) errors.last_name = 'Familiya kiritilishi shart (faqat harflar, bo\'sh joy kiritilmaydi)';
    
    const p1Digits = getLocalDigits(fields.customer_phone);
    if (!p1Digits || p1Digits.length !== 9) {
      errors.customer_phone = 'Telefon raqam to\'liq kiritilishi shart (9 ta raqam)';
    }

    const p2Digits = getLocalDigits(fields.customer_phone2);
    if (p2Digits.length > 0 && p2Digits.length !== 9) {
      errors.customer_phone2 = '2-Telefon raqam to\'liq bo\'lishi kerak (9 ta raqam) yoki bo\'sh qoldiring';
    }

    if (!fields.delivery_date || !isValidDateDDMMYYYY(fields.delivery_date)) {
      errors.delivery_date = 'Yetkazish kuni noto\'g\'ri. Format: kun/oy/yil (Mas: 13/09/2026)';
    }
    
    if (itemsList.length === 0) {
      errors.items = 'Kamida bitta mahsulot kiritilishi shart';
    }

    itemsList.forEach((item, index) => {
      if (!item.product_name) errors[`item_${index}_product`] = 'Mahsulot nomi bo\'sh bo\'lmasligi kerak';
      if (!item.price || parseFloat(item.price) <= 0) {
        errors[`item_${index}_price`] = 'Narx bo\'sh bo\'lmasligi kerak';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(formFields, formItems)) {
      showToast('Iltimos, maydonlarni to\'g\'ri to\'ldiring', 'error');
      return;
    }

    try {
      setLoading(true);
      const customerName = cleanName(`${formatPersonName(formFields.first_name)} ${formatPersonName(formFields.last_name)}`);
      
      const orderData = {
        customer_name: customerName,
        customer_phone: toBackendPhone(formFields.customer_phone),
        customer_phone2: toBackendPhone(formFields.customer_phone2),
        customer_address: formFields.customer_address || '',
        delivery_date: toBackendDate(formFields.delivery_date),
        paid_amount: parseFloat(formFields.paid_amount) || 0,
        note: formFields.note || '',
        items: formItems.map(item => ({
          product_id: item.product_id ? parseInt(item.product_id) : null,
          product_name: item.product_name,
          product_code: item.product_code || '',
          width: parseFloat(item.width) || 0,
          height: parseFloat(item.height) || 0,
          quantity: parseFloat(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
          discount_amount: parseFloat(item.discount_amount) || 0,
          note: item.note || ''
        }))
      };

      const result = await createOrder(orderData);
      setCreateDialogOpen(false);
      showToast('Buyurtma yaratildi!', 'success');
      fetchData();
    } catch (err) {
      showToast('Buyurtma yaratishda xato: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Edit Order Handlers
  const handleOpenEdit = async (order) => {
    try {
      const fullOrder = await getOrderById(order.id);
      const nameParts = fullOrder.customer_name.split(' ');
      
      setFormFields({
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        customer_phone: fullOrder.customer_phone || '',
        customer_phone2: fullOrder.customer_phone2 || '',
        customer_address: fullOrder.customer_address || '',
        delivery_date: toDisplayDate(fullOrder.delivery_date),
        paid_amount: (fullOrder.paid_amount !== undefined && fullOrder.paid_amount !== null && fullOrder.paid_amount !== 0) ? fullOrder.paid_amount : '',
        note: fullOrder.note || '',
        status: fullOrder.status
      });

      const dbItems = fullOrder.order_items || fullOrder.items || [];
      const editItems = dbItems.map(item => ({
        ...item,
        discount_amount: item.discount_percent || item.discount_amount ? (item.discount_amount || item.discount_percent) : '',
        razmer: item.width && item.height ? `${item.width}x${item.height}` : ''
      }));

      setEditOrderData({
        id: fullOrder.id,
        order_number: fullOrder.order_number,
        items: editItems
      });
      setFormErrors({});
      setEditDialogOpen(true);
    } catch (err) {
      showToast('Buyurtmani yuklashda xato: ' + err.message, 'error');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(formFields, editOrderData.items)) {
      showToast('Iltimos, maydonlarni to\'g\'ri to\'ldiring', 'error');
      return;
    }

    try {
      setLoading(true);
      const customerName = cleanName(`${formatPersonName(formFields.first_name)} ${formatPersonName(formFields.last_name)}`);
      
      const updateData = {
        customer_name: customerName,
        customer_phone: toBackendPhone(formFields.customer_phone),
        customer_phone2: toBackendPhone(formFields.customer_phone2),
        customer_address: formFields.customer_address || '',
        delivery_date: toBackendDate(formFields.delivery_date),
        paid_amount: parseFloat(formFields.paid_amount) || 0,
        note: formFields.note || '',
        status: formFields.status,
        items: editOrderData.items.map(item => ({
          product_id: item.product_id ? parseInt(item.product_id) : null,
          product_name: item.product_name,
          product_code: item.product_code || '',
          width: parseFloat(item.width) || 0,
          height: parseFloat(item.height) || 0,
          quantity: parseFloat(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
          discount_amount: parseFloat(item.discount_amount) || 0,
          note: item.note || ''
        }))
      };

      await updateOrder(editOrderData.id, updateData);
      setEditDialogOpen(false);
      showToast('Buyurtma yangilandi!', 'success');
      fetchData();
    } catch (err) {
      showToast('Yangilashda xato: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete Order Handler
  const handleDelete = async (id) => {
    if (!window.confirm('Haqiqatan ham bu buyurtmani o\'chirmoqchisizdan?')) return;
    try {
      setLoading(true);
      await deleteOrder(id);
      showToast('Buyurtma o\'chirildi', 'success');
      fetchData();
    } catch (err) {
      showToast('O\'chirishda xatolik: ' + err.message, 'error');
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterSubmit = () => {
    const params = {};
    if (statusFilter !== 'all') params.status = statusFilter;
    if (filters.customer) params.customer = filters.customer;
    if (filters.phone) params.phone = filters.phone;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    setLoading(true);
    getOrders(params)
      .then(res => {
        setOrders(res || []);
        setLoading(false);
      })
      .catch(err => {
        showToast('Xato: ' + err.message, 'error');
        setLoading(false);
      });
  };

  // Search logic in client side for instant feel, combined with server filters
  const filteredOrders = orders.filter(o => {
    const term = searchQuery.toLowerCase();
    const matchSearch =
      o.customer_name.toLowerCase().includes(term) ||
      o.customer_phone.toLowerCase().includes(term) ||
      o.order_number.toLowerCase().includes(term);
    
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const navItems = [
    { path: '/seller/create-order', label: 'Yangi Buyurtma', onClick: (e) => { e.preventDefault(); handleOpenCreate(); } },
    { path: '/seller/orders', label: 'Buyurtmalar' }
  ];

  if (receiptOrder) {
    return <Receipt order={receiptOrder} onClose={() => setReceiptOrder(null)} />;
  }

  return (
    <Layout navItems={navItems}>
      <Box sx={{ width: '100%', py: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Buyurtmalar Ro'yxati
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleOpenCreate}
            sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
          >
            Yangi Buyurtma
          </Button>
        </Box>

        {/* Filters and Search Bar */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                placeholder="Mijoz, telefon yoki №..."
                value={searchQuery}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: <Search sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
                }}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  id="statusFilter"
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">Barchasi</MenuItem>
                  <MenuItem value="pending">Kutilmoqda</MenuItem>
                  <MenuItem value="completed">Yakunlangan</MenuItem>
                  <MenuItem value="cancelled">Bekor qilindi</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<FilterList />}
                onClick={() => setShowFilters(!showFilters)}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Kengaytirilgan
              </Button>
            </Grid>
          </Grid>

          {showFilters && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #e2e8f0' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Mijoz nomi"
                    value={filters.customer}
                    onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Telefon raqam"
                    value={filters.phone}
                    onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Buyurtma boshlanish"
                    InputLabelProps={{ shrink: true }}
                    value={filters.date_from}
                    onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Buyurtma tugash"
                    InputLabelProps={{ shrink: true }}
                    value={filters.date_to}
                    onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button
                    variant="text"
                    onClick={() => setFilters({ customer: '', phone: '', date_from: '', date_to: '' })}
                    sx={{ textTransform: 'none' }}
                  >
                    Tozalash
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleFilterSubmit}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Filtrlash
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>

        {/* Loading Spinner */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Orders Table */}
        {!loading && (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Buyurtma №</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mijoz</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Sana</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Yetkazish</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Jami summa</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Qoldiq</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Amallar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      Buyurtmalar topilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const today = new Date().toISOString().split('T')[0];
                    const isOverdue = order.status === 'pending' && order.delivery_date <= today;
                    const debt = order.total_amount - order.paid_amount;
                    
                    return (
                      <TableRow
                        key={order.id}
                        hover
                        sx={{
                          bgcolor: isOverdue ? 'rgba(239, 68, 68, 0.04)' : 'inherit',
                          '&:last-child cell': { border: 0 }
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {order.order_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {order.customer_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Phone sx={{ fontSize: 12 }} /> {order.customer_phone}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {new Date(order.order_date).toLocaleDateString('uz-UZ')}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {new Date(order.delivery_date).toLocaleDateString('uz-UZ')}
                            {isOverdue && (
                              <Chip size="small" label="Kechikkan" color="error" variant="soft" sx={{ fontSize: '10px', height: '18px' }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {order.total_amount?.toLocaleString()} so'm
                        </TableCell>
                        <TableCell align="right">
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: debt > 0 ? 'error.main' : 'success.main' }}>
                              {debt > 0 ? `${debt.toLocaleString()} so'm` : 'To\'landi'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              order.status === 'pending' ? 'Kutilmoqda' :
                              order.status === 'completed' ? 'Yakunlandi' : 'Bekor qilindi'
                            }
                            color={
                              order.status === 'pending' ? 'warning' :
                              order.status === 'completed' ? 'success' : 'default'
                            }
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Chekni ko'rish">
                            <IconButton color="primary" onClick={() => getOrderById(order.id).then(res => setReceiptOrder(res))}>
                              <Visibility sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Tahrirlash">
                            <IconButton color="info" onClick={() => handleOpenEdit(order)}>
                              <Edit sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="O'chirish">
                            <IconButton color="error" onClick={() => handleDelete(order.id)}>
                              <Delete sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Create Order Dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
          disableEnforceFocus={showProductSearch}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Yangi Buyurtma Yaratish</Typography>
            <IconButton onClick={() => setCreateDialogOpen(false)}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Box component="form" noValidate onSubmit={(e) => e.preventDefault()}>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 600 }}>Mijoz Ma'lumotlari</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    inputRef={firstNameRef}
                    required
                    fullWidth
                    label="Ism"
                    size="small"
                    placeholder="Mas: Ali"
                    value={formFields.first_name}
                    onChange={(e) => {
                      const formatted = formatPersonName(e.target.value);
                      setFormFields(prev => ({ ...prev, first_name: formatted }));
                      if (formErrors.first_name) setFormErrors(prev => ({ ...prev, first_name: '' }));
                    }}
                    onKeyDown={handleFirstNameKeyDown}
                    error={!!formErrors.first_name}
                    helperText={formErrors.first_name}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    inputRef={lastNameRef}
                    required
                    fullWidth
                    label="Familiya"
                    size="small"
                    placeholder="Mas: Valiyev"
                    value={formFields.last_name}
                    onChange={(e) => {
                      const formatted = formatPersonName(e.target.value);
                      setFormFields(prev => ({ ...prev, last_name: formatted }));
                      if (formErrors.last_name) setFormErrors(prev => ({ ...prev, last_name: '' }));
                    }}
                    onKeyDown={handleLastNameKeyDown}
                    error={!!formErrors.last_name}
                    helperText={formErrors.last_name}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <UzPhoneField
                    inputRef={phone1Ref}
                    required
                    fullWidth
                    label="1-Telefon raqam"
                    size="small"
                    value={formFields.customer_phone}
                    onChange={(formatted) => {
                      setFormFields(prev => ({ ...prev, customer_phone: formatted }));
                      if (formErrors.customer_phone) setFormErrors(prev => ({ ...prev, customer_phone: '' }));
                    }}
                    onKeyDown={handlePhone1KeyDown}
                    error={!!formErrors.customer_phone}
                    helperText={formErrors.customer_phone || "Mas: +998 90 123 45 67"}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <UzPhoneField
                    inputRef={phone2Ref}
                    fullWidth
                    label="2-Telefon raqam (Ixtiyoriy)"
                    size="small"
                    value={formFields.customer_phone2}
                    onChange={(formatted) => {
                      setFormFields(prev => ({ ...prev, customer_phone2: formatted }));
                      if (formErrors.customer_phone2) setFormErrors(prev => ({ ...prev, customer_phone2: '' }));
                    }}
                    onKeyDown={handlePhone2KeyDown}
                    error={!!formErrors.customer_phone2}
                    helperText={formErrors.customer_phone2}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <UzDateField
                    inputRef={deliveryDateRef}
                    required
                    fullWidth
                    label="Yetkazish kuni"
                    value={formFields.delivery_date}
                    onChange={(formatted) => {
                      setFormFields(prev => ({ ...prev, delivery_date: formatted }));
                      if (formErrors.delivery_date) setFormErrors(prev => ({ ...prev, delivery_date: '' }));
                    }}
                    onKeyDown={handleDeliveryDateKeyDown}
                    error={!!formErrors.delivery_date}
                    helperText={formErrors.delivery_date || "Format: kun/oy/yil (Mas: 13/09/2026)"}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    inputRef={addressRef}
                    fullWidth
                    label="Manzil"
                    size="small"
                    placeholder="Yetkazib berish manzili"
                    value={formFields.customer_address}
                    onChange={(e) => setFormFields({ ...formFields, customer_address: e.target.value })}
                    onKeyDown={handleAddressKeyDown}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 600 }}>Mahsulotlar</Typography>
              {formErrors.items && (
                <Alert severity="error" sx={{ mb: 2 }}>{formErrors.items}</Alert>
              )}

              {formItems.map((item, index) => (
                <Card key={index} variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <Button
                        type="button"
                        fullWidth
                        variant="outlined"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openProductSearch(index, false);
                        }}
                        startIcon={<Search />}
                        sx={{
                          height: 40,
                          justifyContent: 'flex-start',
                          textAlign: 'left',
                          px: 1.5,
                          borderColor: formErrors[`item_${index}_product`] ? '#d32f2f' : (item.product_name ? '#4caf50' : '#90caf9'),
                          bgcolor: item.product_name ? '#f0fdf4' : '#eff6ff',
                          color: item.product_name ? '#15803d' : '#1d4ed8',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          textTransform: 'none',
                          borderRadius: 2,
                          '&:hover': {
                            bgcolor: item.product_name ? '#dcfce7' : '#dbeafe',
                            borderColor: item.product_name ? '#2e7d32' : '#1976d2'
                          }
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: 600,
                            flex: 1
                          }}
                        >
                          {item.product_name ? `${item.product_name} (${(item.price || 0).toLocaleString()} so'm)` : 'Mahsulot tanlash'}
                        </Typography>
                      </Button>
                      {formErrors[`item_${index}_product`] && (
                        <FormHelperText error sx={{ ml: 1, mt: 0.5 }}>
                          {formErrors[`item_${index}_product`]}
                        </FormHelperText>
                      )}
                    </Grid>

                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="O'lcham (Razmer)"
                        placeholder="1.2x3.3"
                        value={item.razmer || ''}
                        onChange={(e) => handleFormItemChange(index, 'razmer', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Kvadrat (Kv.m)"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleFormItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </Grid>

                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Skidka (so'm)"
                        type="number"
                        placeholder="0"
                        value={item.discount_amount !== undefined && item.discount_amount !== null ? item.discount_amount : ''}
                        onChange={(e) => handleFormItemChange(index, 'discount_amount', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={6} sm={2} align="right">
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {calculateItemSum(item).toLocaleString()} so'm
                      </Typography>
                    </Grid>

                    <Grid item xs={10} sm={10}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Izoh"
                        placeholder="Ushbu mahsulot haqida izoh..."
                        value={item.note || ''}
                        onChange={(e) => handleFormItemChange(index, 'note', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={2} sm={2} align="right">
                      <IconButton color="error" onClick={() => handleRemoveItem(index)}>
                        <Delete />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Card>
              ))}

              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => handleAddItem(false)}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Mahsulot qo'shish
              </Button>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 600 }}>To'lov va Izoh</Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="To'lov summasi (so'm)"
                    type="number"
                    size="small"
                    placeholder="0"
                    InputLabelProps={{ shrink: true }}
                    value={formFields.paid_amount !== undefined && formFields.paid_amount !== null ? formFields.paid_amount : ''}
                    onChange={(e) => setFormFields({ ...formFields, paid_amount: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1">
                    Jami summa: <strong>{calculateTotal(formItems).toLocaleString()} so'm</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Qoldiq: <strong>{Math.max(0, calculateTotal(formItems) - (parseFloat(formFields.paid_amount) || 0)).toLocaleString()} so'm</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Buyurtma uchun umumiy izoh"
                    placeholder="Izoh..."
                    value={formFields.note}
                    onChange={(e) => setFormFields({ ...formFields, note: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCreateDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
              Bekor qilish
            </Button>
            <Button onClick={handleCreateSubmit} variant="contained" color="primary" sx={{ textTransform: 'none', px: 3 }}>
              Buyurtmani saqlash
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Order Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maxWidth="md"
          fullWidth
          disableEnforceFocus={showProductSearch}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Buyurtmani Tahrirlash {editOrderData && `#${editOrderData.order_number}`}
            </Typography>
            <IconButton onClick={() => setEditDialogOpen(false)}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {editOrderData && (
              <Box component="form" noValidate>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 600 }}>Mijoz Ma'lumotlari</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      label="Ism"
                      size="small"
                      placeholder="Mas: Ali"
                      value={formFields.first_name}
                      onChange={(e) => {
                        const formatted = formatPersonName(e.target.value);
                        setFormFields(prev => ({ ...prev, first_name: formatted }));
                        if (formErrors.first_name) setFormErrors(prev => ({ ...prev, first_name: '' }));
                      }}
                      onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                      error={!!formErrors.first_name}
                      helperText={formErrors.first_name}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      label="Familiya"
                      size="small"
                      placeholder="Mas: Valiyev"
                      value={formFields.last_name}
                      onChange={(e) => {
                        const formatted = formatPersonName(e.target.value);
                        setFormFields(prev => ({ ...prev, last_name: formatted }));
                        if (formErrors.last_name) setFormErrors(prev => ({ ...prev, last_name: '' }));
                      }}
                      onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                      error={!!formErrors.last_name}
                      helperText={formErrors.last_name}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <UzPhoneField
                      required
                      fullWidth
                      label="1-Telefon raqam"
                      size="small"
                      value={formFields.customer_phone}
                      onChange={(formatted) => {
                        setFormFields(prev => ({ ...prev, customer_phone: formatted }));
                        if (formErrors.customer_phone) setFormErrors(prev => ({ ...prev, customer_phone: '' }));
                      }}
                      error={!!formErrors.customer_phone}
                      helperText={formErrors.customer_phone || "Mas: +998 90 123 45 67"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <UzPhoneField
                      fullWidth
                      label="2-Telefon raqam (Ixtiyoriy)"
                      size="small"
                      value={formFields.customer_phone2}
                      onChange={(formatted) => {
                        setFormFields(prev => ({ ...prev, customer_phone2: formatted }));
                        if (formErrors.customer_phone2) setFormErrors(prev => ({ ...prev, customer_phone2: '' }));
                      }}
                      error={!!formErrors.customer_phone2}
                      helperText={formErrors.customer_phone2}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <UzDateField
                      required
                      fullWidth
                      label="Yetkazish kuni"
                      value={formFields.delivery_date}
                      onChange={(formatted) => {
                        setFormFields(prev => ({ ...prev, delivery_date: formatted }));
                        if (formErrors.delivery_date) setFormErrors(prev => ({ ...prev, delivery_date: '' }));
                      }}
                      error={!!formErrors.delivery_date}
                      helperText={formErrors.delivery_date || "Format: kun/oy/yil (Mas: 13/09/2026)"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Manzil"
                      size="small"
                      placeholder="Yetkazib berish manzili"
                      value={formFields.customer_address}
                      onChange={(e) => setFormFields({ ...formFields, customer_address: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={formFields.status}
                        label="Status"
                        onChange={(e) => setFormFields({ ...formFields, status: e.target.value })}
                      >
                        <option value="pending">Kutilmoqda</option>
                        <option value="completed">Yakunlangan</option>
                        <option value="cancelled">Bekor qilindi</option>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 600 }}>Mahsulotlar</Typography>
                {editOrderData.items.map((item, index) => (
                  <Card key={index} variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <Button
                          type="button"
                          fullWidth
                          variant="outlined"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openProductSearch(index, true);
                          }}
                          startIcon={<Search />}
                          sx={{
                            height: 40,
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            px: 1.5,
                            borderColor: item.product_name ? '#4caf50' : '#90caf9',
                            bgcolor: item.product_name ? '#f0fdf4' : '#eff6ff',
                            color: item.product_name ? '#15803d' : '#1d4ed8',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            textTransform: 'none',
                            borderRadius: 2,
                            '&:hover': {
                              bgcolor: item.product_name ? '#dcfce7' : '#dbeafe',
                              borderColor: item.product_name ? '#2e7d32' : '#1976d2'
                            }
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: 600,
                              flex: 1
                            }}
                          >
                            {item.product_name ? `${item.product_name} (${(item.price || 0).toLocaleString()} so'm)` : 'Mahsulot tanlash'}
                          </Typography>
                        </Button>
                      </Grid>

                      <Grid item xs={6} sm={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="O'lcham"
                          placeholder="1.2x3.3"
                          value={item.razmer || ''}
                          onChange={(e) => handleFormItemChange(index, 'razmer', e.target.value, true)}
                        />
                      </Grid>

                      <Grid item xs={6} sm={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Kv.m"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleFormItemChange(index, 'quantity', parseFloat(e.target.value) || 0, true)}
                        />
                      </Grid>

                      <Grid item xs={6} sm={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Skidka"
                          type="number"
                          placeholder="0"
                          InputLabelProps={{ shrink: true }}
                          value={item.discount_amount !== undefined && item.discount_amount !== null ? item.discount_amount : ''}
                          onChange={(e) => handleFormItemChange(index, 'discount_amount', e.target.value, true)}
                        />
                      </Grid>

                      <Grid item xs={6} sm={2} align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {calculateItemSum(item).toLocaleString()} so'm
                        </Typography>
                      </Grid>

                      <Grid item xs={10} sm={10}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Izoh"
                          value={item.note || ''}
                          onChange={(e) => handleFormItemChange(index, 'note', e.target.value, true)}
                        />
                      </Grid>

                      <Grid item xs={2} sm={2} align="right">
                        <IconButton color="error" onClick={() => handleRemoveItem(index, true)}>
                          <Delete />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Card>
                ))}

                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => handleAddItem(true)}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Mahsulot qo'shish
                </Button>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 600 }}>To'lov va Izoh</Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="To'lov summasi (so'm)"
                      type="number"
                      size="small"
                      placeholder="0"
                      InputLabelProps={{ shrink: true }}
                      value={formFields.paid_amount !== undefined && formFields.paid_amount !== null ? formFields.paid_amount : ''}
                      onChange={(e) => setFormFields({ ...formFields, paid_amount: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      Jami summa: <strong>{calculateTotal(editOrderData.items).toLocaleString()} so'm</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Qoldiq: <strong>{Math.max(0, calculateTotal(editOrderData.items) - (parseFloat(formFields.paid_amount) || 0)).toLocaleString()} so'm</strong>
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Umumiy izoh"
                      value={formFields.note}
                      onChange={(e) => setFormFields({ ...formFields, note: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setEditDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
              Bekor qilish
            </Button>
            <Button onClick={handleEditSubmit} variant="contained" color="primary" sx={{ textTransform: 'none', px: 3 }}>
              Saqlash
            </Button>
          </DialogActions>
        </Dialog>

        {/* Due Date Delivery Dialog */}
        {deliveryConfirmOrder && (
          <Dialog open={!!deliveryConfirmOrder} onClose={() => setDeliveryConfirmOrder(null)}>
            <DialogTitle sx={{ fontWeight: 700 }}>Yetkazish Kuni Keldi!</DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Buyurtma: <strong>№{deliveryConfirmOrder.order_number}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Mijoz: {deliveryConfirmOrder.customer_name}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Sana: {new Date(deliveryConfirmOrder.delivery_date).toLocaleDateString('uz-UZ')}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Mahsulot to'liq yetkazib berildimi?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => handleDeliveryConfirm(false)} color="warning" sx={{ textTransform: 'none' }}>
                Yo'q, sanani o'zgartirish
              </Button>
              <Button onClick={() => handleDeliveryConfirm(true)} variant="contained" color="success" sx={{ textTransform: 'none' }}>
                Ha, yetkazildi
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Snackbar Notification Toast */}
        <Snackbar
          open={toast.open}
          autoHideDuration={4000}
          onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setToast({ ...toast, open: false })}
            severity={toast.severity}
            sx={{ width: '100%', borderRadius: 2 }}
          >
            {toast.message}
          </Alert>
        </Snackbar>

        {/* Product Search Modal */}
        {showProductSearch && (
          <ProductSearchModal
            products={products}
            onSelect={handleProductSelect}
            onClose={() => {
              setShowProductSearch(false);
              setSearchTargetIndex(null);
            }}
          />
        )}
      </Box>
    </Layout>
  );
}