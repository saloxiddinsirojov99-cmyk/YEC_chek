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

// CORS - allow frontend domains
const allowedOrigins = [
  (process.env.FRONTEND_URL || 'https://yec-sallers.vercel.app').replace(/\/$/, '')
];

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173');
  allowedOrigins.push('http://localhost:3000');
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (server-to-server, mobile apps)
    if (!origin) return callback(null, true);
    
    // Normalize origin by stripping trailing slash
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // Allow Vercel deployment previews
    if (normalizedOrigin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    // Return null, false to reject CORS without throwing an error that crashes the request with a 500 status
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parser
app.use(express.json());

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/setup', setupRoutes);

// Health check endpoint
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
    hasJwtSecret: !!process.env.JWT_SECRET
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'So\'ralgan resurs topilmadi.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Express global error:', err);
  res.status(500).json({ error: 'Ichki server xatoligi yuz berdi.' });
});

// Vercel serverless uchun export
module.exports = app;