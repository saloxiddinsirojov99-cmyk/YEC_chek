import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { getStatistics } from '../../services/api';
import AnimatedCounter from '../../components/AnimatedCounter';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Avatar,
  Chip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as AttachMoneyIcon,
  AccessTime as AccessTimeIcon,
  EmojiEvents as AwardIcon,
  Business as BusinessIcon
} from '@mui/icons-material';

export default function Statistics() {
  const [stats, setStats] = useState({
    dailyOrders: 0,
    weeklyOrders: 0,
    monthlyOrders: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    topProducts: [],
    topBranches: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const data = await getStatistics();
      setStats({
        dailyOrders: data?.counts?.daily || 0,
        weeklyOrders: data?.counts?.weekly || 0,
        monthlyOrders: data?.counts?.monthly || 0,
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
      setError('Statistikani yuklashda xato: ' + err.message);
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

  if (loading) {
    return (
      <Layout navItems={navItems}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={50} sx={{ color: '#2563eb', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Statistika yuklanmoqda...</Typography>
        </Box>
      </Layout>
    );
  }

  const orderStats = [
    { label: 'Bugungi buyurtmalar', value: stats.dailyOrders, suffix: ' ta', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.05)' },
    { label: 'Ushbu haftalik buyurtmalar', value: stats.weeklyOrders, suffix: ' ta', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.05)' },
    { label: 'Ushbu oylik buyurtmalar', value: stats.monthlyOrders, suffix: ' ta', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.05)' },
  ];

  const financialStats = [
    { label: 'Jami daromad', value: stats.totalRevenue, suffix: " so'm", color: '#10b981', bg: 'rgba(16, 185, 129, 0.05)', icon: <TrendingUpIcon /> },
    { label: 'To\'lanmagan qoldiq', value: stats.pendingAmount, suffix: " so'm", color: '#ef4444', bg: 'rgba(239, 68, 68, 0.05)', icon: <AccessTimeIcon /> },
  ];

  return (
    <Layout navItems={navItems}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h4" component="h1" fontWeight="800" color="#1e293b" sx={{ mb: 4 }}>
          Statistika va Hisobotlar
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Order Statistics */}
        <Typography variant="h6" fontWeight="700" color="#0f172a" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon color="primary" /> Buyurtmalar statistikasi
        </Typography>
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {orderStats.map((item, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3 }}>
                <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: item.bg, color: item.color }}>
                    <CalendarIcon />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" fontWeight="500">
                      {item.label}
                    </Typography>
                    <Typography variant="h5" component="p" fontWeight="700" color="#0f172a">
                      <AnimatedCounter value={item.value} suffix={item.suffix} />
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Financial Statistics */}
        <Typography variant="h6" fontWeight="700" color="#0f172a" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AttachMoneyIcon color="primary" /> Daromad statistikasi
        </Typography>
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {financialStats.map((item, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3 }}>
                <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: item.bg, color: item.color }}>
                    {item.icon}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" fontWeight="500">
                      {item.label}
                    </Typography>
                    <Typography variant="h5" component="p" fontWeight="700" color="#0f172a">
                      <AnimatedCounter value={item.value} suffix={item.suffix} />
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Top Products & Branches */}
        <Grid container spacing={3}>
          {stats.topProducts && stats.topProducts.length > 0 && (
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" fontWeight="700" color="#0f172a" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AwardIcon color="primary" /> Eng ko'p sotilgan mahsulotlar
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>O'rin</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Mahsulot</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Miqdori</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Daromad</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.topProducts.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem', bgcolor: idx < 3 ? 'primary.main' : 'grey.400' }}>
                              {idx + 1}
                            </Avatar>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                          <TableCell align="right">{p.quantity} m²</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {p.revenue.toLocaleString()} so'm
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          )}

          {stats.topBranches && stats.topBranches.length > 0 && (
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" fontWeight="700" color="#0f172a" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon color="secondary" /> Filiallar bo'yicha savdo
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Filial nomi</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Buyurtmalar soni</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Jami savdo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.topBranches.map((b, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontWeight: 600 }}>{b.name}</TableCell>
                          <TableCell align="right">{b.orders} ta</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                            {b.revenue.toLocaleString()} so'm
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    </Layout>
  );
}