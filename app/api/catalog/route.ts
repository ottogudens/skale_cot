import { db } from '@/lib/db';
import { api } from '@/lib/http';
import { catalogSchema } from '@/lib/validators';
export const GET = () => api(() => db.catalogItem.findMany({ orderBy: [{ active: 'desc' }, { category: 'asc' }, { name: 'asc' }] }));
export async function POST(req: Request) { return api(async () => { const data = catalogSchema.parse(await req.json()); const categories = await db.catalogCategory.findMany({ select: { name: true } }); if (!categories.some(category => category.name === data.category)) await db.catalogCategory.create({ data: { id: crypto.randomUUID(), name: data.category } }); return db.catalogItem.create({ data: { id: crypto.randomUUID(), ...data } }); }, 201); }
