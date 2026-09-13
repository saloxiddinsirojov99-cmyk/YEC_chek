const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { verifyPassword, hashPassword } = require('../utils/crypto');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ success: false, message: 'So\'rov tanasi (request body) bo\'sh bo\'lishi mumkin emas.' });
    }

    const identifier = (req.body.emailOrName || req.body.email || req.body.name || req.body.username || '').trim();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Email/ism va parol kiritilishi shart.' });
    }

    console.log('[LOGIN] Attempt for identifier:', identifier);

    // Check environment configuration
    if (!process.env.DATABASE_URL) {
      console.error('[LOGIN] DevOps Error: DATABASE_URL is not defined in environment variables.');
      return res.status(500).json({ 
        success: false, 
        message: 'Ma\'lumotlar bazasi bilan ulanish sozlanmagan. Vercel dashboard-da DATABASE_URL o\'zgaruvchisini sozlang.' 
      });
    }

    if (!JWT_SECRET) {
      console.error('[LOGIN] DevOps Error: JWT_SECRET is not defined or is empty.');
      return res.status(500).json({
        success: false,
        message: 'JWT maxfiy kaliti sozlanmagan.'
      });
    }

    // 1. Search candidates by exact email OR exact name (case-insensitive)
    let candidates = await prisma.user.findMany({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { name: { equals: identifier, mode: 'insensitive' } }
        ]
      },
      include: { branch: true }
    });

    // 2. If no exact match found, also check if name starts with identifier (e.g. first name)
    if (candidates.length === 0) {
      candidates = await prisma.user.findMany({
        where: {
          name: { startsWith: identifier, mode: 'insensitive' }
        },
        include: { branch: true }
      });
    }

    console.log('[LOGIN] Candidates found in DB:', candidates.length);
    if (candidates.length === 0) {
      return res.status(401).json({ success: false, message: 'Email/ism yoki parol noto\'g\'ri.' });
    }

    // 3. Verify password against matching candidate(s) to guarantee accurate user resolution
    let authenticatedUser = null;
    for (const candidate of candidates) {
      if (verifyPassword(password, candidate.password_hash)) {
        authenticatedUser = candidate;
        break;
      }
    }

    console.log('[LOGIN] Password verification:', authenticatedUser ? 'SUCCESS' : 'FAILED');
    if (!authenticatedUser) {
      return res.status(401).json({ success: false, message: 'Email/ism yoki parol noto\'g\'ri.' });
    }

    console.log('[LOGIN] User authenticated:', authenticatedUser.id, authenticatedUser.role, '| branch_id:', authenticatedUser.branch_id);

    // Sign token
    const token = jwt.sign(
      {
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        branch_id: authenticatedUser.branch_id,
        branch_name: authenticatedUser.branch?.name || null
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branch_id: user.branch_id,
          branch_name: user.branch?.name || null
        }
      },
      message: 'Tizimga muvaffaqiyatli kirildi.'
    });
  } catch (err) {
    console.error('Login endpoint error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Tizim xatoligi yuz berdi.', 
      error: err.message 
    });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, branch_id } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Barcha maydonlar kiritilishi shart.' });
    }

    if (role !== 'admin' && role !== 'seller') {
      return res.status(400).json({ success: false, message: 'Noto\'g\'ri rol tanlandi.' });
    }

    // Check if email unique
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Ushbu email bilan ro\'yxatdan o\'tilgan.' });
    }

    const passwordHash = hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: role,
        branch_id: branch_id ? parseInt(branch_id) : null
      },
      include: {
        branch: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch?.name || null
      },
      message: 'Muvaffaqiyatli ro\'yxatdan o\'tildi.'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Ro\'yxatdan o\'tishda xatolik yuz berdi.' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  res.json({ success: true, message: 'Chiqish muvaffaqiyatli amalga oshirildi.' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { branch: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch?.name || null
      }
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

module.exports = router;