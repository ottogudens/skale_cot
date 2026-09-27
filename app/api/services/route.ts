import { db } from '@/lib/db';
import { api } from '@/lib/http';
import { serviceSchema } from '@/lib/validators';

function withSources<T extends { marketSources: string }>(service: T) {
  let sources = [];
  try { sources = JSON.parse(service.marketSources); } catch { /* Older rows may not have reference data. */ }
  return { ...service, marketSources: sources };
}
export const GET = () => api(async () => (await db.serviceItem.findMany({ orderBy: [{ active: 'desc' }, { category: 'asc' }, { name: 'asc' }] })).map(withSources));
export async function POST(req: Request) {
  return api(async () => {
    const data = serviceSchema.parse(await req.json());
    await db.catalogCategory.createMany({ data: [{ name: data.category }], skipDuplicates: true });
    return withSources(await db.serviceItem.create({ data }));
  }, 201);
}
