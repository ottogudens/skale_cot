import { db } from '@/lib/db';
import { api } from '@/lib/http';
import { clientSchema } from '@/lib/validators';
export const GET = () => api(() => db.client.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { quotes: true } } } }));
export async function POST(req: Request) { return api(async () => db.client.create({ data: clientSchema.parse(await req.json()) }), 201); }
