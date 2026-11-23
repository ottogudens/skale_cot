import { db } from '@/lib/db';
import { ApiError, api } from '@/lib/http';
import { z } from 'zod';

const categorySchema = z.object({ name: z.string().trim().min(1).max(80) });
const yieldToRuntime = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export const GET = () => api(async () => {
  const [saved, usedProducts, usedServices] = await Promise.all([
    db.catalogCategory.findMany({ orderBy: { name: 'asc' } }),
    db.catalogItem.findMany({ distinct: ['category'], select: { category: true } }),
    db.serviceItem.findMany({ distinct: ['category'], select: { category: true } }),
  ]);
  const categories = new Map<string, { id: string; name: string; custom: boolean }>();
  for (const category of saved) categories.set(category.name.toLocaleLowerCase('es-CL'), { id: category.id, name: category.name, custom: true });
  for (const entry of [...usedProducts, ...usedServices]) if (entry.category.trim() && !categories.has(entry.category.toLocaleLowerCase('es-CL'))) categories.set(entry.category.toLocaleLowerCase('es-CL'), { id: '', name: entry.category, custom: false });
  return Array.from(categories.values()).sort((a, b) => a.name.localeCompare(b.name, 'es-CL'));
});

export async function POST(req: Request) {
  return api(async () => {
    const { name } = categorySchema.parse(await req.json());
    const saved = await db.catalogCategory.findMany({ select: { id: true, name: true } });
    await yieldToRuntime();
    if (saved.some(category => category.name.localeCompare(name, 'es-CL', { sensitivity: 'accent' }) === 0)) throw new ApiError('Ya existe una categoría con ese nombre.', 409);
    const created = await db.catalogCategory.create({ data: { id: crypto.randomUUID(), name } });
    await yieldToRuntime();
    const persisted = await db.catalogCategory.findUnique({ where: { id: created.id } });
    await yieldToRuntime();
    if (!persisted) throw new ApiError('La categoría no se pudo confirmar en la base de datos.', 500);
    return persisted;
  }, 201);
}
