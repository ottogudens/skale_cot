import { db } from '@/lib/db';
import { ApiError, api } from '@/lib/http';
import { z } from 'zod';

const categorySchema = z.object({ name: z.string().trim().min(1).max(80) });

export const GET = () => api(async () => {
  const [saved, used] = await Promise.all([
    db.catalogCategory.findMany({ orderBy: { name: 'asc' } }),
    db.catalogItem.findMany({ distinct: ['category'], select: { category: true } }),
  ]);
  const categories = new Map<string, { id: string; name: string; custom: boolean }>();
  for (const category of saved) categories.set(category.name.toLocaleLowerCase('es-CL'), { id: category.id, name: category.name, custom: true });
  for (const entry of used) if (entry.category.trim() && !categories.has(entry.category.toLocaleLowerCase('es-CL'))) categories.set(entry.category.toLocaleLowerCase('es-CL'), { id: '', name: entry.category, custom: false });
  return Array.from(categories.values()).sort((a, b) => a.name.localeCompare(b.name, 'es-CL'));
});

export async function POST(req: Request) {
  return api(async () => {
    const { name } = categorySchema.parse(await req.json());
    const duplicate = await db.catalogCategory.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (duplicate) throw new ApiError('Ya existe una categoría con ese nombre.', 409);
    return db.catalogCategory.create({ data: { name } });
  }, 201);
}
