const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { hashPassword } = require('../utils/crypto');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendUserNotificationEmail } = require('../utils/email');

// All endpoints in this file are restricted to Admins
router.use(authenticateToken, requireRole(['admin']));

// GET /api/users - List all users with branch details
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        branch: { select: { name: true } }
      },
      orderBy: { name: 'asc' }
    });

    const formattedUsers = users.map(user => ({
      ...user,
      branch_name: user.branch?.name || null
    }));

    res.json({
      success: true,
      data: formattedUsers,
      message: 'Foydalanuvchilar ro\'yxati muvaffaqiyatli yuklandi.'
    });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

// POST /api/users - Create new seller/admin
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, branch_id } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Ism, email, parol va rol kiritilishi shart.' });
    }

    if (role !== 'admin' && role !== 'seller') {
      return res.status(400).json({ success: false, message: 'Noto\'g\'ri rol tanlandi.' });
    }

    // Check if email unique
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Ushbu email li foydalanuvchi allaqachon mavjud.' });
    }

    const passwordHash = hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: role,
        branch_id: branch_id ? parseInt(branch_id) : null
      }
    });

    const newUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch_id: user.branch_id,
      created_at: user.created_at
    };

    // Send email notification (non-blocking)
    sendUserNotificationEmail({
      action: 'created',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tempPassword: password
    }).catch(err => console.error('Email send failed (non-critical):', err.message));

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'Foydalanuvchi muvaffaqiyatli yaratildi.'
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const { name, email, password, role, branch_id } = req.body;
    const { id } = req.params;

    if (!name || !email || !role) {
      return res.status(400).json({ success: false, message: 'Ism, email va rol kiritilishi shart.' });
    }

    // Get old user data for comparison
    const oldUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });
    if (!oldUser) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
    }

    // Check if email unique to another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        id: { not: parseInt(id) }
      }
    });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Ushbu email boshqa foydalanuvchiga tegishli.' });
    }

    const updateData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role,
      branch_id: branch_id ? parseInt(branch_id) : null
    };
    
    if (password) {
      updateData.password_hash = hashPassword(password);
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Track changed fields for email
    const changedFields = [];
    if (oldUser.name !== name) changedFields.push('Ism');
    if (oldUser.email !== email.trim().toLowerCase()) changedFields.push('Email');
    if (oldUser.role !== role) changedFields.push('Rol');
    if (oldUser.branch_id !== (branch_id ? parseInt(branch_id) : null)) changedFields.push('Filial');
    if (password) changedFields.push('Parol');

    const resultUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      branch_id: updatedUser.branch_id
    };

    // Send email notification (non-blocking)
    if (changedFields.length > 0) {
      sendUserNotificationEmail({
        action: 'updated',
        user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role },
        changedFields
      }).catch(err => console.error('Email send failed (non-critical):', err.message));
    }

    res.json({
      success: true,
      data: resultUser,
      message: 'Foydalanuvchi muvaffaqiyatli yangilandi.'
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'O\'zingizning profilingizni o\'chira olmaysiz.' });
    }

    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Foydalanuvchi muvaffaqiyatli o\'chirildi.'
    });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

module.exports = router;