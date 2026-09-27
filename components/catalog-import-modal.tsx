'use client';

import { useState } from 'react';
import { sellingPrice, type UtilityMode } from '@/lib/pricing';

type ImportedProduct = {
  name: string; description: string; category: string; unit: string; costPrice: number | null;
  utilityPercent: number; utilityMode: UtilityMode; sourceUrl: string; sourceCurrency: string;
  sourcePrice: string; sourceCheckedAt: string | null; active: boolean; price: number;
};
type Extracted = Pick<ImportedProduct, 'name' | 'description' | 'category' | 'unit' | 'costPrice' | 'sourceUrl' | 'sourceCurrency' | 'sourcePrice' | 'sourceCheckedAt'>;
const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);

export function CatalogImportModal({ onClose, onSave }: { onClose: () => void; onSave: (product: ImportedProduct) => Promise<void> }) {
  const [url, setUrl] = useState('');
  const [product, setProduct] = useState<Extracted>({ name: '', description: '', category: 'Otros', unit: 'un', costPrice: null, sourceUrl: '', sourceCurrency: 'CLP', sourcePrice: '', sourceCheckedAt: null });
  const [utilityMode, setUtilityMode] = useState<UtilityMode>('MARKUP');
  const [utilityPercent, setUtilityPercent] = useState(25);
  const [basisConfirmed, setBasisConfirmed] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const calculated = product.costPrice === null ? null : sellingPrice(product.costPrice, utilityPercent, utilityMode);

  async function extractProduct() {
    setExtracting(true); setError(''); setBasisConfirmed(false);
    try {
      const response = await fetch('/api/catalog/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudieron extraer los datos.');
      setProduct(data as Extracted); setUrl(data.sourceUrl); setBasisConfirmed(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron extraer los datos.'); }
    finally { setExtracting(false); }
  }

  function update<K extends keyof Extracted>(key: K, value: Extracted[K]) {
    setProduct(current => ({ ...current, [key]: value }));
    if (key === 'costPrice') setBasisConfirmed(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (calculated === null) { setError('Ingresa el costo neto en CLP para calcular el precio de venta.'); return; }
    if (product.sourceUrl && !basisConfirmed) { setError('Confirma que revisaste el costo base y el tratamiento del IVA.'); return; }
    if (calculated > 2_000_000_000) { setError('El precio calculado supera el máximo permitido.'); return; }
    setSaving(true); setError('');
    try { await onSave({ ...product, costPrice: product.costPrice, utilityPercent, utilityMode, price: calculated, active: true }); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo agregar al catálogo.'); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="modal wide catalog-import-modal" role="dialog" aria-modal="true" aria-labelledby="catalog-import-title">
    <header className="modal-head"><div><h2 id="catalog-import-title">Importar producto desde proveedor</h2><p>Extrae los datos públicos y revisa el costo antes de guardarlo.</p></div><button type="button" className="modal-close" onClick={onClose}>×</button></header>
    <form onSubmit={submit}><div className="modal-body">
      <label className="field">URL pública del producto<div className="import-url-row"><input type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://proveedor.cl/producto/..." required/><button type="button" className="button outline" disabled={extracting || !url.trim()} onClick={extractProduct}>{extracting ? 'Extrayendo…' : '↧ Extraer datos'}</button></div></label>
      <div className="import-source-note">Solo se leen páginas HTTPS públicas. Algunos proveedores bloquean la lectura o cargan productos con JavaScript; si falla, completa los campos manualmente.</div>
      <div className="form-grid import-product-fields"><label className="field span2">Producto / modelo<input required maxLength={180} value={product.name} onChange={event => update('name', event.target.value)}/></label><label className="field span2">Descripción<textarea maxLength={500} rows={3} value={product.description} onChange={event => update('description', event.target.value)}/></label><label className="field">Categoría<select value={product.category} onChange={event => update('category', event.target.value)}>{['Videovigilancia','Redes','Automatización','Control de acceso','Infraestructura','Servicios','Otros'].map(category => <option key={category}>{category}</option>)}</select></label><label className="field">Unidad<input maxLength={30} value={product.unit} onChange={event => update('unit', event.target.value)}/></label>
        <label className="field">Costo neto de compra (CLP)<input type="number" min="0" max="2000000000" step="1" value={product.costPrice ?? ''} onChange={event => update('costPrice', event.target.value === '' ? null : Number(event.target.value))} placeholder="Ingresa costo neto en pesos"/><small>Antes de aplicar utilidad. Excluye el IVA recuperable.</small></label>
        <label className="field">Regla de utilidad<select value={utilityMode} onChange={event => setUtilityMode(event.target.value as UtilityMode)}><option value="MARKUP">Recargo sobre costo</option><option value="MARGIN">Margen sobre precio de venta</option></select></label>
        <label className="field">Porcentaje (%)<input type="number" min="0" max={utilityMode === 'MARGIN' ? 99 : 1000} step="1" value={utilityPercent} onChange={event => setUtilityPercent(Math.max(0, Number(event.target.value)))}/></label>
      </div>
      <section className="import-price-preview"><div><span>Precio origen</span><b>{product.sourcePrice ? `${product.sourcePrice} ${product.sourceCurrency}` : 'No encontrado'}</b><small>{product.sourceUrl ? 'Confirma moneda y si el precio publicado incluye IVA.' : 'Puedes completar el costo manualmente.'}</small></div><span className="import-math">{utilityMode === 'MARKUP' ? `Costo × (1 + ${utilityPercent}%)` : `Costo ÷ (1 − ${utilityPercent}%)`}</span><div className="import-sale-price"><span>Precio de venta sugerido</span><b>{calculated === null ? '—' : money(calculated)}</b></div></section>
      {product.sourceUrl && <label className="import-confirm"><input type="checkbox" checked={basisConfirmed} onChange={event => setBasisConfirmed(event.target.checked)}/><span>Revisé el precio publicado, lo convertí a costo neto CLP y verifiqué su tratamiento de IVA.</span></label>}
      {error && <div className="error-box" role="alert">{error}</div>}
    </div><footer className="modal-foot"><span>El precio del catálogo se calcula también en el servidor.</span><div><button type="button" className="button outline" onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving || !product.name.trim() || calculated === null || (!!product.sourceUrl && !basisConfirmed)}>{saving ? 'Guardando…' : 'Confirmar y agregar'}</button></div></footer></form>
  </section></div>;
}
