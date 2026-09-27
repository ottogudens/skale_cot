import { db } from '@/lib/db';
import { ApiError, api } from '@/lib/http';
import { serviceSchema } from '@/lib/validators';

type Context = { params: Promise<{ id: string }> };
function withSources<T extends { marketSources: string }>(service: T) {
  let sources = [];
  try { sources = JSON.parse(service.marketSources); } catch { /* Ignore malformed legacy metadata. */ }
  return { ...service, marketSources: sources };
}
export async function PUT(req: Request, { params }: Context) {
  const { id } = await params;
  return api(async () => {
    const data = serviceSchema.parse(await req.json());
    const existing = await db.serviceItem.findUnique({ where: { id } });
    if (!existing) throw new ApiError('Servicio no encontrado.', 404);
    await db.catalogCategory.createMany({ data: [{ name: data.category }], skipDuplicates: true });
    return withSources(await db.serviceItem.update({ where: { id }, data }));
  });
}
export async function DELETE(_: Request, { params }: Context) {
  const { id } = await params;
  return api(async () => {
    const existing = await db.serviceItem.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new ApiError('Servicio no encontrado.', 404);
    return db.serviceItem.delete({ where: { id } });
  });
}
