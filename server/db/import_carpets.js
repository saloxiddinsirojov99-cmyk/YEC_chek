const fs = require('fs');
const { getQuery } = require('./database');

const SIZES = [
  '300x400', '300x500', '350x500',
  '400x500', '400x600', '450x600',
  '500x700', '500x800'
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePrice(size) {
  const [w, h] = size.split('x').map(Number);
  const area = (w * h) / 10000;
  const pricePerM2 = randomInt(80000, 350000);
  return Math.round((pricePerM2 * area) / 1000) * 1000;
}

async function importCarpets() {
  try {
    console.log('Mahsulotlarni import qilish boshlandi...');

    const csvPath = 'D:\\YEC_sold\\front\\carpet_mapping.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(Boolean);

    const carpetData = [];
    for (let i = 1; i < lines.length; i++) {
      const match = lines[i].match(/"([^"]+)","([^"]+)","([^"]+)"/);
      if (!match) continue;
      carpetData.push({
        name: match[1],
        categoryId: match[2],
        categoryName: match[3]
      });
    }

    console.log(`  ${carpetData.length} ta mahsulot topildi.`);

    let created = 0;
    let skipped = 0;

    for (const carpet of carpetData) {
      const q = getQuery();
      const existing = await q.get(
        'SELECT id FROM products WHERE name = ?',
        [carpet.name]
      );
      if (existing) {
        skipped++;
        continue;
      }

      const sizeStr = pickRandom(SIZES);
      const price = generatePrice(sizeStr);
      const designCode = carpet.name.split(' ').pop() || '';

      let collection = carpet.name.split(' ')[0].toLowerCase();
      if (carpet.name.toLowerCase().startsWith('eron soft') ||
          carpet.name.toLowerCase().startsWith('iran soft')) {
        collection = 'iran-soft';
      }

      const description = `YEC Gilam - ${carpet.categoryName} kolleksiyasi. ${carpet.name}. O'lcham: ${sizeStr}. Yuqori sifatli gilam.`;

      await q.run(
        `INSERT INTO products (name, description, price, image_url, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [
          carpet.name,
          description,
          price,
          `/images/collections/${collection}/${designCode}.jpg`
        ]
      );

      created++;

      if (created % 100 === 0) {
        console.log(`  ${created} ta mahsulot import qilindi...`);
      }
    }

    console.log(`\nImport yakunlandi!`);
    console.log(`  Yaratilgan: ${created}`);
    console.log(`  O'tkazib yuborilgan: ${skipped}`);
    console.log(`  Jami: ${carpetData.length}`);

    process.exit(0);
  } catch (err) {
    console.error('Import xatosi:', err);
    process.exit(1);
  }
}

importCarpets();