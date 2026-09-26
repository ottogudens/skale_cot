import { db } from '@/lib/db';
import { api } from '@/lib/http';
import { catalogSchema } from '@/lib/validators';
type Ctx = { params: Promise<{ id: string }> };
export async function PUT(req: Request, { params }: Ctx) { const { id } = await params; return api(async () => db.catalogItem.update({ where: { id }, data: catalogSchema.parse(await req.json()) })); }
export async function DELETE(_: Request, { params }: Ctx) { const { id } = await params; return api(async () => db.catalogItem.delete({ where: { id } })); }
