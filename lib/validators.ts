import { z } from 'zod';
import { sellingPrice } from '@/lib/pricing';
export const clientSchema = z.object({ name: z.string().trim().min(1).max(180), rut: z.string().max(30).default(''), email: z.string().max(180).default(''), phone: z.string().max(60).default(''), address: z.string().max(250).default(''), contact: z.string().max(160).default(''), notes: z.string().max(2000).default('') });
const MAX_CATALOG_PRICE = 2_000_000_000;
export const catalogSchema = z.object({
  name: z.string().trim().min(1).max(180), description: z.string().max(500).default(''), category: z.string().max(80).default('Otros'), unit: z.string().max(30).default('un'),
  price: z.coerce.number().int().min(0).max(MAX_CATALOG_PRICE), costPrice: z.coerce.number().int().min(0).max(MAX_CATALOG_PRICE).nullable().optional().default(null),
  utilityPercent: z.coerce.number().int().min(0).max(1000).default(0), utilityMode: z.enum(['MARKUP','MARGIN']).default('MARKUP'),
  sourceUrl: z.string().max(2048).default(''), sourceCurrency: z.string().max(12).default('CLP'), sourcePrice: z.string().max(100).default(''), sourceCheckedAt: z.coerce.date().nullable().optional().default(null),
  active: z.boolean().default(true),
}).superRefine((item, ctx) => {
  if (item.utilityMode === 'MARGIN' && item.utilityPercent >= 100) ctx.addIssue({ code: 'custom', path: ['utilityPercent'], message: 'El margen debe ser inferior al 100%.' });
  if (item.sourceUrl) {
    try { if (new URL(item.sourceUrl).protocol !== 'https:') ctx.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'La URL de origen debe usar HTTPS.' }); }
    catch { ctx.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'La URL de origen no es válida.' }); }
  }
  if (item.costPrice !== null) {
    const suggested = sellingPrice(item.costPrice, item.utilityPercent, item.utilityMode);
    if (!Number.isFinite(suggested) || Math.round(suggested) > MAX_CATALOG_PRICE) ctx.addIssue({ code: 'custom', path: ['utilityPercent'], message: 'El precio calculado supera el máximo permitido para el catálogo.' });
  }
}).transform(item => {
  if (item.costPrice === null) return item;
  const price = sellingPrice(item.costPrice, item.utilityPercent, item.utilityMode);
  return { ...item, price };
});
export const quoteSchema = z.object({ title: z.string().trim().min(1).max(180), clientId: z.string().min(1), status: z.enum(['BORRADOR','ENVIADA','ACEPTADA','RECHAZADA','VENCIDA']).default('BORRADOR'), issuedAt: z.string().optional(), validUntil: z.string().optional(), notes: z.string().max(5000).default(''), taxRate: z.coerce.number().int().min(0).max(100).default(19), items: z.array(z.object({ name: z.string().trim().min(1).max(180), description: z.string().max(500).default(''), quantity: z.coerce.number().int().min(1).max(100000), unit: z.string().max(30).default('un'), unitPrice: z.coerce.number().int().min(0).max(2_000_000_000) })).min(1) });
export const settingsSchema = z.object({ companyName: z.string().trim().min(1).max(180), companyTagline: z.string().max(180).default(''), rut: z.string().max(30).default(''), email: z.string().max(180).default(''), phone: z.string().max(60).default(''), address: z.string().max(250).default(''), website: z.string().max(180).default(''), logoData: z.string().max(1_500_000).default(''), defaultTaxRate: z.coerce.number().int().min(0).max(100), defaultValidity: z.coerce.number().int().min(1).max(365), terms: z.string().max(5000).default('') });
