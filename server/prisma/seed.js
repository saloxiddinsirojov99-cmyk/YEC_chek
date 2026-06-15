// ============================================================
// PRISMA SEED - Default admin/seller/products
// ============================================================
// Run: npx prisma db seed
// Or:  node prisma/seed.js
// ============================================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { hashPassword } = require('../utils/crypto');
const prisma = require('../lib/prisma');

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Default Branch
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
  console.log('✅ Default branch created:', branch.name);

  // 2. Default Admin
  const adminHash = hashPassword('admin123');
  await prisma.user.upsert({
    where: { email: 'admin@yecgilam.uz' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@yecgilam.uz',
      password_hash: adminHash,
      role: 'admin',
      branch_id: branch.id,
    },
  });
  console.log('✅ Default admin (admin@yecgilam.uz / admin123)');

  // 3. Default Seller
  const sellerHash = hashPassword('password123');
  await prisma.user.upsert({
    where: { email: 'seller@yecgilam.uz' },
    update: {},
    create: {
      name: 'Sotuvchi Test',
      email: 'seller@yecgilam.uz',
      password_hash: sellerHash,
      role: 'seller',
      branch_id: branch.id,
    },
  });
  console.log('✅ Default seller (seller@yecgilam.uz / password123)');

  // 4. Default Products
  const products = [
    { name: 'Turkiya Premium', description: "Yuqori sifatli Turkiya jun gilami, qalinligi 12mm", price: 450000 },
    { name: 'Eron Ipak Gilam', description: "Nafis naqshli, qo'lda to'qilgan Eron ipak gilami", price: 1200000 },
    { name: "O'zbekiston Baxmal", description: "Milliy naqshli, yumshoq va chidamli baxmal gilam", price: 350000 },
    { name: 'Buxoro Shoyi Gilam', description: 'Klassik Buxoro nusxa shoyi gilam', price: 800000 },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { id: products.indexOf(prod) + 1 },
      update: {},
      create: {
        name: prod.name,
        description: prod.description,
        price: prod.price,
        is_active: 1,
      },
    });
  }
  console.log('✅ Sample products seeded');

  // 5. Default Terms & Conditions
  const defaultTerms = `Texnik jixatlar
1.1. Aniq o'lchamlar aytib o'tilganidan 1-2sm ga farq qilishi mumkin.
1.2. Gilam ranglari vitrina na'munasidan 10% gacha farq qilishi mumkin.
...
Yetkazib berish va kafolat:
2.1. Toshkent shahrida yetkazib berish shartnomada kelishilgan holda amalga oshiriladi.
2.2. Yetkazib berish xizmati qavatga ko'tarish shartlarini o'z ichiga oladi.
2.3. Yetkazib berish sanasida haridor yoki uning vakili kun davomida manzilda bo'lishi shart.
2.4. Mahsulotni topshirish-qabul qilish jarayoni tugaganidan keyingi mexanik shikastlanishlar va nuqsonlar bo'yicha e'tirozlar qabul qilinmaydi!
2.5. Maqbul sifatli va o'lchami kesilgan gilamlar qaytarib olinmaydi va almashtirib berilmaydi!`;

  await prisma.setting.upsert({
    where: { key: 'receipt_terms' },
    update: { value: defaultTerms },
    create: {
      key: 'receipt_terms',
      value: defaultTerms,
    },
  });
  console.log('✅ Default terms and conditions seeded');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });