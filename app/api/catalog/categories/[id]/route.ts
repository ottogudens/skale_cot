import { db } from '@/lib/db';
import { ApiError, api } from '@/lib/http';
import { z } from 'zod';

const categorySchema = z.object({ name: z.string().trim().min(1).max(80) });
const yieldToRuntime = () => new Promise<void>(resolve => setTimeout(resolve, 0));
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const [{ id }, { name }] = await Promise.all([context.params, req.json().then(body => categorySchema.parse(body))]);
    const current = await db.catalogCategory.findUnique({ where: { id } });
    await yieldToRuntime();
    if (!current) throw new ApiError('No se encontró la categoría.', 404);
    const saved = await db.catalogCategory.findMany({ select: { id: true, name: true } });
    await yieldToRuntime();
    if (saved.some(category => category.id !== id && category.name.localeCompare(name, 'es-CL', { sensitivity: 'accent' }) === 0)) throw new ApiError('Ya existe una categoría con ese nombre.', 409);
    await db.catalogItem.updateMany({ where: { category: current.name }, data: { category: name } });
    await yieldToRuntime();
    await db.serviceItem.updateMany({ where: { category: current.name }, data: { category: name } });
    await yieldToRuntime();
    return db.catalogCategory.update({ where: { id }, data: { name } });
  });
}
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const { id } = await context.params;
    const current = await db.catalogCategory.findUnique({ where: { id } });
    await yieldToRuntime();
    if (!current) throw new ApiError('No se encontró la categoría personalizada.', 404);
    await db.catalogItem.updateMany({ where: { category: current.name }, data: { category: 'Otros' } });
    await yieldToRuntime();
    await db.serviceItem.updateMany({ where: { category: current.name }, data: { category: 'Servicios técnicos' } });
    await yieldToRuntime();
    await db.catalogCategory.delete({ where: { id } });
    return { deleted: true };
  });
}
