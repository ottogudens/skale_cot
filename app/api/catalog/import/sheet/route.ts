import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { catalogSchema } from '@/lib/validators';
import { parseProductWorkbook } from '@/lib/product-workbook';

export const runtime = 'nodejs';
const MAX_UPLOAD_BYTES = 10_000_000;

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const parsed = Number(raw.replace(/[^\d-]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : Number.NaN;
}

function importedBoolean(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return !['false', 'no', '0', 'inactivo', 'archivado'].includes(normalized);
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Selecciona una planilla Excel .xlsx.' }, { status: 400 });
    if (!file.name.toLowerCase().endsWith('.xlsx')) return NextResponse.json({ error: 'El archivo debe estar en formato .xlsx.' }, { status: 415 });
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'El archivo está vacío o supera el límite de 10 MB.' }, { status: 413 });
    const rows = parseProductWorkbook(new Uint8Array(await file.arrayBuffer()));
    const products = rows.map(({ row, product }) => {
      const costPrice = product.costPrice === undefined || product.costPrice === null || String(product.costPrice).trim() === '' ? null : numberValue(product.costPrice, Number.NaN);
      const utilityMode = String(product.utilityMode ?? '').toUpperCase().includes('MARGIN') || String(product.utilityMode ?? '').toLowerCase().includes('margen') ? 'MARGIN' : 'MARKUP';
      const utilityPercent = numberValue(product.utilityPercent, 0);
      const price = numberValue(product.price, 0);
      const sourceCheckedAt = product.sourceCheckedAt ? new Date(String(product.sourceCheckedAt)) : null;
      const parsed = catalogSchema.safeParse({
        name: product.name, brand: product.brand ?? '', sku: product.sku ?? '', description: product.description ?? '', category: product.category ?? 'Otros', unit: product.unit ?? 'un',
        costPrice, price, utilityPercent, utilityMode, sourceUrl: product.sourceUrl ?? '', sourceCurrency: product.sourceCurrency ?? 'CLP', sourcePrice: product.sourcePrice ?? '',
        sourceCheckedAt: sourceCheckedAt && Number.isFinite(sourceCheckedAt.getTime()) ? sourceCheckedAt : null,
        availability: product.availability ?? '', imageUrl: product.imageUrl ?? '', active: product.active === undefined ? true : importedBoolean(product.active),
      });
      if (!parsed.success) throw new Error(`Fila ${row}: ${parsed.error.issues[0]?.message ?? 'datos no válidos.'}`);
      return parsed.data;
    });
    const existing = await db.catalogItem.findMany({ select: { name: true, sku: true, sourceUrl: true } });
    const known = new Set(existing.map(item => `${item.sourceUrl.toLowerCase()}|${item.sku.toLowerCase()}|${item.name.toLowerCase()}`));
    const uniqueProducts = products.filter(product => {
      const key = `${product.sourceUrl.toLowerCase()}|${product.sku.toLowerCase()}|${product.name.toLowerCase()}`;
      if (known.has(key)) return false;
      known.add(key); return true;
    });
    if (uniqueProducts.length) await db.$transaction(async transaction => {
      const names = Array.from(new Set(uniqueProducts.map(product => product.category.trim()).filter(Boolean)));
      if (names.length) await transaction.catalogCategory.createMany({ data: names.map(name => ({ name })), skipDuplicates: true });
      await transaction.catalogItem.createMany({ data: uniqueProducts });
    });
    return NextResponse.json({ imported: uniqueProducts.length, skipped: products.length - uniqueProducts.length, total: products.length });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 });
    if (error instanceof Error && /Fila \d+:/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Error && !error.message.includes('Invalid') && !error.message.includes('buffer')) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error(error); return NextResponse.json({ error: 'No se pudo leer la planilla Excel. Descarga la plantilla de respaldo e inténtalo nuevamente.' }, { status: 400 });
  }
}
