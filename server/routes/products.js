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

// Conditional multer middleware for multipart requests only
const handleUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return upload.single('image')(req, res, next);
  }
  next();
};

// Helper to extract collection name
function getCollectionName(product) {
  if (product.description) {
    const match = product.description.match(/Kolleksiya:\s*([^,\n]+)/i);
    if (match && match[1].trim()) return match[1].trim();
  }
  if (product.name) {
    const parts = product.name.trim().split(/\s+/);
    return parts[0];
  }
  return 'Boshqa';
}

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

// GET /api/products/collections - Get unique collections with product count
router.get('/collections', authenticateToken, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, description: true, price: true, category: true }
    });

    const map = {};
    products.forEach(p => {
      const coll = getCollectionName(p);
      if (!map[coll]) {
        map[coll] = {
          collection: coll,
          count: 0,
          category: p.category,
          price: p.price
        };
      }
      map[coll].count++;
    });

    const collections = Object.values(map).sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: collections
    });
  } catch (err) {
    console.error('Get collections error:', err);
    res.status(500).json({ success: false, message: 'Kolleksiyalarni yuklashda xatolik yuz berdi.' });
  }
});

// POST /api/products/bulk-preview - Preview matching products before updating
router.post('/bulk-preview', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { collections, category } = req.body;

    if (!collections || !Array.isArray(collections) || collections.length === 0) {
      return res.json({ success: true, count: 0, preview: [] });
    }

    const orConditions = [];
    collections.forEach(item => {
      const trimmed = String(item).trim();
      if (trimmed) {
        orConditions.push({ name: { contains: trimmed, mode: 'insensitive' } });
        orConditions.push({ description: { contains: trimmed, mode: 'insensitive' } });
      }
    });

    if (orConditions.length === 0) {
      return res.json({ success: true, count: 0, preview: [] });
    }

    const where = { OR: orConditions };
    if (category && category !== 'all') {
      where.category = category;
    }

    const count = await prisma.product.count({ where });
    const preview = await prisma.product.findMany({
      where,
      take: 60,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true, category: true, price: true, description: true }
    });

    res.json({
      success: true,
      count,
      preview
    });
  } catch (err) {
    console.error('Bulk preview error:', err);
    res.status(500).json({ success: false, message: 'Preview olishda xatolik yuz berdi.' });
  }
});

// POST /api/products/bulk-price-update - Bulk update prices for multiple collections/names
router.post('/bulk-price-update', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { collections, price, category } = req.body;

    if (!collections || !Array.isArray(collections) || collections.length === 0) {
      return res.status(400).json({ success: false, message: 'Kamida bitta kolleksiya yoki nom tanlanishi shart.' });
    }

    if (price === undefined || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return res.status(400).json({ success: false, message: 'Yaroqli narx kiritilishi shart.' });
    }

    const newPrice = parseFloat(price);

    const orConditions = [];
    collections.forEach(item => {
      const trimmed = String(item).trim();
      if (trimmed) {
        orConditions.push({ name: { contains: trimmed, mode: 'insensitive' } });
        orConditions.push({ description: { contains: trimmed, mode: 'insensitive' } });
      }
    });

    if (orConditions.length === 0) {
      return res.status(400).json({ success: false, message: 'Tanlangan nomlar bo\'sh bo\'lishi mumkin emas.' });
    }

    const where = { OR: orConditions };
    if (category && category !== 'all') {
      where.category = category;
    }

    const result = await prisma.product.updateMany({
      where,
      data: {
        price: newPrice
      }
    });

    res.json({
      success: true,
      updatedCount: result.count,
      message: `${result.count} ta mahsulot narxi muvaffaqiyatli ${newPrice.toLocaleString()} so'mga yangilandi.`
    });
  } catch (err) {
    console.error('Bulk price update error:', err);
    res.status(500).json({ success: false, message: 'Narxlarni ommaviy yangilashda xatolik yuz berdi.' });
  }
});

// GET /api/products
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query;
    const where = {};

    if (req.user.role !== 'admin') {
      where.is_active = 1;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const products = await prisma.product.findMany({
      where,
      orderBy: { id: 'desc' }
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

// POST /api/products (Admin only) - with image upload & multi-code support
router.post('/', authenticateToken, requireRole(['admin']), handleUpload, async (req, res) => {
  try {
    let { name, code, codes, description, price, category, is_active } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Mahsulot nomi va narxi kiritilishi shart.' });
    }

    const baseName = name.trim();
    const parsedPrice = parseFloat(price);
    const prodCategory = category ? category.trim() : 'statick';
    const prodIsActive = is_active !== undefined ? parseInt(is_active) : 1;
    const prodDesc = description ? description.trim() : null;

    // Get image URL if file uploaded
    let imageUrl = null;
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
    }

    // Extract list of codes
    let codeList = [];
    if (Array.isArray(codes) && codes.length > 0) {
      codeList = codes.map(c => String(c).trim()).filter(Boolean);
    } else if (typeof codes === 'string' && codes.trim()) {
      codeList = codes.split(/[,;\n\s]+/).map(c => c.trim()).filter(Boolean);
    } else if (typeof code === 'string' && code.trim()) {
      // support comma, semicolon or newline separated codes in code input as well
      codeList = code.split(/[,;\n]+/).map(c => c.trim()).filter(Boolean);
    }

    // Auto-generate code if none provided
    if (codeList.length === 0) {
      const generated = await generateProductCode();
      codeList = [generated];
    }

    // Helper: format product name with code in parentheses e.g. "iran (PR27A)"
    const formatProductName = (base, c) => {
      // If base name already has (CODE) at the end, don't duplicate
      const regex = new RegExp(`\\(${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)$`, 'i');
      if (regex.test(base)) return base;
      return `${base} (${c})`;
    };

    const createdProducts = [];
    for (const c of codeList) {
      const finalName = formatProductName(baseName, c);
      const product = await prisma.product.create({
        data: {
          name: finalName,
          code: c,
          description: prodDesc,
          price: parsedPrice,
          category: prodCategory,
          image_url: imageUrl,
          is_active: prodIsActive
        }
      });
      createdProducts.push(product);
    }

    res.status(201).json({
      success: true,
      data: createdProducts.length === 1 ? createdProducts[0] : createdProducts,
      count: createdProducts.length,
      message: createdProducts.length > 1
        ? `${createdProducts.length} ta mahsulot muvaffaqiyatli yaratildi!`
        : 'Mahsulot muvaffaqiyatli yaratildi.'
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi: ' + err.message });
  }
});

// PUT /api/products/:id (Admin only) - with optional image upload
router.put('/:id', authenticateToken, requireRole(['admin']), handleUpload, async (req, res) => {
  try {
    const { name, code, description, price, category, is_active } = req.body;
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
        code: code !== undefined ? (code ? code.trim() : '') : existing.code,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        price: parseFloat(price),
        category: category !== undefined ? category.trim() : existing.category,
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