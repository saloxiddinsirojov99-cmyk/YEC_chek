require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('CRITICAL: DATABASE_URL environment variable is not defined.');
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  const adapter = new PrismaPg(pool);
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
}

const prisma = globalForPrisma.prisma;

module.exports = prisma;