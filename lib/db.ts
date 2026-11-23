import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { databaseUrl } from '@/lib/runtime-env';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const connectionString = databaseUrl();

if (!connectionString) throw new Error('DATABASE_URL no está configurada');

// Hyperdrive limits this origin to a small, shared number of upstream
// connections. A default pg pool can open several connections per Worker
// isolate, exhausting that limit when the dashboard loads its resources.
const adapter = new PrismaPg({
  connectionString,
  max: 1,
  idleTimeoutMillis: 5_000,
});
export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
