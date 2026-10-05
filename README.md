# SKALIO · Cotizaciones que avanzan

Aplicación web para crear presupuestos de proyectos de redes, videovigilancia, control de acceso y automatización. Interfaz en español, valores en pesos chilenos, IVA configurable, PDF imprimible tamaño A4 y persistencia en PostgreSQL.

## Funciones

- Acceso protegido por usuario y contraseña (contraseña almacenada con hash bcrypt y sesión en cookie HttpOnly).
- Panel con métricas y actividad reciente.
- Cotizaciones: crear, editar, buscar, filtrar por estado, eliminar y guardar/imprimir como PDF.
- Ítems con cantidad, unidad, descripción, precio unitario, neto, IVA y total.
- Clientes y catálogo reutilizable de equipos y servicios.
- Configuración del nombre comercial, datos de empresa, logo, IVA, validez predeterminada y términos.
- Asistente de terreno con dictado en español, borrador conversacional de cotización, propuestas de clientes y equipos/servicios, y confirmación antes de guardar.
- Importación de productos desde páginas públicas HTTPS, con conservación de la fuente, costo neto CLP y cálculo de precio mediante recargo o margen.
- PostgreSQL con Prisma y migración versionada.

## Requisitos

- Node.js 20.9 o posterior (Next.js 16 requiere Node 20.9+; el proyecto recomienda Node 22 LTS).
- Una base PostgreSQL. Railway puede alojarla.
- Una cuenta GitHub y un proyecto Vercel para el despliegue.

## Ejecutar localmente

1. Duplica `.env.example` como `.env` y completa `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Para el asistente, añade una clave de OpenAI en `OPENAI_API_KEY`. Usa una contraseña de al menos 12 caracteres y un secreto aleatorio largo para `AUTH_SECRET`.
2. Instala dependencias y prepara la base:

   ```bash
   npm install
   npx prisma migrate deploy
   npm run db:seed
   npm run dev
   ```

3. Abre `http://localhost:3000` e inicia sesión con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

`npm run db:seed` crea el administrador inicial, la configuración de empresa y un catálogo de ejemplo. Es idempotente: no reemplaza la contraseña de un usuario existente ni duplica los ítems si el catálogo ya está poblado. Cambia la marca, logo, datos de empresa y catálogo de ejemplo desde la aplicación.

## Desplegar PostgreSQL en Railway y la app en Vercel

### 1. Subir el repositorio a GitHub

Sube el contenido de esta carpeta como raíz del repositorio. No incluyas `.env` ni pegues secretos en Git. El archivo `.gitignore` ya excluye variables y dependencias.

### 2. Crear la base PostgreSQL en Railway

1. En Railway, crea un proyecto y añade el plugin **PostgreSQL**.
2. Abre las variables del servicio PostgreSQL y copia `DATABASE_PUBLIC_URL` (o la URL pública que Railway muestre para conexiones externas). La aplicación alojada en Vercel necesita una dirección accesible desde fuera de Railway. Conserva `sslmode=require` si está presente; si no, añádelo a la URL. Opcionalmente limita conexiones con `?connection_limit=5`.
3. Ejecuta la migración y el seed contra esa base desde un terminal en esta carpeta:

   ```bash
   DATABASE_URL='URL_PUBLICA_DE_RAILWAY' npx prisma migrate deploy
   DATABASE_URL='URL_PUBLICA_DE_RAILWAY' ADMIN_EMAIL='tu-correo@empresa.cl' ADMIN_PASSWORD='una-clave-larga-de-12-caracteres-o-mas' npx tsx prisma/seed.ts
   ```

   Usa una contraseña única y guarda la URL y la contraseña en un gestor seguro. Las comillas simples evitan que caracteres especiales se interpreten en el terminal.

### 3. Desplegar en Vercel

1. Importa el repositorio desde GitHub en Vercel.
2. Si este proyecto está dentro de otro repositorio, establece **Root Directory** en `outputs/nexo-presupuestos`; si subiste esta carpeta como raíz, déjalo en `./`.
3. Añade estas variables en **Project → Settings → Environment Variables** para Production (y Preview si quieres entornos de prueba separados):

   - `DATABASE_URL`: URL pública de Railway con `sslmode=require` y, para cargas pequeñas, `connection_limit=5`.
   - `AUTH_SECRET`: una cadena aleatoria de al menos 32 caracteres. Puedes generar una con `openssl rand -base64 48`.
   - `OPENAI_API_KEY`: clave secreta de OpenAI API (requerida para el asistente de terreno).

4. Despliega. `vercel.json` hace que cada build aplique primero las migraciones (`prisma migrate deploy`) y luego compile Next.js.
5. Abre el dominio de Vercel e inicia sesión con el usuario creado en el paso del seed.

Vercel no necesita `ADMIN_EMAIL` ni `ADMIN_PASSWORD` en runtime; solo se usan al crear el usuario inicial mediante seed. No pongas esas credenciales en variables Preview conectadas a la base de producción.

El asistente envía a OpenAI el texto de la conversación y los datos de clientes/catálogo necesarios para preparar sugerencias. La aplicación no guarda cambios por el agente sin confirmación explícita. El dictado usa el reconocimiento de voz disponible en navegadores compatibles; el navegador solicitará permiso de micrófono.

Desde **Catálogo → Importar desde proveedor**, pega la URL pública de un producto o de un listado/categoría. La app extrae productos de JSON-LD, microdatos y tarjetas HTML, permite corregir y seleccionar filas, y descarga un Excel `.xlsx` con los datos y su fuente. También puedes aplicar una regla común de recargo o margen e importar los productos seleccionados al catálogo en un solo paso. Antes de guardar, revisa los costos netos CLP y el tratamiento de IVA; el sistema no asume conversiones de moneda ni considera automáticamente el precio publicado como costo neto. Los duplicados detectados por URL, SKU y nombre se omiten. La importación admite hasta 500 productos por página y conserva la fuente, imagen y disponibilidad cuando la página los publica. No ejecuta JavaScript, inicia sesión en proveedores ni sortea protecciones; los catálogos que solo aparecen tras ejecutar código en el navegador pueden requerir carga manual.

En **Catálogo** puedes alternar entre vista de lista y tarjetas, buscar por nombre/marca/SKU/descripción, filtrar por categoría y ordenar por nombre, categoría o precio. En **Categorías** puedes crear categorías personalizadas y cambiar sus nombres; al renombrar, los productos asociados se actualizan. **Respaldo Excel** descarga el catálogo completo con sus costos, utilidad, precios, procedencia y estado. **Importar Excel** acepta `.xlsx` con la planilla de respaldo o encabezados equivalentes; valida todas las filas antes de guardar y omite duplicados existentes. La migración añade el almacenamiento persistente de categorías en PostgreSQL.

El menú **Servicios** mantiene un catálogo separado para mano de obra y servicios técnicos, con crear/editar/eliminar, alcance, condiciones, unidad, precio y estado. La opción **Investigar con IA** usa OpenAI `gpt-4o-mini` con búsqueda web en vivo y devuelve un rango, precio sugerido, condiciones y enlaces de referencia para revisión; es una sugerencia, no una tasación garantizada. La migración añade diez ejemplos iniciales de redes, CCTV, Wi-Fi, racks, control de acceso y soporte. Sus precios son CLP netos de equipos; algunos tienen referencias públicas y los demás se deben revisar para la zona y complejidad del trabajo.

El tratamiento de IVA se configura por servicio y línea de cotización. Los servicios se crean afectos por defecto y se puede marcar “Exento/no afecto” si la operación califica. Desde 2023 el SII indica que los servicios están gravados como regla general, salvo que aplique una exención legal; la mano de obra por sí sola no determina la exención.

## Operación y copias de seguridad

- Toma copias de seguridad desde Railway antes de cambios importantes de esquema y configura su política de backups según tu plan.
- Para cambios futuros de Prisma, crea una migración con `npx prisma migrate dev --name descripcion` contra una base local de desarrollo y versiona `prisma/migrations/`. En producción se aplicará con el siguiente despliegue.
- Para que Vercel Preview no modifique producción, crea otra base de Railway para Preview.
- La descarga PDF utiliza el diálogo de impresión del navegador: selecciona **Guardar como PDF**. En móvil, puede depender de las opciones de impresión/compartir del sistema.

## Estructura

```text
app/                 Interfaz Next.js y API routes
lib/                 Prisma, autenticación, validación y respuestas API
prisma/schema.prisma Modelo PostgreSQL
prisma/migrations/   Migraciones versionadas
prisma/seed.ts       Administrador inicial y catálogo de ejemplo
```

## Alcance de acceso

Esta primera versión tiene un administrador inicial y datos compartidos para el negocio. No incluye registro público, invitaciones multiusuario, recuperación por correo ni integración de firma electrónica, pagos o envío automático de emails.
