import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { getUsers, createUser, updateUser, deleteUser, getBranches } from '../../services/api';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  People as PeopleIcon
} from '@mui/icons-material';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'seller',
    branch_id: ''
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, branchesData] = await Promise.all([
        getUsers(),
        getBranches()
      ]);
      setUsers(usersData || []);
      setBranches(branchesData || []);
    } catch (err) {
      showToast('Ma\'lumotlarni yuklashda xato: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response || []);
    } catch (err) {
      showToast('Foydalanuvchilarni yuklashda xato: ' + err.message, 'error');
    }
  };

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleToastClose = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  const openCreateForm = () => {
    setEditId(null);
    setFormData({ name: '', email: '', password: '', role: 'seller', branch_id: '' });
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setEditId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      branch_id: user.branch_id || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || (!editId && !formData.password)) {
      showToast('Iltimos, barcha maydonlarni to\'g\'ri to\'ldiring', 'error');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        branch_id: formData.branch_id ? parseInt(formData.branch_id) : null
      };
      
      if (editId) {
        await updateUser(editId, payload);
        showToast('Foydalanuvchi muvaffaqiyatli tahrirlandi!', 'success');
      } else {
        await createUser(payload);
        showToast('Foydalanuvchi muvaffaqiyatli qo\'shildi!', 'success');
      }
      setShowForm(false);
      setEditId(null);
      setFormData({ name: '', email: '', password: '', role: 'seller', branch_id: '' });
      await fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu foydalanuvchini o\'chirishni xohlaysizmi?')) return;
    try {
      setLoading(true);
      await deleteUser(id);
      showToast('Foydalanuvchi o\'chirildi!', 'success');
      await fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
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
            <PeopleIcon /> Foydalanuvchilarni Boshqarish
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={openCreateForm}
            sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
          >
            Yangi Foydalanuvchi
          </Button>
        </Box>

        {/* Loading Spinner / Table */}
        {loading && users.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Ismi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Rol</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Filial</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Qo'shilgan sana</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Amallar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      Foydalanuvchilar topilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} hover sx={{ '&:last-child cell': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 600 }}>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={u.role === 'admin' ? 'Admin' : 'Sotuvchi'}
                          color={u.role === 'admin' ? 'secondary' : 'default'}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>{u.branch_name || '-'}</TableCell>
                      <TableCell>{new Date(u.created_at).toLocaleDateString('uz-UZ')}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Tahrirlash">
                          <IconButton size="small" color="info" onClick={() => openEditForm(u)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="O'chirish">
                          <IconButton size="small" color="error" onClick={() => handleDelete(u.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Create/Edit User Dialog */}
        <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="700">
              {editId ? 'Foydalanuvchini Tahrirlash' : 'Yangi Foydalanuvchi Qo\'shish'}
            </Typography>
            <IconButton onClick={() => setShowForm(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                required
                fullWidth
                label="Foydalanuvchi ismi"
                size="small"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <TextField
                required
                fullWidth
                type="email"
                label="Email manzili"
                size="small"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <TextField
                required={!editId}
                fullWidth
                type="password"
                label={editId ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
                placeholder={editId ? 'Parolni o\'zgartirish uchun kiriting' : 'Kamida 6 belgi'}
                size="small"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <FormControl fullWidth size="small">
                <InputLabel id="role-select-label">Rol</InputLabel>
                <Select
                  labelId="role-select-label"
                  value={formData.role}
                  label="Rol"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <MenuItem value="seller">Sotuvchi (Seller)</MenuItem>
                  <MenuItem value="admin">Admin (Administrator)</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel id="branch-select-label">Filial (ixtiyoriy)</InputLabel>
                <Select
                  labelId="branch-select-label"
                  value={formData.branch_id}
                  label="Filial (ixtiyoriy)"
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                >
                  <MenuItem value=""><em>Hech qaysi</em></MenuItem>
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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