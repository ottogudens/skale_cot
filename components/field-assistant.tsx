'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type Client = { id: string; name: string; rut?: string; email?: string; phone?: string; address?: string; contact?: string; notes?: string };
type DraftLine = { name: string; description: string; quantity: number; unit: string; unitPrice: number; fromCatalog: boolean };
type QuoteDraft = { title: string; clientName: string; notes: string; items: DraftLine[] };
type Proposal = {
  reply: string;
  client: Omit<Client, 'id'> | null;
  catalogItems: { name: string; description: string; category: string; unit: string; price: number }[];
  quote: QuoteDraft | null;
};
type Message = { role: 'user' | 'assistant'; content: string };
type SpeechResult = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<SpeechResult>; resultIndex: number }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};

export function FieldAssistant({ clients, taxRate, onCreateClient, onCreateProduct, onCreateQuote, onClose }: {
  clients: Client[];
  taxRate: number;
  onCreateClient: (client: { name: string; rut: string; email: string; phone: string; address: string; contact: string; notes: string }) => Promise<Client>;
  onCreateProduct: (product: { name: string; description: string; category: string; unit: string; price: number; active: boolean }) => Promise<void>;
  onCreateQuote: (quote: QuoteDraft, clientId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [input, setInput] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [savedProducts, setSavedProducts] = useState<string[]>([]);
  const [savingClient, setSavingClient] = useState(false);
  const [savingProduct, setSavingProduct] = useState('');
  const [savingQuote, setSavingQuote] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const draftClient = useMemo(() => [...clients].reverse().find(client => client.id === selectedClientId), [clients, selectedClientId]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const content = input.trim();
    if (!content || busy) return;
    if (recording) { recognitionRef.current?.stop(); setRecording(false); }
    const nextMessages = [...messages, { role: 'user' as const, content }];
    setMessages(nextMessages);
    setInput('');
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: nextMessages.slice(-16), draft: proposal || undefined }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo consultar al asistente.');
      const result = data as Proposal;
      setProposal(result);
      setMessages([...nextMessages, { role: 'assistant', content: result.reply }]);
      const clientName = result.client?.name || result.quote?.clientName;
      if (clientName) {
        const existing = clients.find(client => client.name.toLocaleLowerCase() === clientName.toLocaleLowerCase());
        if (existing) setSelectedClientId(existing.id);
      }
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar al asistente.');
    } finally {
      setBusy(false);
    }
  }

  function toggleVoice() {
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    const browser = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Recognition) { setError('El dictado no está disponible en este navegador. Usa un navegador compatible con reconocimiento de voz.'); return; }
    const recognition = new Recognition();
    recognition.lang = 'es-CL';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = event => {
      const text = Array.from(event.results).slice(event.resultIndex).filter(result => result.isFinal).map(result => result[0].transcript).join('');
      if (text) setInput(previous => previous ? `${previous.replace(/\s+$/, '')} ${text}` : text);
    };
    recognition.onerror = event => setError(event.error === 'not-allowed' ? 'Permite el acceso al micrófono para dictar.' : `No se pudo usar el micrófono (${event.error}).`);
    recognition.onend = () => setRecording(false);
    try { setError(''); recognitionRef.current = recognition; recognition.start(); setRecording(true); }
    catch { setRecording(false); setError('No se pudo iniciar el micrófono. Revisa los permisos del navegador.'); }
  }

  async function saveClient() {
    if (!proposal?.client) return;
    const existing = clients.find(client => client.name.toLocaleLowerCase() === proposal.client?.name.toLocaleLowerCase());
    if (existing) { setSelectedClientId(existing.id); return; }
    setSavingClient(true); setError('');
    try { const created = await onCreateClient({ name: proposal.client.name, rut: proposal.client.rut || '', email: proposal.client.email || '', phone: proposal.client.phone || '', address: proposal.client.address || '', contact: proposal.client.contact || '', notes: proposal.client.notes || '' }); setSelectedClientId(created.id); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el cliente.'); }
    finally { setSavingClient(false); }
  }

  async function saveProduct(product: Proposal['catalogItems'][number]) {
    setSavingProduct(product.name); setError('');
    try { await onCreateProduct({ ...product, active: true }); setSavedProducts(prev => [...prev, product.name]); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el producto.'); }
    finally { setSavingProduct(''); }
  }

  function updateLine(index: number, key: 'quantity' | 'unitPrice', value: number) {
    setProposal(current => current?.quote ? { ...current, quote: { ...current.quote, items: current.quote.items.map((line, i) => i === index ? { ...line, [key]: Math.max(key === 'quantity' ? 1 : 0, Math.floor(value)) } : line) } } : current);
  }

  async function saveQuote() {
    if (!proposal?.quote || !selectedClientId || proposal.quote.items.some(line => !line.name.trim() || line.unitPrice <= 0)) return;
    setSavingQuote(true); setError('');
    try { await onCreateQuote(proposal.quote, selectedClientId); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear la cotización.'); }
    finally { setSavingQuote(false); }
  }

  const selectedName = draftClient?.name || proposal?.client?.name || proposal?.quote?.clientName || '';
  const total = (proposal?.quote?.items || []).reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  return <aside className="field-assistant" aria-label="Asistente de terreno">
    <header className="field-assistant-head"><div><span className="assistant-orb">✦</span><div><b>Asistente de terreno</b><small>Dicta el levantamiento y arma el borrador</small></div></div><button type="button" onClick={onClose} aria-label="Cerrar asistente">×</button></header>
    <div className="field-assistant-safety">El texto dictado y los datos necesarios se envían a OpenAI para preparar sugerencias. Nada se guarda sin que lo confirmes.</div>
    <div className="assistant-chat" ref={scrollRef}>
      {!messages.length && <div className="assistant-welcome"><b>Cuéntame qué encontraste en terreno.</b><p>Ejemplo: “Oficina de 2 pisos, instalar 8 cámaras PoE, grabación por 30 días, rack en recepción. Cliente Acme, contacto Juan”.</p><span>También puedes pedir registrar clientes, equipos o servicios.</span></div>}
      {messages.map((message, index) => <div className={`assistant-message ${message.role}`} key={`${index}-${message.role}`}><span>{message.role === 'user' ? 'Tú' : 'SKALIO'}</span><p>{message.content}</p></div>)}
      {busy && <div className="assistant-thinking"><i/> Revisando el levantamiento…</div>}
      {proposal?.client && <section className="assistant-card"><div className="assistant-card-title"><b>Cliente sugerido</b><span>Revisa antes de guardar</span></div><div className="assistant-client"><b>{proposal.client.name || 'Nombre no indicado'}</b>{proposal.client.rut && <span>RUT: {proposal.client.rut}</span>}{proposal.client.phone && <span>{proposal.client.phone}</span>}{proposal.client.address && <span>{proposal.client.address}</span>}</div><button type="button" className="assistant-action" onClick={saveClient} disabled={savingClient || !!clients.find(client => client.name.toLocaleLowerCase() === proposal.client?.name.toLocaleLowerCase())}>{clients.find(client => client.name.toLocaleLowerCase() === proposal.client?.name.toLocaleLowerCase()) ? 'Cliente existente · seleccionado' : savingClient ? 'Guardando…' : '＋ Confirmar y agregar cliente'}</button></section>}
      {proposal?.catalogItems.map((product, index) => <section className="assistant-card" key={`${product.name}-${index}`}><div className="assistant-card-title"><b>Nuevo equipo o servicio</b><span>{product.category}</span></div><div className="assistant-client"><b>{product.name}</b><span>{product.description || 'Sin descripción'}</span><span>{product.unit} · {product.price > 0 ? new Intl.NumberFormat('es-CL').format(product.price) : 'Precio por definir'} CLP</span></div><button type="button" className="assistant-action" disabled={!!savedProducts.includes(product.name) || savingProduct === product.name} onClick={() => saveProduct(product)}>{savedProducts.includes(product.name) ? 'Agregado al catálogo' : savingProduct === product.name ? 'Guardando…' : '＋ Confirmar y agregar al catálogo'}</button></section>)}
      {proposal?.quote && <section className="assistant-card assistant-quote-card"><div className="assistant-card-title"><b>Borrador de cotización</b><span>Editable antes de crear</span></div><label className="assistant-field">Proyecto<input value={proposal.quote.title} onChange={event => setProposal(current => current?.quote ? { ...current, quote: { ...current.quote, title: event.target.value } } : current)}/></label><label className="assistant-field">Cliente<select value={selectedClientId} onChange={event => setSelectedClientId(event.target.value)}><option value="">Seleccionar cliente…</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>{!selectedClientId && selectedName && <small className="assistant-hint">El agente identificó “{selectedName}”. Selecciónalo si ya existe o agrégalo con la tarjeta de cliente.</small>}
        {proposal.quote.items.map((line, index) => <div className="assistant-draft-line" key={`${line.name}-${index}`}><b>{line.name}</b>{line.description && <small>{line.description}</small>}<div><span>{line.quantity} {line.unit} ×</span><label><span className="sr-only">Precio unitario CLP para {line.name}</span><input type="number" min="0" step="1000" value={line.unitPrice} onChange={event => updateLine(index, 'unitPrice', Number(event.target.value))}/></label><label><span className="sr-only">Cantidad de {line.name}</span><input aria-label={`Cantidad de ${line.name}`} type="number" min="1" value={line.quantity} onChange={event => updateLine(index, 'quantity', Number(event.target.value))}/></label></div>{line.unitPrice === 0 && <small className="assistant-hint">Define el precio antes de crear la cotización.</small>}</div>)}
        <div className="assistant-total"><span>Neto</span><b>{new Intl.NumberFormat('es-CL').format(total)} CLP</b><span>IVA ({taxRate}%)</span><b>{new Intl.NumberFormat('es-CL').format(Math.round(total * taxRate / 100))} CLP</b><strong>Total</strong><strong>{new Intl.NumberFormat('es-CL').format(total + Math.round(total * taxRate / 100))} CLP</strong></div>
        <button type="button" className="assistant-action primary" onClick={saveQuote} disabled={savingQuote || !selectedClientId || proposal.quote.items.length === 0 || proposal.quote.items.some(line => line.unitPrice <= 0 || !line.name.trim())}>{savingQuote ? 'Creando cotización…' : 'Confirmar y crear cotización'}</button>
      </section>}
    </div>
    {error && <div className="assistant-error" role="alert">{error}</div>}
    <form className="assistant-composer" onSubmit={send}><textarea aria-label="Mensaje para el asistente" value={input} onChange={event => setInput(event.target.value)} placeholder="Describe el lugar, cantidades, distancias…" rows={3} disabled={busy}/><div><button type="button" className={`assistant-mic ${recording ? 'recording' : ''}`} onClick={toggleVoice} aria-label={recording ? 'Detener dictado' : 'Dictar mensaje'} title={recording ? 'Detener dictado' : 'Dictar mensaje'}>{recording ? '■' : '🎙'}</button><span>{recording ? 'Escuchando…' : 'Requiere micrófono y navegador compatible'}</span><button type="submit" className="assistant-send" disabled={busy || !input.trim()}>{busy ? '…' : 'Enviar'} →</button></div></form>
  </aside>;
}
