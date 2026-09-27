import { openai } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { ApiError, api } from '@/lib/http';

const requestSchema = z.object({ name: z.string().trim().min(3).max(180), category: z.string().max(80).default('Servicios técnicos'), details: z.string().max(1200).default('') });
const researchOutput = z.object({
  name: z.string().max(180), description: z.string().max(1000), scope: z.string().max(3000), conditions: z.string().max(3000), category: z.string().max(80), unit: z.string().max(30),
  recommendedPrice: z.number().int().nonnegative(), minPrice: z.number().int().nonnegative(), maxPrice: z.number().int().nonnegative(), rationale: z.string().max(3000),
});

export async function POST(req: Request) {
  return api(async () => {
    if (!process.env.OPENAI_API_KEY) throw new ApiError('Falta configurar OPENAI_API_KEY en el servidor.', 503);
    const { name, category, details } = requestSchema.parse(await req.json());
    const result = await generateText({
      model: openai.responses('gpt-4o-mini'),
      maxOutputTokens: 1600,
      output: Output.object({ schema: researchOutput }),
      tools: { web_search: openai.tools.webSearch({ searchContextSize: 'high', userLocation: { type: 'approximate', country: 'CL', city: 'Santiago', region: 'Región Metropolitana' } }) },
      toolChoice: { type: 'tool', toolName: 'web_search' },
      system: 'Eres analista de precios de servicios técnicos para una empresa chilena de redes y telecomunicaciones. Busca precios vigentes en Chile usando búsqueda web en vivo. Revisa al menos dos referencias si existen. Separa estrictamente mano de obra de venta de equipos/materiales; usa CLP neto antes de IVA. No inventes precios ni referencias: si no encuentras tarifas públicas, propone un rango de estimación y dilo en rationale. Recomienda una unidad que se pueda cotizar y describe alcance, exclusiones, dependencias y condiciones de visita/garantía en español claro. Las URLs se adjuntan por separado desde los resultados reales de búsqueda. No determines exenciones tributarias; el usuario las revisará según su contribuyente y operación.',
      prompt: `Investiga precio de mercado actual en Chile para este servicio técnico. Nombre: ${name}. Categoría: ${category}. Contexto adicional del ingeniero: ${details || 'Sin detalles adicionales'}. Devuelve descripción, alcance, condiciones comerciales/técnicas, unidad, rango bajo/alto y un precio recomendado razonable en CLP netos de equipos y antes de IVA. Los ejemplos de precios deben distinguir mano de obra de equipos.`,
    });
    const sources = result.sources.map(source => {
      const item = source as { url?: string; title?: string };
      return { title: item.title || item.url || 'Referencia de mercado', url: item.url || '', note: '' };
    }).filter(source => source.url.startsWith('https://')).slice(0, 12);
    return { ...result.output, marketSources: sources, marketCheckedAt: new Date().toISOString(), taxExempt: false };
  });
}
