import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { api, ApiError } from '@/lib/http';
import { quoteSchema } from '@/lib/validators';
type Ctx = { params: Promise<{ id: string }> };
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  return api(async () => {
    const user = await requireUser(); const data = quoteSchema.parse(await req.json());
    const existing = await db.quote.findFirst({ where: { id, userId: user.id } }); if (!existing) throw new ApiError('Cotización no encontrada.', 404);
    const net = data.items.reduce((a, x) => a + x.quantity * x.unitPrice, 0); const taxableNet = data.items.reduce((a, x) => a + (x.taxExempt ? 0 : x.quantity * x.unitPrice), 0); const tax = Math.round(taxableNet * data.taxRate / 100);
    return db.quote.update({ where: { id }, data: { title: data.title, status: data.status, issuedAt: data.issuedAt ? new Date(data.issuedAt) : existing.issuedAt, validUntil: data.validUntil ? new Date(data.validUntil) : null, notes: data.notes, net, taxRate: data.taxRate, tax, total: net + tax, clientId: data.clientId, items: { deleteMany: {}, create: data.items.map((x, position) => ({ ...x, amount: x.quantity * x.unitPrice, position })) } }, include: { client: true, items: true } });
  });
}
export async function DELETE(_: Request, { params }: Ctx) { const { id } = await params; return api(async () => { const user = await requireUser(); return db.quote.delete({ where: { id, userId: user.id } }); }); }
