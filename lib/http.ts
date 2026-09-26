import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireUser } from '@/lib/auth';
export class ApiError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function api<T>(work: () => Promise<T>, status = 200) {
  try { await requireUser(); return NextResponse.json(await work(), { status }); }
  catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 });
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? 'Datos no válidos.' }, { status: 400 });
    console.error(e); return NextResponse.json({ error: 'No se pudo completar la operación.' }, { status: 500 });
  }
}
