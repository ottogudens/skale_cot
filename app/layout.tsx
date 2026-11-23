import type { Metadata } from 'next';
import './globals.css';
import './tech-dock.css';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: 'SKALIO · Cotiza y avanza',
  description: 'Cotizaciones claras para equipos que quieren avanzar.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'SKALIO' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body><PwaRegister />{children}</body></html>;
}
