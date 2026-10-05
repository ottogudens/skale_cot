import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'SKALIO · Cotiza y avanza', description: 'Cotizaciones claras para equipos que quieren avanzar.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="es"><body>{children}</body></html>; }
