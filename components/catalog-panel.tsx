'use client';

import { useMemo, useRef, useState } from 'react';

export type CatalogProduct = { id: string; name: string; brand: string; sku: string; description: string; category: string; unit: string; price: number; costPrice: number|null; utilityPercent: number; utilityMode: 'MARKUP'|'MARGIN'; sourceUrl: string; sourceCurrency: string; sourcePrice: string; sourceCheckedAt: string|null; availability: string; imageUrl: string; active: boolean };
export type CatalogCategory = { id: string; name: string; custom: boolean };
const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);
const dateShort = (date?: string|null) => date ? new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date)) : '—';

export function CatalogPanel({ products, categories, onAdd, onEdit, onDelete, onImportSupplier, onManageCategories, onImported }: {
  products: CatalogProduct[]; categories: CatalogCategory[]; onAdd: () => void; onEdit: (product: CatalogProduct) => void; onDelete: (product: CatalogProduct) => void;
  onImportSupplier: () => void; onManageCategories: () => void; onImported: (imported: number, skipped: number) => Promise<void>;
}) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState('TODAS'), [sort, setSort] = useState('name'), [view, setView] = useState<'cards'|'list'>('list');
  const [uploading, setUploading] = useState(false), [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('es-CL');
    const result = products.filter(product => (category === 'TODAS' || product.category === category) && (!text || `${product.name} ${product.brand} ${product.sku} ${product.category} ${product.description}`.toLocaleLowerCase('es-CL').includes(text)));
    result.sort((a, b) => sort === 'price-asc' ? a.price - b.price || a.name.localeCompare(b.name, 'es-CL') : sort === 'price-desc' ? b.price - a.price || a.name.localeCompare(b.name, 'es-CL') : sort === 'category' ? a.category.localeCompare(b.category, 'es-CL') || a.name.localeCompare(b.name, 'es-CL') : sort === 'name-desc' ? b.name.localeCompare(a.name, 'es-CL') : a.name.localeCompare(b.name, 'es-CL'));
    return result;
  }, [products, query, category, sort]);

  async function importSheet(file?: File) {
    if (!file) return;
    if (!window.confirm(`Importar productos desde “${file.name}”? Los duplicados se omitirán y los datos inválidos detendrán toda la importación.`)) { if (fileInput.current) fileInput.current.value = ''; return; }
    setUploading(true); setError('');
    try {
      const form = new FormData(); form.set('file', file);
      const response = await fetch('/api/catalog/import/sheet', { method: 'POST', body: form });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo importar la planilla.');
      await onImported(data.imported, data.skipped);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo importar la planilla.'); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  async function downloadBackup() {
    setError('');
    try {
      const response = await fetch('/api/catalog/export');
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'No se pudo generar el respaldo.'); }
      const objectUrl = URL.createObjectURL(await response.blob()), anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = 'respaldo-catalogo.xlsx'; anchor.click(); URL.revokeObjectURL(objectUrl);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo generar el respaldo.'); }
  }
  function card(product: CatalogProduct) { return <article className={`catalog-card ${!product.active?'inactive':''}`} key={product.id}>
    <div className="catalog-card-top"><span className="category-tag">{product.category}</span><div className="row-actions"><button onClick={() => onEdit(product)}>Editar</button><button className="danger-text" onClick={() => onDelete(product)}>×</button></div></div>
    <b>{product.name}</b>{(product.brand||product.sku)&&<div className="product-margin-info">{[product.brand,product.sku&&`SKU ${product.sku}`].filter(Boolean).join(' · ')}</div>}
    <p>{product.description||'Sin descripción'}</p><div className="catalog-price"><strong>{money(product.price)}</strong><span> / {product.unit}</span><i>{product.active?'Activo':'Archivado'}</i></div>
    {product.costPrice!==null&&<div className="product-margin-info">Costo neto {money(product.costPrice)} · {product.utilityMode==='MARGIN'?'Margen':'Recargo'} {product.utilityPercent}%</div>}
    {product.sourceUrl&&<a className="product-source-link" href={product.sourceUrl} target="_blank" rel="noreferrer">Fuente · {product.sourceCheckedAt?`revisada ${dateShort(product.sourceCheckedAt)}`:'origen guardado'} ↗</a>}
  </article>; }

  return <><div className="page-heading"><div><div className="eyebrow">SERVICIOS Y EQUIPOS</div><h1>Catálogo</h1><p>Busca, filtra, ordena y administra los equipos y servicios de tus cotizaciones.</p></div><div className="page-actions catalog-main-actions"><button className="button outline" onClick={onImportSupplier}>↧ Importar proveedor</button><button className="button outline" onClick={downloadBackup}>⇩ Respaldo Excel</button><button className="button outline" disabled={uploading} onClick={() => fileInput.current?.click()}>{uploading?'Importando…':'⇧ Importar Excel'}</button><button className="button primary" onClick={onAdd}>＋ Agregar ítem</button><input ref={fileInput} className="visually-hidden-input" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => void importSheet(event.target.files?.[0])}/></div></div>
    <section className="card catalog-management-card"><div className="catalog-tools"><div className="searchbox catalog-search"><span>⌕</span><input aria-label="Buscar productos" placeholder="Buscar producto, marca, SKU o descripción…" value={query} onChange={event => setQuery(event.target.value)}/>{query&&<button className="search-clear" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">×</button>}</div>
      <label className="catalog-filter"><span>Categoría</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="TODAS">Todas las categorías</option>{categories.map(item=><option key={item.name} value={item.name}>{item.name}</option>)}</select></label>
      <label className="catalog-filter"><span>Ordenar</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="name">Nombre A–Z</option><option value="name-desc">Nombre Z–A</option><option value="price-asc">Precio: menor a mayor</option><option value="price-desc">Precio: mayor a menor</option><option value="category">Categoría</option></select></label>
      <button className="button outline category-manage-button" onClick={onManageCategories}>⚙ Categorías</button></div>
      <div className="catalog-results-bar"><span><b>{filtered.length}</b> de {products.length} productos</span><div className="catalog-view-toggle" role="group" aria-label="Vista del catálogo"><button className={view==='list'?'selected':''} aria-pressed={view==='list'} onClick={() => setView('list')}>☷ Lista</button><button className={view==='cards'?'selected':''} aria-pressed={view==='cards'} onClick={() => setView('cards')}>▦ Tarjetas</button></div></div>
      {error&&<div className="error-box" role="alert">{error}</div>}
      {filtered.length===0?<div className="catalog-empty"><b>{products.length?'No hay resultados':'Aún no hay productos'}</b><span>{products.length?'Prueba con otra búsqueda o categoría.':'Agrega un ítem o importa una planilla Excel para empezar.'}</span></div>:view==='cards'?<div className="catalog-grid">{filtered.map(card)}</div>:<div className="table-scroll catalog-list-scroll"><table className="catalog-list-table"><thead><tr><th>PRODUCTO</th><th>CATEGORÍA</th><th>COSTO NETO</th><th>PRECIO DE VENTA</th><th>ESTADO</th><th/></tr></thead><tbody>{filtered.map(product=><tr key={product.id} className={!product.active?'catalog-row-inactive':''}><td><div className="catalog-list-product"><b>{product.name}</b><span>{[product.brand,product.sku&&`SKU ${product.sku}`].filter(Boolean).join(' · ')||product.description||'Sin detalles'}</span></div></td><td><span className="category-tag">{product.category}</span></td><td>{product.costPrice===null?'—':money(product.costPrice)}</td><td><b>{money(product.price)}</b><small> / {product.unit}</small></td><td><span className={`catalog-status ${product.active?'':'off'}`}>{product.active?'Activo':'Archivado'}</span></td><td><div className="row-actions"><button onClick={() => onEdit(product)}>Editar</button><button className="danger-text" onClick={() => onDelete(product)}>Eliminar</button></div></td></tr>)}</tbody></table></div>}
    </section></>;
}
