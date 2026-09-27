export type UtilityMode = 'MARKUP' | 'MARGIN';

export function sellingPrice(cost: number, percent: number, mode: UtilityMode) {
  if (mode === 'MARGIN') return Math.round(cost / (1 - percent / 100));
  return Math.round(cost * (1 + percent / 100));
}
