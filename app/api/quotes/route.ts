import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { api } from '@/lib/http';
import { quoteSchema } from '@/lib/validators';
export const GET = () => api(async () => { const user = await requireUser(); return db.quote.findMany({ where: { userId: user.id }, include: { client: true, items: { orderBy: { position: 'asc' } } }, orderBy: { updatedAt: 'desc' } }); });
export async function POST(req: Request) {
  return api(async () => {
    const user = await requireUser(); const data = quoteSchema.parse(await req.json());
    const year = new Date().getFullYear();
    const count = await db.quote.count({ where: { userId: user.id, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } });
    const number = `COT-${year}-${String(count + 1).padStart(4, '0')}`;
    const net = data.items.reduce((a, x) => a + x.quantity * x.unitPrice, 0); const tax = Math.round(net * data.taxRate / 100);
    return db.quote.create({ data: { number, title: data.title, status: data.status, issuedAt: data.issuedAt ? new Date(data.issuedAt) : new Date(), validUntil: data.validUntil ? new Date(data.validUntil) : null, notes: data.notes, net, taxRate: data.taxRate, tax, total: net + tax, clientId: data.clientId, userId: user.id, items: { create: data.items.map((x, position) => ({ ...x, amount: x.quantity * x.unitPrice, position })) } }, include: { client: true, items: true } });
  }, 201);
}
