import { db } from '@/lib/db';
import { api, ApiError } from '@/lib/http';
import { clientSchema } from '@/lib/validators';
type Ctx = { params: Promise<{ id: string }> };
export async function PUT(req: Request, { params }: Ctx) { const { id } = await params; return api(async () => db.client.update({ where: { id }, data: clientSchema.parse(await req.json()) })); }
export async function DELETE(_: Request, { params }: Ctx) { const { id } = await params; return api(async () => { if (await db.quote.count({ where: { clientId: id } })) throw new ApiError('No se puede eliminar: el cliente tiene cotizaciones asociadas.'); return db.client.delete({ where: { id } }); }); }
