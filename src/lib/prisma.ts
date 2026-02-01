import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, PoolConfig } from "pg";

// Disable SSL certificate verification for Supabase pooler connections
// This is required because Supabase uses self-signed certificates
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// Singleton pattern for both Pool and PrismaClient
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Reuse the same pool across requests
function getPool() {
  if (!globalForPrisma.pool) {
    const connectionString = process.env.DATABASE_URL;

    // For Supabase pooler connections, we need SSL with certificate verification disabled
    // The connection string may have sslmode=require, but Node.js pg driver
    // still needs explicit SSL config to disable certificate verification
    const config: PoolConfig = {
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false,
      },
    };

    globalForPrisma.pool = new Pool(config);
  }
  return globalForPrisma.pool;
}

function createPrismaClient() {
  const pool = getPool();
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
