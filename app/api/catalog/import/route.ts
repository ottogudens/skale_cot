import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Agent } from 'undici';
import { z } from 'zod';
import { ApiError, api } from '@/lib/http';

export const runtime = 'nodejs';
const requestSchema = z.object({ url: z.string().trim().url().max(2048) });
const MAX_HTML_BYTES = 1_000_000;

function publicAddress(address: string) {
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split('.').map(Number);
    const [a, b, c] = octets;
    const reserved = a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && ((b === 0 && (c === 0 || c === 2)) || b === 88 && c === 99 || b === 168))
      || (a === 198 && ((b === 18 || b === 19) || (b === 51 && c === 100)) )
      || (a === 203 && b === 0 && c === 113);
    return !reserved;
  }
  if (version === 6) {
    const value = address.toLowerCase();
    if (value.startsWith('::ffff:')) return publicAddress(value.slice(7));
    const first = Number.parseInt(value.split(':')[0] || '0', 16);
    const second = Number.parseInt(value.split(':')[1] || '0', 16);
    return first >= 0x2000 && first <= 0x3fff && !(first === 0x2001 && (second === 0x0db8 || second === 0 || second === 0x0010));
  }
  return false;
}

async function validatedAddresses(url: URL) {
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || isIP(url.hostname)) {
    throw new ApiError('Usa una URL HTTPS pública del sitio del proveedor.', 400);
  }
  let records: { address: string; family: number }[];
  try { records = await lookup(url.hostname, { all: true, verbatim: true }); }
  catch { throw new ApiError('No se pudo encontrar la dirección pública del proveedor.', 400); }
  if (!records.length || records.some(record => !publicAddress(record.address))) {
    throw new ApiError('La dirección del proveedor no es pública y no se puede consultar.', 400);
  }
  return records;
}

async function fetchPage(url: URL) {
  let current = url;
  for (let redirect = 0; redirect <= 3; redirect++) {
    const addresses = await validatedAddresses(current);
    const agent = new Agent({ connect: { lookup: (hostname, options, callback) => {
      if (hostname !== current.hostname) { callback(new Error('Hostname de conexión inesperado.'), '', 0); return; }
      if (options.all) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    } } });
    let response: Response;
    try {
      const response = await fetch(current, { dispatcher: agent, redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'NexoCatalogImporter/1.0 (+product metadata extraction)' } } as RequestInit & { dispatcher: Agent });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        await agent.close();
        if (!location || redirect === 3) throw new ApiError('El proveedor redirigió demasiadas veces.', 422);
        current = new URL(location, current);
        continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new ApiError(`El proveedor respondió con error HTTP ${response.status}.`, 422); }
      const contentType = response.headers.get('content-type') || '';
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) { await response.body?.cancel(); throw new ApiError('La dirección no entrega una página HTML de producto.', 415); }
      const declaredSize = Number(response.headers.get('content-length') || 0);
      if (declaredSize > MAX_HTML_BYTES) { await response.body?.cancel(); throw new ApiError('La página es demasiado grande para importarla.', 413); }
      if (!response.body) throw new ApiError('La página del proveedor no entregó contenido.', 422);
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_HTML_BYTES) { await reader.cancel(); throw new ApiError('La página es demasiado grande para importarla.', 413); }
        chunks.push(value);
      }
      const html = new TextDecoder().decode(Buffer.concat(chunks));
      await agent.close();
      return { html, url: current.toString() };
    } catch (error) {
      await agent.close().catch(() => undefined);
      if (error instanceof ApiError) throw error;
      throw new ApiError('No se pudo acceder a la página del proveedor. Puedes completar los datos manualmente.', 422);
    }
  }
  throw new ApiError('No se pudo seguir la redirección del proveedor.', 422);
}

function decode(value: string) {
  return value.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => { const point = code[0].toLowerCase() === 'x' ? Number.parseInt(code.slice(1), 16) : Number.parseInt(code, 10); return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ' '; })
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
}

function attributes(tag: string) {
  const result: Record<string, string> = {};
  for (const match of Array.from(tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))) result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  return result;
}

function clean(value: unknown, max = 500) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function findProduct(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) { for (const item of value) { const match = findProduct(item); if (match) return match; } return null; }
  if (!value || typeof value !== 'object') return null;
  const object = value as Record<string, unknown>;
  const types = Array.isArray(object['@type']) ? object['@type'] : [object['@type']];
  if (types.some(type => String(type).toLowerCase().split(/[\/#]/).pop() === 'product')) return object;
  for (const child of Object.values(object)) { const match = findProduct(child); if (match) return match; }
  return null;
}

function extract(html: string, sourceUrl: string) {
  const meta: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attr = attributes(tag), key = (attr.property || attr.name || attr.itemprop || '').toLowerCase();
    if (key && attr.content) meta[key] = attr.content;
  }
  let product: Record<string, unknown> | null = null;
  for (const match of Array.from(html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi))) {
    try { product = findProduct(JSON.parse(match[1].replace(/<!--|-->/g, '').trim())); if (product) break; } catch { /* Ignore malformed provider metadata and try the next block. */ }
  }
  const offerValue = product?.offers;
  const offer = Array.isArray(offerValue) ? offerValue[0] : offerValue;
  const offerObject = offer && typeof offer === 'object' ? offer as Record<string, unknown> : {};
  const rawPrice = clean(offerObject.price ?? offerObject.lowPrice ?? meta['product:price:amount'] ?? meta.price ?? '', 100);
  const currency = clean(offerObject.priceCurrency ?? meta['product:price:currency'] ?? meta.pricecurrency ?? '', 12).toUpperCase() || 'SIN ESPECIFICAR';
  const name = clean(product?.name ?? meta['og:title'] ?? meta['twitter:title'] ?? html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '', 180);
  const brandValue = product?.brand;
  const brand = typeof brandValue === 'object' && brandValue ? (brandValue as Record<string, unknown>).name : brandValue;
  const sku = clean(product?.sku ?? product?.mpn ?? '', 80);
  const details = [brand ? `Marca: ${clean(brand, 100)}` : '', sku ? `SKU/Modelo: ${sku}` : '', clean(product?.description ?? meta.description ?? meta['og:description'] ?? '', 350)].filter(Boolean);
  const description = details.join(' · ').slice(0, 500);
  const normalizedCLP = rawPrice.replace(/\s/g, '').replace(/[.,]\d{2}$/, '');
  const costCLP = currency === 'CLP' && rawPrice ? Number(normalizedCLP.replace(/[^\d]/g, '')) : null;
  return { name, description, category: 'Otros', unit: 'un', sourceUrl, sourceCurrency: currency, sourcePrice: rawPrice, costPrice: Number.isSafeInteger(costCLP) && costCLP! > 0 ? costCLP : null, priceIncludesTax: null, sourceCheckedAt: new Date().toISOString() };
}

export async function POST(req: Request) {
  return api(async () => {
    const { url: rawUrl } = requestSchema.parse(await req.json());
    const url = new URL(rawUrl);
    const { html, url: sourceUrl } = await fetchPage(url);
    const product = extract(html, sourceUrl);
    if (!product.name) throw new ApiError('No se encontró el nombre del producto. Prueba otra URL o ingrésalo manualmente.', 422);
    return product;
  });
}
