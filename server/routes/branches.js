const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/branches (All authenticated users can list branches for dropdowns)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({
      success: true,
      data: branches,
      message: 'Filiallar ro\'yxati muvaffaqiyatli yuklandi.'
    });
  } catch (err) {
    console.error('List branches error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

// POST /api/branches (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, address, phone } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Filial nomi kiritilishi shart.' });
    }

    const branch = await prisma.branch.create({
      data: {
        name: name.trim(),
        address: address ? address.trim() : null,
        phone: phone ? phone.trim() : null
      }
    });

    res.status(201).json({
      success: true,
      data: branch,
      message: 'Filial muvaffaqiyatli yaratildi.'
    });
  } catch (err) {
    console.error('Create branch error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

// PUT /api/branches/:id (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    const { id } = req.params;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Filial nomi kiritilishi shart.' });
    }

    const branch = await prisma.branch.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        address: address ? address.trim() : null,
        phone: phone ? phone.trim() : null
      }
    });

    res.json({
      success: true,
      data: branch,
      message: 'Filial muvaffaqiyatli yangilandi.'
    });
  } catch (err) {
    console.error('Update branch error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

// DELETE /api/branches/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.branch.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Filial muvaffaqiyatli o\'chirildi.'
    });
  } catch (err) {
    console.error('Delete branch error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

module.exports = router;