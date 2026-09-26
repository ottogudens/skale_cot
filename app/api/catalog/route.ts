import { db } from '@/lib/db';
import { api } from '@/lib/http';
import { catalogSchema } from '@/lib/validators';
export const GET = () => api(() => db.catalogItem.findMany({ orderBy: [{ active: 'desc' }, { category: 'asc' }, { name: 'asc' }] }));
export async function POST(req: Request) { return api(async () => db.catalogItem.create({ data: catalogSchema.parse(await req.json()) }), 201); }
