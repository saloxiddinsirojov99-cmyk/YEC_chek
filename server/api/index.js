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
// CORS Configuration - same-origin architecture for yec-chek
// ============================================================
const allowedOrigins = [
  'https://yec-chek.vercel.app',
  'https://yec-sallers.vercel.app',
  'https://yec-saller-front.vercel.app',
];

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173');
  allowedOrigins.push('http://localhost:3000');
  allowedOrigins.push('http://localhost:5000');
}

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
    // Same-origin, server-to-server, curl
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    // Check allowed origins list
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    // Allow Vercel preview deployments
    if (normalizedOrigin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // Allow localhost/127.0.0.1 in non-production
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) {
      return callback(null, true);
    }
    
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
}));

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

// Health check handler - safe status without leaking secrets
const healthHandler = async (req, res) => {
  const hasDB = !!process.env.DATABASE_URL;
  let dbStatus = 'not_configured';

  if (hasDB) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (err) {
      dbStatus = 'error';
      console.error('[HEALTH] Database connection error:', err.message);
    }
  }

  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    environment: process.env.VERCEL === '1' ? 'vercel' : 'local',
    database: hasDB ? 'postgresql' : 'not_configured',
    dbStatus,
    hasJwtSecret: !!process.env.JWT_SECRET,
    uptime: process.uptime()
  });
};

// Create API Router supporting both /api/route and direct /route
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/branches', branchRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/stats', statsRoutes);
apiRouter.use('/setup', setupRoutes);
apiRouter.get('/health', healthHandler);

// Mount API router on both /api and / so all rewrites work cleanly
app.use('/api', apiRouter);
app.use('/', apiRouter);

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
    error: 'Ichki server xatoligi yuz berdi.',
    debugMessage: err.message,
    debugName: err.name,
    debugStack: err.stack ? err.stack.split('\n').slice(0, 5).join('\n') : null
  });
});

// Vercel serverless export
module.exports = app;
