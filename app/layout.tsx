import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Nexo · Presupuestos técnicos', description: 'Cotizaciones para proyectos de redes, seguridad y automatización.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="es"><body>{children}</body></html>; }
