'use client';

import { useMemo, useState } from 'react';
import { sellingPrice, type UtilityMode } from '@/lib/pricing';

type Imported = { name: string; brand: string; sku: string; description: string; category: string; unit: string; costPrice: number|null; sourceUrl: string; sourceCurrency: string; sourcePrice: string; sourceCheckedAt: string|null; availability: string; imageUrl: string; selected: boolean };
const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);

export function CatalogImportModal({ onClose, onSaved }: { onClose: () => void; onSaved: (created: number, skipped: number) => Promise<void> }) {
  const [url, setUrl] = useState(''); const [products, setProducts] = useState<Imported[]>([]);
  const [utilityMode, setUtilityMode] = useState<UtilityMode>('MARKUP'); const [utilityPercent, setUtilityPercent] = useState(25);
  const [basisConfirmed, setBasisConfirmed] = useState(false); const [extracting, setExtracting] = useState(false); const [saving, setSaving] = useState(false); const [excelBusy, setExcelBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [truncated, setTruncated] = useState(false);
  const selected = useMemo(() => products.filter(product => product.selected), [products]);
  const selectedWithoutCost = selected.filter(product => product.costPrice === null || product.costPrice <= 0).length;
  const selectedInvalid = selected.filter(product => product.costPrice !== null && (utilityMode === 'MARGIN' && utilityPercent >= 100 || sellingPrice(product.costPrice, utilityPercent, utilityMode) > 2_000_000_000));

  async function extractProducts() {
    setExtracting(true); setError(''); setNotice(''); setProducts([]); setBasisConfirmed(false);
    try {
      const response = await fetch('/api/catalog/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudieron extraer los datos.');
      setProducts((data.products as Omit<Imported,'selected'>[]).map(product => ({ ...product, selected: true }))); setUrl(data.sourceUrl); setTruncated(data.truncated);
      setNotice(`Se encontraron ${data.totalDetected} productos${data.truncated ? ' (se muestran los primeros 500)' : ''}. Revisa los datos antes de exportar o guardar.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron extraer los productos.'); }
    finally { setExtracting(false); }
  }
  function update(index: number, key: keyof Imported, value: string|number|boolean|null) {
    setProducts(current => current.map((product, i) => i === index ? { ...product, [key]: value } : product));
    if (key === 'costPrice') setBasisConfirmed(false);
  }
  function selectAll(selectedValue: boolean) { setProducts(current => current.map(product => ({ ...product, selected: selectedValue }))); }
  function prepared(product: Imported) {
    const { selected: _selected, ...data } = product;
    return { ...data, costPrice: data.costPrice && data.costPrice > 0 ? data.costPrice : null, utilityMode, utilityPercent, price: data.costPrice && data.costPrice > 0 ? sellingPrice(data.costPrice, utilityPercent, utilityMode) : 0, active: true };
  }
  async function downloadExcel() {
    if (!selected.length) { setError('Selecciona al menos un producto para exportar.'); return; }
    setExcelBusy(true); setError('');
    try {
      const response = await fetch('/api/catalog/import/excel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: selected.map(prepared) }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'No se pudo generar el Excel.'); }
      const blob = await response.blob(), objectUrl = URL.createObjectURL(blob), link = document.createElement('a'); link.href = objectUrl; link.download = 'productos-proveedor.xlsx'; link.click(); URL.revokeObjectURL(objectUrl);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo generar el Excel.'); }
    finally { setExcelBusy(false); }
  }
  async function saveSelected() {
    if (!selected.length) { setError('Selecciona al menos un producto para guardar.'); return; }
    if (selectedWithoutCost) { setError(`Completa un costo neto CLP mayor que cero para los ${selectedWithoutCost} productos seleccionados sin costo.`); return; }
    if (selectedInvalid.length) { setError('Corrige el porcentaje de utilidad o el costo de los productos marcados como inválidos.'); return; }
    if (!basisConfirmed) { setError('Confirma que revisaste los precios publicados y el costo neto/IVA de los productos seleccionados.'); return; }
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/catalog/import/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selected.map(prepared)) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudieron guardar los productos.');
      await onSaved(data.created, data.skipped); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron guardar los productos.'); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="modal wide catalog-import-modal" role="dialog" aria-modal="true" aria-labelledby="catalog-import-title">
    <header className="modal-head"><div><h2 id="catalog-import-title">Importar productos desde proveedor</h2><p>Extrae productos de páginas de listado, revísalos, descarga Excel o guárdalos en lote.</p></div><button type="button" className="modal-close" onClick={onClose}>×</button></header>
    <div className="modal-body catalog-bulk-body">
      <label className="field">URL pública de la página de productos<div className="import-url-row"><input type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://proveedor.cl/categoria/camaras" required/><button type="button" className="button primary" disabled={extracting || !url.trim()} onClick={extractProducts}>{extracting ? 'Extrayendo…' : '↧ Extraer productos'}</button></div></label>
      <div className="import-source-note">Solo se consultan páginas HTTPS públicas. La extracción lee HTML, datos estructurados y tarjetas de productos; páginas que renderizan el catálogo únicamente con JavaScript podrían requerir carga manual. Límite de 500 productos por página.</div>
      {products.length > 0 && <>
        <div className="bulk-toolbar"><div><b>{selected.length} de {products.length} seleccionados</b><span>Los precios publicados se conservan como referencia. Ingresa y verifica el costo neto en CLP.</span></div><div><button type="button" className="button outline compact" onClick={() => selectAll(true)}>Seleccionar todos</button><button type="button" className="button outline compact" onClick={() => selectAll(false)}>Ninguno</button></div></div>
        <div className="bulk-utility form-grid"><label className="field">Regla de utilidad<select value={utilityMode} onChange={event => setUtilityMode(event.target.value as UtilityMode)}><option value="MARKUP">Recargo sobre costo</option><option value="MARGIN">Margen sobre precio de venta</option></select></label><label className="field">Porcentaje (%)<input type="number" min="0" max={utilityMode === 'MARGIN' ? 99 : 1000} step="1" value={utilityPercent} onChange={event => setUtilityPercent(Math.max(0, Number(event.target.value)))}/></label><div className="bulk-formula"><b>{utilityMode === 'MARKUP' ? `Costo × (1 + ${utilityPercent}%)` : `Costo ÷ (1 − ${utilityPercent}%)`}</b><span>El catálogo calcula el precio de venta sugerido con esta regla.</span></div></div>
        <div className="bulk-table-wrap"><table className="bulk-product-table"><thead><tr><th>✓</th><th>Producto</th><th>Marca / SKU</th><th>Costo neto CLP</th><th>Precio de origen</th><th>Venta sugerida</th><th>Unidad / categoría</th></tr></thead><tbody>{products.map((product, index) => {
          const suggested = product.costPrice && product.costPrice > 0 ? sellingPrice(product.costPrice, utilityPercent, utilityMode) : null;
          return <tr key={`${product.sourceUrl}-${index}`} className={!product.selected ? 'unselected' : ''}><td><input aria-label={`Seleccionar ${product.name}`} type="checkbox" checked={product.selected} onChange={event => update(index, 'selected', event.target.checked)}/></td><td className="bulk-name-cell"><input className="bulk-text" value={product.name} maxLength={180} onChange={event => update(index, 'name', event.target.value)}/><textarea className="bulk-text bulk-description" value={product.description} maxLength={500} placeholder="Descripción" onChange={event => update(index, 'description', event.target.value)}/><a href={product.sourceUrl} target="_blank" rel="noreferrer">Ver fuente ↗</a>{product.availability&&<small>{product.availability}</small>}</td><td><input className="bulk-text" value={product.brand} placeholder="Marca" maxLength={120} onChange={event => update(index, 'brand', event.target.value)}/><input className="bulk-text" value={product.sku} placeholder="SKU / modelo" maxLength={100} onChange={event => update(index, 'sku', event.target.value)}/></td><td><input className="bulk-number" type="number" min="0" max="2000000000" step="1" value={product.costPrice??''} placeholder="Revisar" onChange={event => update(index, 'costPrice', event.target.value === '' ? null : Number(event.target.value))}/><small>CLP neto</small></td><td>{product.sourcePrice ? <><b>{product.sourcePrice} {product.sourceCurrency}</b><small>Dato publicado</small></> : <span className="muted">No detectado</span>}</td><td><b>{suggested ? money(suggested) : '—'}</b><small>{suggested ? `${utilityMode === 'MARKUP' ? 'Recargo' : 'Margen'} ${utilityPercent}%` : 'Ingresa costo neto'}</small></td><td><input className="bulk-text" value={product.unit} maxLength={30} onChange={event => update(index, 'unit', event.target.value)}/><input className="bulk-text" value={product.category} maxLength={80} placeholder="Categoría" onChange={event => update(index, 'category', event.target.value)}/></td></tr>;
        })}</tbody></table></div>
        {truncated&&<div className="import-source-note">La página contenía más de 500 productos. Se muestran los primeros 500.</div>}
        <label className="import-confirm"><input type="checkbox" checked={basisConfirmed} onChange={event => setBasisConfirmed(event.target.checked)}/><span>Revisé los precios publicados, confirmé el costo neto en CLP y verifiqué el tratamiento de IVA para los productos que voy a guardar.</span></label>
      </>}
      {notice&&<div className="success-box" role="status">{notice}</div>}{error&&<div className="error-box" role="alert">{error}</div>}
    </div>
    <footer className="modal-foot"><span>El Excel incluye productos seleccionados, fuentes y precios de referencia.</span><div><button type="button" className="button outline" onClick={onClose}>Cancelar</button>{products.length>0&&<><button type="button" className="button outline" disabled={excelBusy||!selected.length} onClick={downloadExcel}>{excelBusy?'Generando…':'⇩ Descargar Excel'}</button><button type="button" className="button primary" disabled={saving||!selected.length||!basisConfirmed} onClick={saveSelected}>{saving?'Guardando…':`Guardar ${selected.length} en catálogo`}</button></>}</div></footer>
  </section></div>;
}
