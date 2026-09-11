import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getStatistics } from '../../services/api';
import AnimatedCounter from '../../components/AnimatedCounter';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  BarChart as BarChartIcon,
  ListAlt as ListAltIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    topProducts: [],
    topBranches: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStatistics();
        setStats({
          totalOrders: data?.counts?.monthly || 0,
          totalRevenue: data?.total_sales || 0,
          pendingAmount: data?.unpaid_orders?.reduce((sum, o) => sum + (o.debt_amount || 0), 0) || 0,
          topProducts: data?.top_products?.map(p => ({
            name: p.product_name,
            quantity: p.total_qty,
            revenue: p.revenue
          })) || [],
          topBranches: data?.branch_sales?.map(b => ({
            name: b.branch_name,
            orders: b.order_count,
            revenue: b.sales_sum
          })) || []
        });
      } catch (err) {
        console.error('Error fetching statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const navItems = [
    { path: '/admin/dashboard', label: 'Asosiy' },
    { path: '/admin/products', label: 'Mahsulotlar' },
    { path: '/admin/branches', label: 'Filiallar' },
    { path: '/admin/users', label: 'Foydalanuvchilar' },
    { path: '/admin/orders', label: 'Buyurtmalar' },
    { path: '/admin/statistics', label: 'Statistika' }
  ];

  const menuItems = [
    { title: 'Mahsulotlar boshqaruvi', path: '/admin/products', icon: <InventoryIcon sx={{ fontSize: 32, color: '#3b82f6' }} /> },
    { title: 'Filiallar boshqaruvi', path: '/admin/branches', icon: <BusinessIcon sx={{ fontSize: 32, color: '#10b981' }} /> },
    { title: 'Buyurtmalar boshqaruvi', path: '/admin/orders', icon: <ListAltIcon sx={{ fontSize: 32, color: '#f59e0b' }} /> },
    { title: 'Foydalanuvchilar boshqaruvi', path: '/admin/users', icon: <PeopleIcon sx={{ fontSize: 32, color: '#8b5cf6' }} /> },
    { title: 'Hisobotlar va Statistika', path: '/admin/statistics', icon: <BarChartIcon sx={{ fontSize: 32, color: '#ec4899' }} /> },
  ];

  if (loading) {
    return (
      <Layout navItems={navItems}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={50} sx={{ color: '#2563eb', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Ma'lumotlar yuklanmoqda...</Typography>
        </Box>
      </Layout>
    );
  }

  const statCards = [
    {
      title: 'Jami buyurtmalar',
      value: stats.totalOrders,
      suffix: ' ta',
      icon: <InventoryIcon sx={{ fontSize: 30, color: '#2563eb' }} />,
      bg: 'rgba(37, 99, 235, 0.05)',
      border: 'rgba(37, 99, 235, 0.1)'
    },
    {
      title: 'Jami tushum',
      value: stats.totalRevenue,
      suffix: " so'm",
      icon: <AttachMoneyIcon sx={{ fontSize: 30, color: '#10b981' }} />,
      bg: 'rgba(16, 185, 129, 0.05)',
      border: 'rgba(16, 185, 129, 0.1)'
    },
    {
      title: 'To\'lanmagan qoldiq',
      value: stats.pendingAmount,
      suffix: " so'm",
      icon: <AccessTimeIcon sx={{ fontSize: 30, color: '#f59e0b' }} />,
      bg: 'rgba(245, 158, 11, 0.05)',
      border: 'rgba(245, 158, 11, 0.1)'
    }
  ];

  return (
    <Layout navItems={navItems}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h4" component="h1" fontWeight="800" color="#1e293b" sx={{ mb: 4 }}>
          Admin Paneli
        </Typography>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {statCards.map((card, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                elevation={0}
                sx={{
                  border: `1px solid ${card.border}`,
                  bgcolor: '#fff',
                  borderRadius: 4,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 20px -10px rgba(0, 0, 0, 0.08)'
                  }
                }}
              >
                <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: card.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" fontWeight="500">
                      {card.title}
                    </Typography>
                    <Typography variant="h5" component="p" fontWeight="700" color="#0f172a" sx={{ mt: 0.5 }}>
                      <AnimatedCounter value={card.value} suffix={card.suffix} />
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Menu Grid / Actions */}
        <Typography variant="h6" fontWeight="700" color="#0f172a" sx={{ mb: 2.5 }}>
          Tizim boshqaruvi
        </Typography>
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {menuItems.map((item, index) => (
            <Grid item xs={12} sm={6} md={2.4} key={index}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate(item.path)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  p: 3,
                  borderRadius: 4,
                  borderColor: '#e2e8f0',
                  color: '#475569',
                  height: '100%',
                  textTransform: 'none',
                  borderWidth: 1.5,
                  '&:hover': {
                    borderWidth: 1.5,
                    borderColor: '#cbd5e1',
                    bgcolor: '#fff',
                    transform: 'scale(1.02)'
                  },
                  transition: 'all 0.2s'
                }}
              >
                {item.icon}
                <Typography variant="body2" fontWeight="600" align="center">
                  {item.title}
                </Typography>
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* Detailed Insights */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle1" fontWeight="700" color="#0f172a" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon color="primary" /> Top Mahsulotlar (Sotuv soni bo'yicha)
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List disablePadding>
                {stats.topProducts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>Ma'lumotlar mavjud emas</Typography>
                ) : (
                  stats.topProducts.map((p, idx) => (
                    <ListItem key={idx} sx={{ px: 0, py: 1.5, justifyContent: 'space-between' }}>
                      <ListItemText primary={p.name} secondary={`${p.quantity} m² sotilgan`} />
                      <Typography variant="body2" fontWeight="600" color="primary.main">
                        {p.revenue.toLocaleString()} so'm
                      </Typography>
                    </ListItem>
                  ))
                )}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle1" fontWeight="700" color="#0f172a" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon color="secondary" /> Filiallar Savdosi
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List disablePadding>
                {stats.topBranches.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>Ma'lumotlar mavjud emas</Typography>
                ) : (
                  stats.topBranches.map((b, idx) => (
                    <ListItem key={idx} sx={{ px: 0, py: 1.5, justifyContent: 'space-between' }}>
                      <ListItemText primary={b.name} secondary={`${b.orders} ta buyurtma`} />
                      <Typography variant="body2" fontWeight="600" color="secondary.main">
                        {b.revenue.toLocaleString()} so'm
                      </Typography>
                    </ListItem>
                  ))
                )}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}