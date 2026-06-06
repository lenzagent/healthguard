import { defineConfig } from "prisma/config";

// Prisma CLI auto-loads .env from project root for process.env.
const databaseUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/healthguard";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
