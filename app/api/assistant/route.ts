import { openai } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError, api } from '@/lib/http';

const assistantOutput = z.object({
  reply: z.string().describe('Respuesta breve y conversacional en español chileno, con preguntas técnicas útiles si falta información.'),
  client: z.object({ name: z.string(), rut: z.string(), email: z.string(), phone: z.string(), address: z.string(), contact: z.string(), notes: z.string() }).nullable().describe('Datos del cliente nuevo si el usuario los indicó; nunca inventar datos.'),
  catalogItems: z.array(z.object({ name: z.string(), description: z.string(), category: z.string(), unit: z.string(), price: z.number().int().nonnegative() })).describe('Nuevos equipos o servicios que el usuario pidió registrar. Precio 0 si no se indicó.'),
  quote: z.object({ title: z.string(), clientName: z.string(), notes: z.string(), items: z.array(z.object({ name: z.string(), description: z.string(), quantity: z.number().int().positive(), unit: z.string(), unitPrice: z.number().int().nonnegative(), fromCatalog: z.boolean() })) }).nullable().describe('Borrador acumulado de cotización si se está trabajando una propuesta; precios únicamente desde catálogo o indicados explícitamente por el usuario.'),
});

const requestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(3000) })).min(1).max(16),
  draft: assistantOutput.optional(),
});

export async function POST(req: Request) {
  return api(async () => {
    if (!process.env.OPENAI_API_KEY) throw new ApiError('Falta configurar OPENAI_API_KEY en el entorno del servidor.', 503);
    const { messages, draft } = requestSchema.parse(await req.json());
    const [clients, items, settings] = await Promise.all([
      db.client.findMany({ take: 60, orderBy: { name: 'asc' }, select: { name: true, rut: true, email: true, phone: true, address: true, contact: true } }),
      db.catalogItem.findMany({ take: 100, where: { active: true }, orderBy: { name: 'asc' }, select: { name: true, description: true, category: true, unit: true, price: true } }),
      db.settings.findUnique({ where: { id: 'singleton' }, select: { defaultTaxRate: true, defaultValidity: true, terms: true } }),
    ]);
    const transcript = messages.map(({ role, content }) => `${role === 'user' ? 'Usuario' : 'Asistente'}: ${content}`).join('\n').slice(-12000);
    const result = await generateText({
      model: openai(process.env.OPENAI_MODEL || 'gpt-5.6-luna'),
      maxOutputTokens: 1400,
      output: Output.object({ schema: assistantOutput }),
      system: `Eres Nexo, asistente de terreno para cotizaciones de ingeniería en Chile. Ayudas con videovigilancia, redes, fibra óptica, Wi-Fi, control de acceso, automatización e infraestructura. Responde en español claro y breve. Convierte lo dictado en un borrador acumulado y pregunta por un dato técnico relevante cuando haga falta (distancias, cantidad, cobertura, canalización, almacenamiento, instalación, etc.). No inventes RUT, contacto, direcciones, especificaciones, precios ni disponibilidad. Los precios del catálogo son referencias; reutilízalos solo si el producto realmente corresponde y conserva exactamente su precio. Si algo no está en catálogo, propón el producto con precio 0 y avisa que falta definirlo. Nunca marques como existente un equipo que solo sugeriste. No escribas en la base de datos: únicamente devuelve sugerencias para confirmar por pantalla. Cotizaciones en CLP con IVA ${settings?.defaultTaxRate ?? 19}% y validez ${settings?.defaultValidity ?? 15} días. Términos predeterminados: ${settings?.terms ?? ''}.\nCLIENTES EXISTENTES (solo para reconocerlos): ${JSON.stringify(clients)}\nCATÁLOGO ACTIVO Y PRECIOS CLP: ${JSON.stringify(items)}\nSi el usuario dicta una inspección parcial, mantén quote null hasta tener cliente y alcance básico o entrega un borrador parcial claramente marcado. En client, devuelve datos solo para un cliente nuevo que el usuario pidió agregar o dictó; si no, null. En catalogItems, devuelve solo altas solicitadas explícitamente. fromCatalog debe ser true solo para una coincidencia exacta del catálogo.`,
      prompt: `${transcript}\nBORRADOR ESTRUCTURADO ANTERIOR (actualiza y conserva la información confirmada): ${JSON.stringify(draft ?? null)}`,
    });
    return result.output;
  });
}
