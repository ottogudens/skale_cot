import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { cookieName, signSession } from '@/lib/auth';
const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(await req.json());
    const user = await db.user.findUnique({ where: { email: data.email.trim().toLowerCase() } });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 401 });
    const token = await signSession(user);
    const res = NextResponse.json({ id: user.id, email: user.email, name: user.name });
    res.cookies.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch { return NextResponse.json({ error: 'Ingresa un correo y contraseña válidos.' }, { status: 400 }); }
}
