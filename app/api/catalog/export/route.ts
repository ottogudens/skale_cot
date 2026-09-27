import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createProductWorkbook } from '@/lib/product-workbook';

export const runtime = 'nodejs';
export async function GET() {
  try {
    await requireUser();
    const items = await db.catalogItem.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    const workbook = createProductWorkbook(items.map(item => ({
      id: item.id, name: item.name, brand: item.brand, sku: item.sku, description: item.description, category: item.category, unit: item.unit,
      sourcePrice: item.sourcePrice, sourceCurrency: item.sourceCurrency, costPrice: item.costPrice, utilityMode: item.utilityMode === 'MARGIN' ? 'MARGIN' : 'MARKUP', utilityPercent: item.utilityPercent,
      price: item.price, availability: item.availability, sourceUrl: item.sourceUrl, imageUrl: item.imageUrl, sourceCheckedAt: item.sourceCheckedAt?.toISOString() ?? null, active: item.active,
    })));
    return new NextResponse(new Blob([workbook as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), {
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="respaldo-catalogo.xlsx"', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 });
    console.error(error); return NextResponse.json({ error: 'No se pudo crear el respaldo del catálogo.' }, { status: 500 });
  }
}
