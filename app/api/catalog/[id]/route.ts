import { db } from '@/lib/db';
import { api } from '@/lib/http';
import { catalogSchema } from '@/lib/validators';
type Ctx = { params: Promise<{ id: string }> };
export async function PUT(req: Request, { params }: Ctx) { const { id } = await params; return api(async () => { const data = catalogSchema.parse(await req.json()); await db.catalogCategory.createMany({ data: [{ name: data.category }], skipDuplicates: true }); return db.catalogItem.update({ where: { id }, data }); }); }
export async function DELETE(_: Request, { params }: Ctx) { const { id } = await params; return api(async () => db.catalogItem.delete({ where: { id } })); }
