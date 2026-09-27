import { strToU8, unzipSync, zipSync } from 'fflate';

export type WorkbookProduct = {
  id: string; name: string; brand: string; sku: string; description: string; category: string; unit: string;
  sourcePrice: string; sourceCurrency: string; costPrice: number | null; utilityMode: 'MARKUP' | 'MARGIN';
  utilityPercent: number; price: number; availability: string; sourceUrl: string; imageUrl: string; sourceCheckedAt: string | null; active: boolean;
};

const columns: { label: string; key: keyof WorkbookProduct; width: number; numeric?: boolean }[] = [
  { label: 'ID', key: 'id', width: 28 }, { label: 'Producto', key: 'name', width: 34 }, { label: 'Marca', key: 'brand', width: 20 }, { label: 'SKU / Modelo', key: 'sku', width: 19 },
  { label: 'Descripción', key: 'description', width: 48 }, { label: 'Categoría', key: 'category', width: 20 }, { label: 'Unidad', key: 'unit', width: 12 },
  { label: 'Precio publicado', key: 'sourcePrice', width: 20 }, { label: 'Moneda publicada', key: 'sourceCurrency', width: 18 },
  { label: 'Costo neto CLP', key: 'costPrice', width: 19, numeric: true }, { label: 'Regla de utilidad', key: 'utilityMode', width: 23 },
  { label: 'Utilidad (%)', key: 'utilityPercent', width: 15, numeric: true }, { label: 'Precio venta sugerido CLP', key: 'price', width: 27, numeric: true },
  { label: 'Disponibilidad informada', key: 'availability', width: 26 }, { label: 'URL del producto', key: 'sourceUrl', width: 48 },
  { label: 'Imagen', key: 'imageUrl', width: 48 }, { label: 'Consultado', key: 'sourceCheckedAt', width: 25 }, { label: 'Activo', key: 'active', width: 12 },
];

function xml(value: unknown) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function columnName(index: number) {
  let number = index + 1, result = '';
  while (number) { const remainder = (number - 1) % 26; result = String.fromCharCode(65 + remainder) + result; number = Math.floor((number - 1) / 26); }
  return result;
}

export function createProductWorkbook(products: WorkbookProduct[]) {
  const sheetRows = [columns.map(column => column.label), ...products.map(product => columns.map(column => product[column.key]))];
  const rows = sheetRows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, colIndex) => {
    const ref = `${columnName(colIndex)}${rowIndex + 1}`;
    if (rowIndex > 0 && columns[colIndex].numeric && typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${rowIndex === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  }).join('')}</row>`).join('');
  const lastColumn = columnName(columns.length - 1), lastRow = products.length + 1;
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Productos" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    'xl/styles.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF142B42"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'),
    'xl/worksheets/sheet1.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData><autoFilter ref="A1:${lastColumn}${lastRow}"/></worksheet>`),
  };
  return zipSync(files, { level: 6 });
}

function decodeXml(value: string) {
  return value.replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function textFromXml(xml: string) { return decodeXml(xml.replace(/<[^>]+>/g, '')).trim(); }

function columnIndex(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? '';
  let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return index - 1;
}

function normalizeHeader(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const headerAliases: Record<string, keyof WorkbookProduct> = {
  id: 'id', producto: 'name', nombre: 'name', name: 'name', 'producto modelo': 'name', 'nombre producto': 'name',
  marca: 'brand', brand: 'brand', sku: 'sku', modelo: 'sku', 'sku modelo': 'sku', codigo: 'sku',
  descripcion: 'description', description: 'description', categoria: 'category', category: 'category', unidad: 'unit', unit: 'unit',
  'precio publicado': 'sourcePrice', 'precio origen': 'sourcePrice', 'moneda publicada': 'sourceCurrency', moneda: 'sourceCurrency', currency: 'sourceCurrency',
  'costo neto clp': 'costPrice', 'costo neto': 'costPrice', costo: 'costPrice', 'costo compra': 'costPrice', costprice: 'costPrice',
  'regla de utilidad': 'utilityMode', utilidad: 'utilityPercent', 'utilidad porcentaje': 'utilityPercent', 'utilidad %': 'utilityPercent', utilitypercent: 'utilityPercent',
  'precio venta sugerido clp': 'price', 'precio venta': 'price', precio: 'price', price: 'price',
  'disponibilidad informada': 'availability', disponibilidad: 'availability', 'url del producto': 'sourceUrl', fuente: 'sourceUrl', 'source url': 'sourceUrl', sourceurl: 'sourceUrl',
  imagen: 'imageUrl', 'url imagen': 'imageUrl', imageurl: 'imageUrl', consultado: 'sourceCheckedAt', 'fecha consulta': 'sourceCheckedAt', activo: 'active', active: 'active',
};

export function parseProductWorkbook(input: Uint8Array) {
  const archive = unzipSync(input);
  const paths = Object.keys(archive);
  const totalBytes = paths.reduce((sum, path) => sum + archive[path].byteLength, 0);
  if (totalBytes > 30_000_000 || paths.length > 200) throw new Error('La planilla supera el tamaño máximo permitido.');
  const read = (path: string) => archive[path] ? new TextDecoder().decode(archive[path]) : '';
  const workbook = read('xl/workbook.xml');
  const relationshipId = workbook.match(/<sheet\b[^>]*r:id="([^"]+)"/)?.[1];
  const relationships = read('xl/_rels/workbook.xml.rels');
  const relationship = relationshipId && Array.from(relationships.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)).map(match => match[1]).find(attrs => new RegExp(`\\bId="${relationshipId}"`).test(attrs));
  const target = relationship?.match(/\bTarget="([^"]+)"/)?.[1] ?? 'worksheets/sheet1.xml';
  const sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  const sheet = read(sheetPath);
  if (!sheet) throw new Error('No se encontró una hoja de cálculo válida dentro del archivo.');
  const sharedStringXml = read('xl/sharedStrings.xml');
  const sharedStrings = Array.from(sharedStringXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g), match => textFromXml(match[1]));
  const rows = Array.from(sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g), match => match[1]);
  if (!rows.length || rows.length > 10001) throw new Error('La planilla debe tener encabezados y no más de 10.000 productos.');
  const readRow = (rowXml: string) => {
    const cells: string[] = [];
    for (const cell of Array.from(rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g))) {
      const attrs = cell[1], body = cell[2] ?? '', ref = attrs.match(/\br="([A-Z]+\d+)"/i)?.[1] ?? '', index = columnIndex(ref);
      if (index < 0 || index > 100) continue;
      const type = attrs.match(/\bt="([^"]+)"/)?.[1], raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
      const value = type === 's' ? sharedStrings[Number(raw)] ?? '' : type === 'inlineStr' ? textFromXml(body) : type === 'b' ? raw === '1' ? 'true' : 'false' : decodeXml(raw);
      cells[index] = value;
    }
    return cells;
  };
  const headers = readRow(rows[0]).map(normalizeHeader);
  const nameColumn = headers.findIndex(header => headerAliases[header] === 'name');
  if (nameColumn < 0) throw new Error('No se encontró la columna Producto/Nombre. Usa la planilla de respaldo como plantilla.');
  const result: { row: number; product: Partial<WorkbookProduct> }[] = [];
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const values = readRow(rows[rowIndex]);
    if (!values.some(value => String(value ?? '').trim())) continue;
    const product: Record<string, unknown> = { id: '' };
    headers.forEach((header, column) => { const key = headerAliases[header]; if (key && values[column] !== undefined) product[key] = values[column]; });
    if (!String(product.name ?? '').trim()) throw new Error(`Falta el nombre del producto en la fila ${rowIndex + 1}.`);
    result.push({ row: rowIndex + 1, product: product as Partial<WorkbookProduct> });
  }
  if (!result.length) throw new Error('La planilla no contiene productos para importar.');
  return result;
}
