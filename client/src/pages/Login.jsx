import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Login as LoginIcon
} from '@mui/icons-material';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Simple form validation state
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const isEmailValid = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const emailError = emailTouched && !email;
  const emailInvalid = emailTouched && email && !isEmailValid(email);
  const passwordError = passwordTouched && !password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!email || !password || !isEmailValid(email)) {
      setError('Iltimos, barcha maydonlarni to\'g\'ri to\'ldiring.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user?.role === 'seller') {
        navigate('/seller/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err?.message || 'Login yoki parol noto\'g\'ri.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        position: 'relative',
        overflow: 'hidden',
        px: 2,
      }}
    >
      {/* Decorative blurred neon circles */}
      <Box
        sx={{
          position: 'absolute',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'rgba(37, 99, 235, 0.15)',
          filter: 'blur(90px)',
          top: '10%',
          left: '15%',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.15)',
          filter: 'blur(80px)',
          bottom: '10%',
          right: '15%',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Logo container */}
          <Box
            component="img"
            src="/logo.png"
            alt="YEC Gilam Logo"
            onError={(e) => {
              // Fallback if logo doesn't exist yet
              e.target.style.display = 'none';
            }}
            sx={{
              width: 80,
              height: 80,
              mb: 2,
              filter: 'drop-shadow(0 2px 8px rgba(37, 99, 235, 0.4))',
            }}
          />

          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.5px',
              mb: 0.5,
              textAlign: 'center',
            }}
          >
            YEC Gilam
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              mb: 3,
              textAlign: 'center',
            }}
          >
            Buyurtma Boshqaruv Tizimi
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                width: '100%',
                mb: 3,
                borderRadius: 2,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                '& .MuiAlert-icon': {
                  color: '#f87171',
                },
              }}
            >
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ width: '100%' }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Manzil"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              error={emailError || emailInvalid}
              helperText={
                emailError
                  ? 'Email kiritilishi shart'
                  : emailInvalid
                  ? 'Noto\'g\'ri email formati'
                  : ''
              }
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& label': { color: 'rgba(255, 255, 255, 0.5)' },
                '& label.Mui-focused': { color: '#3b82f6' },
                '& .MuiInputBase-input': { color: '#fff' },
                '& .MuiFormHelperText-root': { color: '#f87171' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  '&.Mui-error fieldset': { borderColor: '#ef4444' },
                },
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Parol"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              error={passwordError}
              helperText={passwordError ? 'Parol kiritilishi shart' : ''}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: 'rgba(255, 255, 255, 0.4)' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                '& label': { color: 'rgba(255, 255, 255, 0.5)' },
                '& label.Mui-focused': { color: '#3b82f6' },
                '& .MuiInputBase-input': { color: '#fff' },
                '& .MuiFormHelperText-root': { color: '#f87171' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  '&.Mui-error fieldset': { borderColor: '#ef4444' },
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 2,
                mb: 2,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #1d4ed8 0%, #1e40af 100%)',
                  boxShadow: '0 6px 20px 0 rgba(37, 99, 235, 0.5)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#fff' }} />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LoginIcon sx={{ fontSize: 18 }} />
                  <span>Kirish</span>
                </Box>
              )}
            </Button>

          </Box>
        </Paper>
      </Container>
    </Box>
  );
}