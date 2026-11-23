export type UtilityMode = 'MARKUP' | 'MARGIN';
export type SourcePriceTaxType = 'UNKNOWN' | 'NET' | 'GROSS';

export function sellingPrice(cost: number, percent: number, mode: UtilityMode) {
  if (mode === 'MARGIN') return Math.round(cost / (1 - percent / 100));
  return Math.round(cost * (1 + percent / 100));
}

export function netPriceFromGross(gross: number, taxRate = 19) {
  return Math.round(gross / (1 + taxRate / 100));
}

/** Parses a published Chilean peso price while rejecting ambiguous decimal values. */
export function clpPriceFromText(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  const parsed = Number(digits);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
