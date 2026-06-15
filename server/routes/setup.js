const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { hashPassword } = require('../utils/crypto');

// POST /api/setup/seed - Seed the database with default data
router.post('/seed', async (req, res) => {
  try {
    console.log('[SETUP] Starting database seed...');

    // Check admin user
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@yecgilam.uz' }
    });

    if (existingAdmin) {
      return res.json({
        success: true,
        message: 'Ma\'lumotlar bazasi allaqachon to\'ldirilgan.',
        data: { adminExists: true }
      });
    }

    // 1. Create default branch
    const branch = await prisma.branch.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: 'Bosh Showroom',
        address: 'Toshkent sh., Chilonzor 1-mavze',
        phone: '+998 99 123 45 67',
      },
    });

    // 2. Create default admin
    const adminHash = hashPassword('admin123');
    const admin = await prisma.user.create({
      data: {
        name: 'Administrator',
        email: 'admin@yecgilam.uz',
        password_hash: adminHash,
        role: 'admin',
        branch_id: branch.id,
      },
    });

    // 3. Create default seller
    const sellerHash = hashPassword('password123');
    const seller = await prisma.user.create({
      data: {
        name: 'Sotuvchi Test',
        email: 'seller@yecgilam.uz',
        password_hash: sellerHash,
        role: 'seller',
        branch_id: branch.id,
      },
    });

    // 4. Create default products
    const products = [
      { name: 'Turkiya Premium', description: "Yuqori sifatli Turkiya jun gilami, qalinligi 12mm", price: 450000 },
      { name: 'Eron Ipak Gilam', description: "Nafis naqshli, qo'lda to'qilgan Eron ipak gilami", price: 1200000 },
      { name: "O'zbekiston Baxmal", description: "Milliy naqshli, yumshoq va chidamli baxmal gilam", price: 350000 },
      { name: 'Buxoro Shoyi Gilam', description: 'Klassik Buxoro nusxa shoyi gilam', price: 800000 },
    ];

    for (const prod of products) {
      await prisma.product.create({
        data: {
          name: prod.name,
          description: prod.description,
          price: prod.price,
          is_active: 1,
        },
      });
    }

    console.log('[SETUP] Seed completed successfully');
    res.json({
      success: true,
      message: 'Ma\'lumotlar bazasi muvaffaqiyatli to\'ldirildi.',
      data: {
        branch: branch.name,
        admin: { email: admin.email, role: admin.role },
        seller: { email: seller.email, role: seller.role },
        productsCount: products.length,
      }
    });
  } catch (err) {
    console.error('[SETUP] Seed error:', err);
    res.status(500).json({
      success: false,
      message: 'Ma\'lumotlar bazasini to\'ldirishda xatolik yuz berdi.',
      error: err.message,
    });
  }
});

// GET /api/setup/status - Check database setup status
router.get('/status', async (req, res) => {
  try {
    const branchCount = await prisma.branch.count();
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();

    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@yecgilam.uz' }
    });

    res.json({
      success: true,
      data: {
        branches: branchCount,
        users: userCount,
        products: productCount,
        adminExists: !!adminUser,
        dbConfigured: branchCount > 0 && userCount > 0,
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Holatni tekshirishda xatolik.',
      error: err.message,
    });
  }
});

module.exports = router;