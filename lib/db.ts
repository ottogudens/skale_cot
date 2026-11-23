import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { databaseUrl } from '@/lib/runtime-env';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const connectionString = databaseUrl();

if (!connectionString) throw new Error('DATABASE_URL no está configurada');

const adapter = new PrismaPg({ connectionString });
export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
