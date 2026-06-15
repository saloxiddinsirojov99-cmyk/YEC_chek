import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_FsZl5YK8NLnb@ep-falling-shadow-aqpgh06d-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
  },
});