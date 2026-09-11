const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { hashPassword } = require('../utils/crypto');
const prisma = require('../lib/prisma');

async function main() {
  console.log('🌱 Starting database seed with catalog.yec.uz products...');
  console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? 'Loaded' : 'MISSING!');

  // 1. Create Default Branch
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

  // 2. Create Default Admin
  const adminHash = hashPassword('t.bmw.x7');
  await prisma.user.upsert({
    where: { email: 'saloxiddinsirojov99@gmail.com' },
    update: {
      password_hash: adminHash
    },
    create: {
      name: 'Super Admin',
      email: 'saloxiddinsirojov99@gmail.com',
      password_hash: adminHash,
      role: 'admin',
      branch_id: branch.id,
    },
  });
  console.log('✅ Default admin created (email: saloxiddinsirojov99@gmail.com, pass: t.bmw.x7)');

  // 3. Create Default Seller
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
  console.log('✅ Default seller created (email: seller@yecgilam.uz, pass: password123)');

  // 4. Load Scraped Products
  const scrapedJsonPath = 'C:\\Users\\salox\\.gemini\\antigravity-ide\\brain\\9fc25804-c9b1-4c59-a509-50e8d0242dd8\\scratch\\scraped_products.json';
  if (!fs.existsSync(scrapedJsonPath)) {
    console.error('❌ Scraped products JSON file not found at:', scrapedJsonPath);
    process.exit(1);
  }

  const catalogProducts = JSON.parse(fs.readFileSync(scrapedJsonPath, 'utf8'));
  console.log(`📦 Loaded ${catalogProducts.length} products from scraped dataset.`);

  // Prepare batch insert items
  const dataToInsert = catalogProducts.map((prod) => ({
    name: prod.name,
    code: prod.code || '',
    description: prod.description || `Kolleksiya: ${prod.collection}`,
    price: prod.category === 'rol' ? 150000 : 350000,
    image_url: prod.image_url,
    category: prod.category, // 'rol' or 'statick'
    is_active: 1,
  }));

  console.log('⏳ Inserting products into Neon PostgreSQL database in batches...');
  
  // Clear old items & products
  await prisma.orderItem.deleteMany({});
  await prisma.product.deleteMany({});

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < dataToInsert.length; i += batchSize) {
    const batch = dataToInsert.slice(i, i + batchSize);
    await prisma.product.createMany({
      data: batch,
      skipDuplicates: true,
    });
    inserted += batch.length;
    console.log(`  -> Inserted ${inserted} / ${dataToInsert.length} products`);
  }

  const finalCount = await prisma.product.count();
  const rolCount = await prisma.product.count({ where: { category: 'rol' } });
  const staticCount = await prisma.product.count({ where: { category: 'statick' } });

  console.log('\n==================================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log(` Total products in database: ${finalCount}`);
  console.log(` Metraj / Rol products:       ${rolCount}`);
  console.log(` Tayyor / Statick products:   ${staticCount}`);
  console.log('==================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
