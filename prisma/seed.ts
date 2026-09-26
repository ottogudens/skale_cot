import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres) antes de ejecutar el seed.');
  }
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Administrador', passwordHash: await bcrypt.hash(password, 12) },
  });
  await prisma.settings.upsert({ where: { id: 'singleton' }, update: {}, create: { id: 'singleton' } });
  if (await prisma.catalogItem.count() === 0) {
    await prisma.catalogItem.createMany({ data: [
      { name: 'Cámara IP domo 4MP · PoE', description: 'Cámara para interior, lente fija, visión nocturna', category: 'Videovigilancia', price: 89500 },
      { name: 'NVR 16 canales · H.265+', description: 'Grabador de red con acceso remoto', category: 'Videovigilancia', price: 289900 },
      { name: 'Disco duro vigilancia 4TB', description: 'Disco optimizado para grabación continua', category: 'Videovigilancia', price: 119900 },
      { name: 'Switch PoE administrable 24p', description: 'Switch de acceso con alimentación PoE+', category: 'Redes', price: 359900 },
      { name: 'Punto de red Cat6 certificado', description: 'Suministro, instalación y certificación', category: 'Redes', unit: 'punto', price: 45000 },
      { name: 'Instalación y puesta en marcha', description: 'Instalación, configuración y entrega operativa', category: 'Servicios', unit: 'servicio', price: 420000 },
      { name: 'Configuración de router/firewall', description: 'Configuración y documentación de red', category: 'Redes', unit: 'servicio', price: 125000 },
      { name: 'Canalización EMT instalada', description: 'Suministro e instalación por metro lineal', category: 'Infraestructura', unit: 'm', price: 8900 },
      { name: 'Control de acceso biométrico', description: 'Terminal biométrico y configuración básica', category: 'Control de acceso', price: 189900 },
      { name: 'Automatización de portón', description: 'Automatización, sensores y configuración', category: 'Automatización', unit: 'sistema', price: 325000 },
    ] });
  }
}
main().finally(() => prisma.$disconnect());
