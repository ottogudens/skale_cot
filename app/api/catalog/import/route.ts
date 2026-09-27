import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Agent } from 'undici';
import * as cheerio from 'cheerio';
import { z } from 'zod';
import { ApiError, api } from '@/lib/http';

export const runtime = 'nodejs';
const requestSchema = z.object({ url: z.string().trim().url().max(2048) });
const MAX_HTML_BYTES = 1_000_000;
const MAX_PRODUCTS = 500;

function publicAddress(address: string) {
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split('.').map(Number); const [a, b, c] = octets;
    const reserved = a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && ((b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99) || b === 168)) || (a === 198 && (b === 18 || b === 19 || c === 51 && octets[3] === 100)) || (a === 203 && b === 0 && c === 113);
    return !reserved;
  }
  if (version === 6) {
    const value = address.toLowerCase(); if (value.startsWith('::ffff:')) return publicAddress(value.slice(7));
    const first = Number.parseInt(value.split(':')[0] || '0', 16), second = Number.parseInt(value.split(':')[1] || '0', 16);
    return first >= 0x2000 && first <= 0x3fff && !(first === 0x2001 && (second === 0x0db8 || second === 0 || second === 0x0010));
  }
  return false;
}

async function validatedAddresses(url: URL) {
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || isIP(url.hostname)) throw new ApiError('Usa una URL HTTPS pública del sitio del proveedor.', 400);
  let records: { address: string; family: number }[];
  try { records = await lookup(url.hostname, { all: true, verbatim: true }); } catch { throw new ApiError('No se pudo encontrar la dirección pública del proveedor.', 400); }
  if (!records.length || records.some(record => !publicAddress(record.address))) throw new ApiError('La dirección del proveedor no es pública y no se puede consultar.', 400);
  return records;
}

async function fetchPage(url: URL) {
  let current = url;
  for (let redirect = 0; redirect <= 3; redirect++) {
    const addresses = await validatedAddresses(current);
    const agent = new Agent({ connect: { lookup: (hostname, options, callback) => {
      if (hostname !== current.hostname) { callback(new Error('Hostname de conexión inesperado.'), '', 0); return; }
      if (options.all) callback(null, addresses); else callback(null, addresses[0].address, addresses[0].family);
    } } });
    try {
      const response = await fetch(current, { dispatcher: agent, redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'NexoCatalogImporter/1.0 (+product metadata extraction)' } } as RequestInit & { dispatcher: Agent });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location'); await response.body?.cancel(); await agent.close();
        if (!location || redirect === 3) throw new ApiError('El proveedor redirigió demasiadas veces.', 422);
        current = new URL(location, current); continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new ApiError(`El proveedor respondió con error HTTP ${response.status}.`, 422); }
      if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') || '')) { await response.body?.cancel(); throw new ApiError('La dirección no entrega una página HTML de producto.', 415); }
      if (Number(response.headers.get('content-length') || 0) > MAX_HTML_BYTES) { await response.body?.cancel(); throw new ApiError('La página es demasiado grande para importarla.', 413); }
      if (!response.body) throw new ApiError('La página del proveedor no entregó contenido.', 422);
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let total = 0;
      while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > MAX_HTML_BYTES) { await reader.cancel(); throw new ApiError('La página es demasiado grande para importarla.', 413); } chunks.push(value); }
      const html = new TextDecoder().decode(Buffer.concat(chunks)); await agent.close(); return { html, url: current.toString() };
    } catch (error) { await agent.close().catch(() => undefined); if (error instanceof ApiError) throw error; throw new ApiError('No se pudo acceder a la página del proveedor. Puedes completar los datos manualmente.', 422); }
  }
  throw new ApiError('No se pudo seguir la redirección del proveedor.', 422);
}

const clean = (value: unknown, max = 500) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const asObject = (value: unknown): Record<string, any> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null;
const values = (value: unknown): unknown[] => Array.isArray(value) ? value : value == null ? [] : [value];
const schemaType = (value: unknown, type: string) => values(value).some(entry => String(entry).toLowerCase().split(/[\/#]/).pop() === type.toLowerCase());
const urlOf = (value: unknown, base: string) => { const candidate = typeof value === 'string' ? value : asObject(value)?.url ?? asObject(value)?.['@id']; try { if (!candidate) return ''; const parsed = new URL(String(candidate), base); return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.toString() : ''; } catch { return ''; } };

function productFromObject(item: Record<string, any>, sourceUrl: string, fallback: Record<string, string> = {}) {
  const offer = asObject(values(item.offers)[0]) || {};
  const brandValue = item.brand, brand = typeof brandValue === 'object' ? asObject(brandValue)?.name : brandValue;
  const rawPrice = clean(offer.price ?? offer.lowPrice ?? item.price ?? fallback.price ?? '', 100);
  const currency = clean(offer.priceCurrency ?? fallback.currency ?? '', 12).toUpperCase() || 'SIN ESPECIFICAR';
  const normalized = rawPrice.replace(/\s/g, '').replace(/[.,]\d{2}$/, '');
  const cost = currency === 'CLP' && rawPrice ? Number(normalized.replace(/[^\d]/g, '')) : null;
  const availability = clean(asObject(offer.availability)?.['@id'] ?? offer.availability ?? '', 80).split('/').pop() || '';
  const image = urlOf(values(item.image)[0], sourceUrl);
  const descriptions = [clean(item.description ?? '', 350)].filter(Boolean);
  return {
    name: clean(item.name ?? fallback.name ?? '', 180), brand: clean(brand ?? '', 120), sku: clean(item.sku ?? item.mpn ?? item.productID ?? '', 100),
    description: descriptions.join(' · '), category: clean(item.category ?? 'Otros', 80), unit: 'un', costPrice: Number.isSafeInteger(cost) && cost! > 0 ? cost : null,
    sourceUrl: urlOf(item.url ?? item['@id'], sourceUrl) || sourceUrl, sourceCurrency: currency, sourcePrice: rawPrice,
    sourceCheckedAt: new Date().toISOString(), availability, imageUrl: image,
  };
}

function extract(html: string, pageUrl: string) {
  const $ = cheerio.load(html);
  const meta: Record<string, string> = {};
  $('meta').each((_, element) => { const node = $(element), key = clean(node.attr('property') ?? node.attr('name') ?? node.attr('itemprop') ?? '', 100).toLowerCase(), content = clean(node.attr('content'), 500); if (key && content) meta[key] = content; });
  const candidates: ReturnType<typeof productFromObject>[] = [];
  const seenObjects = new Set<object>();
  function walk(value: unknown) {
    if (Array.isArray(value)) { value.forEach(walk); return; }
    const object = asObject(value); if (!object || seenObjects.has(object)) return; seenObjects.add(object);
    if (schemaType(object['@type'], 'Product')) candidates.push(productFromObject(object, pageUrl, { price: meta['product:price:amount'], currency: meta['product:price:currency'] }));
    for (const child of Object.values(object)) walk(child);
  }
  $('script[type="application/ld+json"]').each((_, script) => { try { walk(JSON.parse($(script).contents().text().replace(/<!--|-->/g, '').trim())); } catch { /* Ignore invalid structured metadata. */ } });

  $('[itemtype]').each((_, element) => {
    const node = $(element); if (!/schema\.org\/Product/i.test(node.attr('itemtype') || '')) return;
    const read = (prop: string) => node.find(`[itemprop="${prop}"]`).first();
    const priceNode = read('price'), currencyNode = read('priceCurrency');
    const object = { '@type': 'Product', name: read('name').attr('content') || read('name').text() || node.find('h1').first().text(), description: read('description').attr('content') || read('description').text(), sku: read('sku').attr('content') || read('sku').text(), brand: { name: read('brand').attr('content') || read('brand').text() }, url: read('url').attr('href') || node.find('a').first().attr('href'), image: read('image').attr('src') || read('image').attr('content'), offers: { price: priceNode.attr('content') || priceNode.text(), priceCurrency: currencyNode.attr('content') || currencyNode.text() } };
    candidates.push(productFromObject(object, pageUrl));
  });

  if (!candidates.length) {
    const selectors = '[class*="product-card"], [class*="product-item"], [class*="product-tile"], [class*="product_box"], [data-product-id], li.product, .product';
    $(selectors).each((_, element) => {
      const card = $(element); if (card.parents(selectors).length) return;
      const link = card.find('a[href]').filter((__, a) => !!$(a).text().trim() || !!$(a).find('img').length).first();
      const name = card.find('[itemprop="name"], .product-name, .product-title, [class*="product-name"], [class*="product-title"], h2, h3').first().text().trim() || link.text().trim() || link.find('img').attr('alt') || '';
      if (!name) return;
      const priceText = card.find('[itemprop="price"], [class*="price"]').first().attr('content') || card.find('[itemprop="price"], [class*="price"]').first().text().trim();
      const raw = clean(priceText, 100), digits = raw.replace(/[^\d]/g, '');
      const currency = /CLP|\$|CL\$/i.test(raw) || /CLP/i.test(meta['product:price:currency'] || '') ? 'CLP' : 'SIN ESPECIFICAR';
      const costPrice = currency === 'CLP' && digits ? Number(digits) : null;
      const imageSrc = card.find('img').first().attr('src') || card.find('img').first().attr('data-src') || '';
      const productUrl = urlOf(link.attr('href'), pageUrl);
      candidates.push({ name: clean(name, 180), brand: '', sku: clean(card.attr('data-product-id') || '', 100), description: clean(card.find('[class*="description"]').first().text(), 350), category: 'Otros', unit: 'un', costPrice: Number.isSafeInteger(costPrice) && costPrice! > 0 ? costPrice : null, sourceUrl: productUrl || pageUrl, sourceCurrency: currency, sourcePrice: raw, sourceCheckedAt: new Date().toISOString(), availability: /agotado|sin stock|out of stock/i.test(card.text()) ? 'OutOfStock' : '', imageUrl: urlOf(imageSrc, pageUrl) });
    });
  }
  if (!candidates.length) {
    const fallback = productFromObject({ '@type': 'Product', name: meta['og:title'] || meta['twitter:title'] || $('title').first().text(), description: meta.description || meta['og:description'], image: meta['og:image'], url: meta['og:url'] }, pageUrl, { price: meta['product:price:amount'], currency: meta['product:price:currency'] });
    if (fallback.name) candidates.push(fallback);
  }
  const unique = new Map<string, typeof candidates[number]>();
  for (const item of candidates) {
    if (!item.name) continue;
    const key = `${item.sourceUrl.toLowerCase()}|${item.sku.toLowerCase()}|${item.name.toLowerCase()}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  const list = Array.from(unique.values());
  return { products: list.slice(0, MAX_PRODUCTS), totalDetected: list.length, truncated: list.length > MAX_PRODUCTS };
}

export async function POST(req: Request) {
  return api(async () => {
    const { url: rawUrl } = requestSchema.parse(await req.json());
    const { html, url } = await fetchPage(new URL(rawUrl));
    const result = extract(html, url);
    if (!result.products.length) throw new ApiError('No se encontraron productos. Prueba una página de producto o completa los datos manualmente.', 422);
    return { sourceUrl: url, ...result };
  });
}
