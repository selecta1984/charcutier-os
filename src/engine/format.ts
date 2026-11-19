import type { MeatParts } from './formulate';
import type { Recipe } from './types';

const nf0 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 });

/** display-only rounding; precision follows magnitude */
export function grams(g: number): string {
  const a = Math.abs(g);
  if (a >= 100) return nf0.format(g);
  if (a >= 10) return nf1.format(g);
  return nf2.format(g);
}

/** whole grams — for meat and fat */
export function gramsInt(g: number): string {
  return nf0.format(Math.round(g));
}

/** one decimal — for spices, salt, cure */
export function grams1(g: number): string {
  return nf1.format(Math.round(g * 10) / 10);
}

export function pct(x: number, digits = 1): string {
  return new Intl.NumberFormat('he-IL', { maximumFractionDigits: digits }).format(x) + '%';
}

export function signed(x: number, digits = 1): string {
  const s = new Intl.NumberFormat('he-IL', { maximumFractionDigits: digits }).format(Math.abs(x));
  if (Math.abs(x) < 0.5 * 10 ** -digits) return '0';
  // isolate as LTR so the sign stays on the left inside Hebrew text
  return '\u2066' + (x > 0 ? '+' : '−') + s + '\u2069';
}

/** round meat parts for ordering from a butcher (nearest 10 g) */
export function butcherRound(g: number): number {
  return Math.round(g / 10) * 10;
}

export function butcherMessage(recipe: Recipe, parts: MeatParts, roundTo10: boolean): string {
  const c = roundTo10 ? butcherRound(parts.coarse) : parts.coarse;
  const f = roundTo10 ? butcherRound(parts.fine) : parts.fine;
  const t = roundTo10 ? butcherRound(parts.fat) : parts.fat;
  const items: [number, string][] = [
    [c, `גרם בשר בטחינה גסה ${recipe.grinding.coarseMm} מ"מ`],
    [f, `גרם בשר בטחינה דקה ${recipe.grinding.fineMm} מ"מ`],
    [t, `גרם שומן בקר בטחינה דקה ${recipe.grinding.fineMm} מ"מ`],
  ];
  return [
    'אני צריך בשר בקר רזה ושומן בקר לנקניקיות אמולסיה:',
    // skip parts that round to nothing (e.g. top-up orders)
    ...items.filter(([g]) => g >= 5).map(([g, label]) => `• ${nf0.format(g)} ${label}`),
    'לארוז כל חלק בנפרד ולשמור קר מאוד.',
  ].join('\n');
}

export function whatsappLink(text: string): string {
  return 'https://wa.me/?text=' + encodeURIComponent(text);
}
