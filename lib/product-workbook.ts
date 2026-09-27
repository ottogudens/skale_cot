import { strToU8, zipSync } from 'fflate';

export type WorkbookProduct = {
  name: string; brand: string; sku: string; description: string; category: string; unit: string;
  sourcePrice: string; sourceCurrency: string; costPrice: number | null; utilityMode: 'MARKUP' | 'MARGIN';
  utilityPercent: number; price: number; availability: string; sourceUrl: string; imageUrl: string; sourceCheckedAt: string | null;
};

const columns: { label: string; key: keyof WorkbookProduct; width: number; numeric?: boolean }[] = [
  { label: 'Producto', key: 'name', width: 34 }, { label: 'Marca', key: 'brand', width: 20 }, { label: 'SKU / Modelo', key: 'sku', width: 19 },
  { label: 'Descripción', key: 'description', width: 48 }, { label: 'Categoría', key: 'category', width: 20 }, { label: 'Unidad', key: 'unit', width: 12 },
  { label: 'Precio publicado', key: 'sourcePrice', width: 20 }, { label: 'Moneda publicada', key: 'sourceCurrency', width: 18 },
  { label: 'Costo neto CLP', key: 'costPrice', width: 19, numeric: true }, { label: 'Regla de utilidad', key: 'utilityMode', width: 23 },
  { label: 'Utilidad (%)', key: 'utilityPercent', width: 15, numeric: true }, { label: 'Precio venta sugerido CLP', key: 'price', width: 27, numeric: true },
  { label: 'Disponibilidad informada', key: 'availability', width: 26 }, { label: 'URL del producto', key: 'sourceUrl', width: 48 },
  { label: 'Imagen', key: 'imageUrl', width: 48 }, { label: 'Consultado', key: 'sourceCheckedAt', width: 25 },
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
