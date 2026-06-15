const fs = require('fs');
const path = require('path');
const { getQuery } = require('./database');
const { hashPassword } = require('../utils/crypto');

async function initDb() {
  try {
    console.log('Initializing database schema...');

    const q = getQuery();

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await q.exec(schemaSql);
    console.log('Schema loaded successfully.');

    // Seed 1: Default Branch
    const existingBranch = await q.get('SELECT * FROM branches WHERE name = ?', ['Bosh Showroom']);
    let branchId = 1;
    if (!existingBranch) {
      const result = await q.run(
        'INSERT INTO branches (name, address, phone) VALUES (?, ?, ?)',
        ['Bosh Showroom', 'Toshkent sh., Chilonzor 1-mavze', '+998 99 123 45 67']
      );
      branchId = result.id;
      console.log('Default branch created.');
    } else {
      branchId = existingBranch.id;
    }

    // Seed 2: Default Admin User
    const existingAdmin = await q.get('SELECT * FROM users WHERE email = ?', ['admin@yecgilam.uz']);
    if (!existingAdmin) {
      const adminPassHash = hashPassword('admin123');
      await q.run(
        'INSERT INTO users (name, email, password_hash, role, branch_id) VALUES (?, ?, ?, ?, ?)',
        ['Adminstrator', 'admin@yecgilam.uz', adminPassHash, 'admin', branchId]
      );
      console.log('Default Admin user created (Email: admin@yecgilam.uz, Pass: admin123).');
    }

    // Seed 3: Default Seller User
    const existingSeller = await q.get('SELECT * FROM users WHERE email = ?', ['seller@yecgilam.uz']);
    if (!existingSeller) {
      const sellerPassHash = hashPassword('password123');
      await q.run(
        'INSERT INTO users (name, email, password_hash, role, branch_id) VALUES (?, ?, ?, ?, ?)',
        ['Sotuvchi Test', 'seller@yecgilam.uz', sellerPassHash, 'seller', branchId]
      );
      console.log('Default Seller user created (Email: seller@yecgilam.uz, Pass: password123).');
    }

    // Seed 4: Default Products
    const productCount = await q.get('SELECT COUNT(*) as count FROM products');
    if (productCount.count === 0) {
      const defaultProducts = [
        { name: 'Turkiya Premium', description: 'Yuqori sifatli Turkiya jun gilami, qalinligi 12mm', price: 450000 },
        { name: 'Eron Ipak Gilam', description: 'Nafis naqshli, qo\'lda to\'qilgan Eron ipak gilami', price: 1200000 },
        { name: 'O\'zbekiston Baxmal', description: 'Milliy naqshli, yumshoq va chidamli baxmal gilam', price: 350000 },
        { name: 'Buxoro Shoyi Gilam', description: 'Klassik Buxoro nusxa shoyi gilam', price: 800000 }
      ];

      for (const prod of defaultProducts) {
        await q.run(
          'INSERT INTO products (name, description, price, is_active) VALUES (?, ?, ?, ?)',
          [prod.name, prod.description, prod.price, 1]
        );
      }
      console.log('Sample products seeded.');
    }

    // Seed 5: Default Terms & Conditions
    const existingTerms = await q.get('SELECT * FROM settings WHERE key = ?', ['receipt_terms']);
    if (!existingTerms) {
      const defaultTerms = `Texnik jixatlar
1.1. Aniq o'lchamlar aytib o'tilganidan 1-2sm ga farq qilishi mumkin, buyurtma berayotganda buni inobatga oling!
1.2. Gilam ranglari vitrina na'munasidan 10% gacha farq qilishi mumkin!
1.3. Mahsulot rangi yorug'lik turi va kuchiga qarab boshqa tusga kirishi mumkin!
1.4. Foto yoki videosiga asoslanib tanlov qilganingizda ranglar noto'g'ri uzatilishi mumkinligini inobatga oling!

Yetkazib berish va kafolat:
2.1. Toshkent shahrida yetkazib berish shartnomada kelishilgan holda amalga oshiriladi.
2.2. Yetkazib berish xizmati qavatga ko'tarish shartlarini o'z ichiga oladi (kelishuvga ko'ra).
2.3. Yetkazib berish sanasida haridor yoki uning vakili kun davomida manzilda bo'lishi shart. Haridor uyda bo'lmagan taqdirda keyingi yetkazib berish qo'shimcha to'lov asosida amalga oshiriladi!
2.4. Mahsulotni topshirish-qabul qilish jarayoni tugaganidan keyingi mexanik shikastlanishlar va nuqsonlar bo'yicha e'tirozlar qabul qilinmaydi!
2.5. Maqbul sifatli va o'lchami kesilgan gilamlar qaytarib olinmaydi va almashtirib berilmaydi!

Ushbu hujjatga imzo qo'yish yoki buyurtmani tasdiqlash orqali siz yuqoridagi shartlar bilan tanishganingizni va ularga roziligingizni tasdiqlaysiz.`;

      await q.run(
        'INSERT INTO settings (key, value) VALUES (?, ?)',
        ['receipt_terms', defaultTerms]
      );
      console.log('Default receipt terms and conditions seeded.');
    }

    console.log('Database initialization complete.');
    process.exit(0);
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    process.exit(1);
  }
}

initDb();