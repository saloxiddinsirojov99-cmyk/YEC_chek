require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const prisma = require('../lib/prisma');

const authRoutes = require('../routes/auth');
const branchRoutes = require('../routes/branches');
const userRoutes = require('../routes/users');
const productRoutes = require('../routes/products');
const orderRoutes = require('../routes/orders');
const statsRoutes = require('../routes/stats');
const setupRoutes = require('../routes/setup');

const app = express();

// ============================================================
// CORS Configuration - Must allow frontend domains & preflight
// ============================================================
const allowedOrigins = [
  (process.env.FRONTEND_URL || 'https://yec-sallers.vercel.app').replace(/\/$/, ''),
  'https://yec-chek.vercel.app',
  'https://yec-saller-front.vercel.app',
  'https://yec-sallers.vercel.app',
];

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173');
  allowedOrigins.push('http://localhost:3000');
  allowedOrigins.push('http://localhost:5000');
}

// Also allow additional comma-separated origins from env
if (process.env.EXTRA_ORIGINS) {
  process.env.EXTRA_ORIGINS.split(',').forEach(o => {
    const trimmed = o.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    // Check whitelist
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    // Allow ALL Vercel deployments (previews, production, etc.)
    if (normalizedOrigin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // Allow localhost and 127.0.0.1 with any port in dev/local
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) {
      return callback(null, true);
    }
    
    // Deny CORS - but do NOT throw error, just return false
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours cache for preflight
}));

// Explicitly handle OPTIONS preflight for all routes
app.options('*', cors());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (non-sensitive)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  }
  next();
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/setup', setupRoutes);

// Health check endpoint with DB connectivity test
app.get('/api/health', async (req, res) => {
  const hasDB = !!process.env.DATABASE_URL;
  let dbStatus = 'not_configured';
  let dbError = null;

  if (hasDB) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (err) {
      dbStatus = 'error';
      dbError = err.message;
    }
  }

  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    environment: process.env.VERCEL === '1' ? 'vercel' : 'local',
    database: hasDB ? 'postgresql' : 'not_configured',
    dbStatus,
    dbError,
    hasJwtSecret: !!process.env.JWT_SECRET,
    uptime: process.uptime()
  });
});

// Temporary debug endpoint - shows DB user count & emails (no passwords)
app.get('/api/debug', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true }
    });
    res.json({
      success: true,
      userCount,
      productCount,
      users,
      dbUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 40) + '...' : 'NOT_SET'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'So\'ralgan resurs topilmadi.' 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Express global error:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      success: false,
      error: 'CORS: Domain ruxsat etilmagan.' 
    });
  }
  
  res.status(500).json({ 
    success: false,
    error: 'Ichki server xatoligi yuz berdi.' 
  });
});

// Vercel serverless export
module.exports = app;
