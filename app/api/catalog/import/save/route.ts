import { db } from '@/lib/db';
import { api } from '@/lib/http';
import { catalogSchema } from '@/lib/validators';
import { z } from 'zod';

const productsSchema = z.array(catalogSchema).min(1).max(500);
const yieldToRuntime = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export async function POST(req: Request) {
  return api(async () => {
    const products = productsSchema.parse(await req.json());
    console.log('[catalog-import] received', products.length);
    const existing = await db.catalogItem.findMany({ select: { name: true, sku: true, sourceUrl: true } });
    await yieldToRuntime();
    const keys = new Set(existing.map(item => `${item.sourceUrl.toLowerCase()}|${item.sku.toLowerCase()}|${item.name.toLowerCase()}`));
    const fresh = products.filter(item => {
      const key = `${item.sourceUrl.toLowerCase()}|${item.sku.toLowerCase()}|${item.name.toLowerCase()}`;
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    });
    let created = 0;
    if (fresh.length) {
      const names = Array.from(new Set(fresh.map(item => item.category.trim()).filter(Boolean)));
      for (const name of names) {
        try {
          await db.catalogCategory.create({ data: { id: crypto.randomUUID(), name } });
          await yieldToRuntime();
        } catch (error) {
          if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002')) throw error;
        }
      }
      for (const item of fresh) {
        await db.catalogItem.create({ data: { id: crypto.randomUUID(), ...item } });
        await yieldToRuntime();
        created += 1;
      }
      if (created !== fresh.length) throw new Error('No se pudo confirmar la persistencia de todos los productos importados.');
    }
    return { created, skipped: products.length - fresh.length };
  }, 201);
}
