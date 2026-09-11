import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
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
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  ShoppingBag as ShoppingBagIcon,
  AttachMoney as AttachMoneyIcon,
  AccessTime as AccessTimeIcon,
  ListAlt as ListAltIcon
} from '@mui/icons-material';

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayOrders: 0,
    totalAmount: 0,
    pendingAmount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStatistics();
        setStats({
          todayOrders: data?.today?.orders_count || 0,
          totalAmount: data?.today?.sales_amount || 0,
          pendingAmount: data?.today?.debt_amount || 0
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const navItems = [
    { path: '/seller/dashboard', label: 'Dashboard' },
    { path: '/seller/orders', label: 'Buyurtmalar' }
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
      title: 'Bugungi buyurtmalar',
      value: stats.todayOrders,
      suffix: ' ta',
      icon: <ShoppingBagIcon sx={{ fontSize: 32, color: '#2563eb' }} />,
      bg: 'rgba(37, 99, 235, 0.05)',
      border: 'rgba(37, 99, 235, 0.1)'
    },
    {
      title: 'Bugungi savdo summa',
      value: stats.totalAmount,
      suffix: " so'm",
      icon: <AttachMoneyIcon sx={{ fontSize: 32, color: '#10b981' }} />,
      bg: 'rgba(16, 185, 129, 0.05)',
      border: 'rgba(16, 185, 129, 0.1)'
    },
    {
      title: 'Bugungi to\'lanmagan qoldiq',
      value: stats.pendingAmount,
      suffix: " so'm",
      icon: <AccessTimeIcon sx={{ fontSize: 32, color: '#f59e0b' }} />,
      bg: 'rgba(245, 158, 11, 0.05)',
      border: 'rgba(245, 158, 11, 0.1)'
    }
  ];

  return (
    <Layout navItems={navItems}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h4" component="h1" fontWeight="800" color="#1e293b" sx={{ mb: 0.5 }}>
          Sotuvchi Paneli
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Xush kelibsiz, {user?.name}
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

        {/* Quick Actions */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            border: '1px solid #e2e8f0',
            bgcolor: '#fff'
          }}
        >
          <Typography variant="h6" fontWeight="700" color="#0f172a" sx={{ mb: 3 }}>
            Tezkor amallar
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<AddIcon />}
                onClick={() => navigate('/seller/orders', { state: { openCreate: true } })}
                sx={{
                  py: 2,
                  borderRadius: 3,
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(37, 99, 235, 0.35)',
                  }
                }}
              >
                Yangi buyurtma yaratish
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<ListAltIcon />}
                onClick={() => navigate('/seller/orders')}
                sx={{
                  py: 2,
                  borderRadius: 3,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderWidth: 1.5,
                  borderColor: '#e2e8f0',
                  color: '#475569',
                  '&:hover': {
                    borderWidth: 1.5,
                    borderColor: '#cbd5e1',
                    bgcolor: '#f8fafc'
                  }
                }}
              >
                Buyurtmalarni ko'rish
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Layout>
  );
}