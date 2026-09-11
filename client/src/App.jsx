import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SellerDashboard from './pages/seller/Dashboard';
import CreateOrder from './pages/seller/CreateOrder';
import OrderList from './pages/seller/OrderList';
import AdminDashboard from './pages/admin/Dashboard';
import ProductManagement from './pages/admin/ProductManagement';
import BranchManagement from './pages/admin/BranchManagement';
import UserManagement from './pages/admin/UserManagement';
import Statistics from './pages/admin/Statistics';
import AdminOrderManagement from './pages/admin/OrderManagement';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import './App.css';

// Create a modern theme with Inter font family
const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb', // blue
    },
    secondary: {
      main: '#10b981', // green
    },
    background: {
      default: '#f3f4f6',
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
          
          {/* Sotuvchi Routes */}
          <Route
            path="/seller/dashboard"
            element={<ProtectedRoute allowedRoles={['seller']} component={<SellerDashboard />} />}
          />
          <Route
            path="/seller/create-order"
            element={<ProtectedRoute allowedRoles={['seller']} component={<CreateOrder />} />}
          />
          <Route
            path="/seller/orders"
            element={<ProtectedRoute allowedRoles={['seller']} component={<OrderList />} />}
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={<ProtectedRoute allowedRoles={['admin']} component={<AdminDashboard />} />}
          />
          <Route
            path="/admin/products"
            element={<ProtectedRoute allowedRoles={['admin']} component={<ProductManagement />} />}
          />
          <Route
            path="/admin/branches"
            element={<ProtectedRoute allowedRoles={['admin']} component={<BranchManagement />} />}
          />
          <Route
            path="/admin/users"
            element={<ProtectedRoute allowedRoles={['admin']} component={<UserManagement />} />}
          />
          <Route
            path="/admin/orders"
            element={<ProtectedRoute allowedRoles={['admin']} component={<AdminOrderManagement />} />}
          />
          <Route
            path="/admin/statistics"
            element={<ProtectedRoute allowedRoles={['admin']} component={<Statistics />} />}
          />

          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </Router>
    </ThemeProvider>
  );
}

export default App;
