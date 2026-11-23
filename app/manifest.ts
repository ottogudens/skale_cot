import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SKALIO · Cotizaciones',
    short_name: 'SKALIO',
    description: 'Cotizaciones claras para equipos que quieren avanzar.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    background_color: '#102238',
    theme_color: '#102238',
    lang: 'es-CL',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
  };
}
