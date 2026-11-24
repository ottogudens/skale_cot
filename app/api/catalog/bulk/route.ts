import { db } from '@/lib/db';
import { api, ApiError } from '@/lib/http';
import { clpPriceFromText, netPriceFromGross, sellingPrice } from '@/lib/pricing';
import { z } from 'zod';

const ids = z.array(z.string().min(1)).min(1).max(500);
const updateSchema = z.object({
  ids,
  category: z.string().trim().min(1).max(80).optional(),
  unit: z.string().trim().min(1).max(30).optional(),
  availability: z.string().max(80).optional(),
  active: z.boolean().optional(),
  price: z.coerce.number().int().min(0).max(2_000_000_000).optional(),
  sourcePriceTaxType: z.enum(['NET', 'GROSS']).optional(),
}).refine(data => Object.keys(data).some(key => key !== 'ids'), { message: 'Indica al menos un cambio para aplicar.' });

export async function PATCH(req: Request) {
  return api(async () => {
    const data = updateSchema.parse(await req.json());
    if (data.category) {
      const exists = await db.catalogCategory.findFirst({ where: { name: data.category } });
      if (!exists) await db.catalogCategory.create({ data: { id: crypto.randomUUID(), name: data.category } });
    }
    const items = await db.catalogItem.findMany({ where: { id: { in: data.ids } } });
    if (!items.length) throw new ApiError('No se encontraron productos para actualizar.', 404);
    for (const item of items) {
      const patch: Record<string, unknown> = {};
      if (data.category !== undefined) patch.category = data.category;
      if (data.unit !== undefined) patch.unit = data.unit;
      if (data.availability !== undefined) patch.availability = data.availability;
      if (data.active !== undefined) patch.active = data.active;
      if (data.price !== undefined) patch.price = data.price;
      if (data.sourcePriceTaxType !== undefined) {
        patch.sourcePriceTaxType = data.sourcePriceTaxType;
        const published = item.sourceCurrency.toUpperCase() === 'CLP' ? clpPriceFromText(item.sourcePrice) : null;
        if (published !== null) {
          const costPrice = data.sourcePriceTaxType === 'GROSS' ? netPriceFromGross(published) : published;
          patch.costPrice = costPrice;
          patch.price = sellingPrice(costPrice, item.utilityPercent, item.utilityMode);
        }
      }
      await db.catalogItem.update({ where: { id: item.id }, data: patch });
    }
    return { updated: items.length };
  });
}

export async function DELETE(req: Request) {
  return api(async () => {
    const { ids: selectedIds } = z.object({ ids }).parse(await req.json());
    const result = await db.catalogItem.deleteMany({ where: { id: { in: selectedIds } } });
    return { deleted: result.count };
  });
}
