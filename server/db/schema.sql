-- SQLite Database Schema for YEC Gilam

-- 1. Branches table (Showrooms)
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users table (Sotuvchilar va Adminlar)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'seller')) NOT NULL,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products table (Gilamlar va mahsulotlar)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT DEFAULT '',
  description TEXT,
  price REAL NOT NULL,
  image_url TEXT,
  is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Orders table (Buyurtmalar)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_phone2 TEXT NOT NULL DEFAULT '',
  customer_address TEXT,
  order_date TEXT NOT NULL,
  delivery_date TEXT NOT NULL,
  total_amount REAL NOT NULL,
  paid_amount REAL NOT NULL,
  note TEXT,
  status TEXT CHECK(status IN ('pending', 'delivering', 'pending_balance', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Order Items table (Buyurtma mahsulotlari)
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_code TEXT DEFAULT '',
  width REAL DEFAULT 0,
  height REAL DEFAULT 0,
  quantity REAL NOT NULL CHECK(quantity > 0),
  price REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  note TEXT
);

-- 6. Settings table (Tizim sozlamalari)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);