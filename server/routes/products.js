const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Multer config for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../client/public/uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Faqat rasm fayllari (jpg, png, gif, webp) yuklash mumkin.'));
  }
});

// Auto-generate product code
async function generateProductCode() {
  const last = await prisma.product.findFirst({
    where: {
      code: { not: "" }
    },
    orderBy: { id: 'desc' },
    select: { code: true }
  });
  let num = 1;
  if (last && last.code) {
    const match = last.code.match(/\d+/);
    if (match) num = parseInt(match[0]) + 1;
  }
  return 'G-' + String(num).padStart(4, '0');
}

// GET /api/products
router.get('/', authenticateToken, async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== 'admin') {
      where.is_active = 1;
    }
    
    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: products,
      message: 'Mahsulotlar ro\'yxati muvaffaqiyatli yuklandi.'
    });
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

// POST /api/products (Admin only) - with image upload
router.post('/', authenticateToken, requireRole(['admin']), upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, is_active } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Mahsulot nomi va narxi kiritilishi shart.' });
    }

    // Auto-generate code
    const code = await generateProductCode();
    
    // Get image URL if file uploaded
    let imageUrl = '';
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        code,
        description: description ? description.trim() : null,
        price: parseFloat(price),
        image_url: imageUrl || null,
        is_active: is_active !== undefined ? parseInt(is_active) : 1
      }
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Mahsulot muvaffaqiyatli yaratildi.'
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

// PUT /api/products/:id (Admin only) - with optional image upload
router.put('/:id', authenticateToken, requireRole(['admin']), upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, is_active } = req.body;
    const { id } = req.params;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Mahsulot nomi va narxi kiritilishi shart.' });
    }

    // Get existing product
    const existing = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi.' });
    }

    let imageUrl = existing.image_url || '';
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
    }

    const updated = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        price: parseFloat(price),
        image_url: imageUrl || null,
        is_active: is_active !== undefined ? parseInt(is_active) : existing.is_active
      }
    });

    res.json({
      success: true,
      data: updated,
      message: 'Mahsulot muvaffaqiyatli yangilandi.'
    });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

// DELETE /api/products/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Mahsulot muvaffaqiyatli o\'chirildi.'
    });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

module.exports = router;