import { db } from '@/lib/db';
import { api } from '@/lib/http';
import { catalogSchema } from '@/lib/validators';
import { z } from 'zod';

const productsSchema = z.array(catalogSchema).min(1).max(500);

export async function POST(req: Request) {
  return api(async () => {
    const products = productsSchema.parse(await req.json());
    const existing = await db.catalogItem.findMany({ select: { name: true, sku: true, sourceUrl: true } });
    const keys = new Set(existing.map(item => `${item.sourceUrl.toLowerCase()}|${item.sku.toLowerCase()}|${item.name.toLowerCase()}`));
    const fresh = products.filter(item => {
      const key = `${item.sourceUrl.toLowerCase()}|${item.sku.toLowerCase()}|${item.name.toLowerCase()}`;
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    });
    if (fresh.length) await db.$transaction(fresh.map(item => db.catalogItem.create({ data: item })));
    return { created: fresh.length, skipped: products.length - fresh.length };
  }, 201);
}
