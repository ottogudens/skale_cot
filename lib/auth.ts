import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { runtimeEnv } from '@/lib/runtime-env';

const COOKIE = 'nexo_session';
function secret() {
  const value = runtimeEnv('AUTH_SECRET');
  if (!value || value.length < 32) throw new Error('AUTH_SECRET debe tener al menos 32 caracteres');
  return new TextEncoder().encode(value);
}
export async function signSession(user: { id: string; email: string; name?: string }) {
  return new SignJWT({ email: user.email, name: user.name ?? 'Administrador' }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setIssuedAt().setExpirationTime('7d').sign(secret());
}
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    if (typeof payload.email !== 'string') return null;
    return { id: payload.sub, email: payload.email, name: typeof payload.name === 'string' ? payload.name : 'Administrador' };
  } catch { return null; }
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}
export function unauthorized() {
  return NextResponse.json({ error: 'Sesión no válida. Vuelve a iniciar sesión.' }, { status: 401 });
}
export const cookieName = COOKIE;
