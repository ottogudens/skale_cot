import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { databaseUrl } from '@/lib/runtime-env';
import { AsyncLocalStorage } from 'node:async_hooks';

const requestDb = new AsyncLocalStorage<PrismaClient>();

function createDb() {
  const connectionString = databaseUrl();
  if (!connectionString) throw new Error('DATABASE_URL no está configurada');

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

// Hyperdrive owns the connection pool. Workers cannot reuse a socket created
// during one request in a later request, so each API operation receives and
// closes its own Prisma client.
export async function withDb<T>(work: () => Promise<T>) {
  const client = createDb();
  return requestDb.run(client, async () => {
    try {
      return await work();
    } finally {
      await client.$disconnect();
    }
  });
}

// Existing route modules keep their concise `db.model.method()` syntax while
// resolving to the client associated with the current request.
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = requestDb.getStore();
    if (!client) throw new Error('La base de datos debe usarse dentro de una solicitud API.');
    const value = Reflect.get(client, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
