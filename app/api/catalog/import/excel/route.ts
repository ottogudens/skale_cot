import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireUser } from '@/lib/auth';
import { createProductWorkbook, type WorkbookProduct } from '@/lib/product-workbook';
import { sellingPrice } from '@/lib/pricing';

export const runtime = 'nodejs';
const row = z.object({
  name: z.string().trim().min(1).max(180), brand: z.string().max(120), sku: z.string().max(100), description: z.string().max(500), category: z.string().max(80), unit: z.string().max(30),
  sourcePrice: z.string().max(100), sourceCurrency: z.string().max(12), costPrice: z.number().int().min(0).max(2_000_000_000).nullable(), utilityMode: z.enum(['MARKUP','MARGIN']), utilityPercent: z.number().int().min(0).max(1000),
  availability: z.string().max(80), sourceUrl: z.string().max(2048), imageUrl: z.string().max(2048), sourceCheckedAt: z.string().nullable(),
});
export async function POST(req: Request) {
  try {
    await requireUser();
    const parsed = z.object({ products: z.array(row).min(1).max(500) }).parse(await req.json());
    const products: WorkbookProduct[] = parsed.products.map(product => ({ ...product, price: product.costPrice === null ? 0 : sellingPrice(product.costPrice, product.utilityPercent, product.utilityMode) }));
    const bytes = createProductWorkbook(products);
    return new NextResponse(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), {
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="productos-proveedor.xlsx"', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? 'Datos no válidos.' }, { status: 400 });
    console.error(error); return NextResponse.json({ error: 'No se pudo generar el archivo Excel.' }, { status: 500 });
  }
}
