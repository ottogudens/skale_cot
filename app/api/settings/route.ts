import { db } from '@/lib/db';
import { api } from '@/lib/http';
import { settingsSchema } from '@/lib/validators';
export const GET = () => api(() => db.settings.upsert({ where: { id: 'singleton' }, update: {}, create: { id: 'singleton' } }));
export async function PUT(req: Request) { return api(async () => { const data = settingsSchema.parse(await req.json()); return db.settings.upsert({ where: { id: 'singleton' }, update: data, create: { id: 'singleton', ...data } }); }); }
