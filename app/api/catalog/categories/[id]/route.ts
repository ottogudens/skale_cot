import { db } from '@/lib/db';
import { ApiError, api } from '@/lib/http';
import { z } from 'zod';

const categorySchema = z.object({ name: z.string().trim().min(1).max(80) });
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const [{ id }, { name }] = await Promise.all([context.params, req.json().then(body => categorySchema.parse(body))]);
    const current = await db.catalogCategory.findUnique({ where: { id } });
    if (!current) throw new ApiError('No se encontró la categoría.', 404);
    const duplicate = await db.catalogCategory.findFirst({ where: { id: { not: id }, name: { equals: name, mode: 'insensitive' } } });
    if (duplicate) throw new ApiError('Ya existe una categoría con ese nombre.', 409);
    return db.$transaction(async transaction => {
      await transaction.catalogItem.updateMany({ where: { category: current.name }, data: { category: name } });
      return transaction.catalogCategory.update({ where: { id }, data: { name } });
    });
  });
}
