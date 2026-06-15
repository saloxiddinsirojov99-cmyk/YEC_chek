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

    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Email va parol matn ko\'rinishida kiritilishi shart.' });
    }

    console.log('[LOGIN] Attempt for email:', email);

    // Check environment configuration
    if (!process.env.DATABASE_URL) {
      console.error('[LOGIN] DevOps Error: DATABASE_URL is not defined in environment variables.');
      return res.status(500).json({ 
        success: false, 
        message: 'Ma\'lumotlar bazasi bilan ulanish sozlanmagan. Vercel dashboard-da DATABASE_URL o\'zgaruvchisini sozlang.' 
      });
    }

    console.log('[LOGIN] DATABASE_URL defined, JWT_SECRET defined:', !!JWT_SECRET);

    if (!JWT_SECRET) {
      console.error('[LOGIN] DevOps Error: JWT_SECRET is not defined or is empty.');
      return res.status(500).json({
        success: false,
        message: 'JWT maxfiy kaliti sozlanmagan.'
      });
    }

    // Find user using Prisma
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { branch: true }
    });

    console.log('[LOGIN] User found in DB:', !!user);
    if (!user) {
      // Check if any users exist at all
      const userCount = await prisma.user.count();
      console.log('[LOGIN] Total users in DB:', userCount);
      return res.status(401).json({ success: false, message: 'Email yoki parol noto\'g\'ri.', debug: { userExists: false, totalUsers: userCount } });
    }

    console.log('[LOGIN] User role:', user.role, '| branch_id:', user.branch_id);

    // Verify password
    const isValid = verifyPassword(password, user.password_hash);
    console.log('[LOGIN] Password verification:', isValid ? 'SUCCESS' : 'FAILED');
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Email yoki parol noto\'g\'ri.' });
    }

    // Sign token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch?.name || null
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