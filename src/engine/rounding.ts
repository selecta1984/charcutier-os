import type { Recipe } from './types';
import { idealParts, type MeatParts } from './formulate';

export interface RoundingTolerances {
  /** allowed deviation of fat share, percentage points */
  fatPp: number;
  /** allowed deviation of coarse share of lean, percentage points */
  grindPp: number;
  /** allowed deviation of total meat block from target, percent */
  totalPct: number;
}

export const DEFAULT_TOLERANCES: RoundingTolerances = { fatPp: 1, grindPp: 3, totalPct: 5 };

export interface RoundingOption {
  parts: MeatParts;
  total: number;
  fatPercent: number;
  coarsePercentOfLean: number;
  fatDevPp: number;
  grindDevPp: number;
  totalDevPct: number;
  score: number;
  exact: boolean;
}

export interface RoundingResult {
  ideal: MeatParts;
  options: RoundingOption[];
  /** reason when no option fits the tolerances */
  reason: string | null;
}

/** how "round" a number is for a butcher: bigger bonus for multiples of 500, 250, 100 */
function roundness(g: number): number {
  if (g % 500 === 0) return 3;
  if (g % 250 === 0) return 2;
  if (g % 100 === 0) return 1;
  return 0;
}

export function evaluate(recipe: Recipe, parts: MeatParts, target: number, tol: RoundingTolerances): RoundingOption {
  const lean = parts.coarse + parts.fine;
  const total = lean + parts.fat;
  const fatPercent = total > 0 ? (parts.fat / total) * 100 : 0;
  const coarsePercentOfLean = lean > 0 ? (parts.coarse / lean) * 100 : 0;
  const fatDevPp = fatPercent - recipe.fatFraction * 100;
  const grindDevPp = coarsePercentOfLean - recipe.coarseShareOfLean * 100;
  const totalDevPct = ((total - target) / target) * 100;
  const score =
    Math.abs(fatDevPp) / tol.fatPp +
    Math.abs(grindDevPp) / tol.grindPp +
    Math.abs(totalDevPct) / tol.totalPct -
    0.05 * (roundness(parts.coarse) + roundness(parts.fine) + roundness(parts.fat));
  const eps = 1e-9;
  return {
    parts,
    total,
    fatPercent,
    coarsePercentOfLean,
    fatDevPp,
    grindDevPp,
    totalDevPct,
    score,
    exact: Math.abs(fatDevPp) < eps && Math.abs(grindDevPp) < eps && Math.abs(totalDevPct) < eps,
  };
}

export function withinTolerance(o: RoundingOption, tol: RoundingTolerances): boolean {
  const eps = 1e-9;
  return (
    Math.abs(o.fatDevPp) <= tol.fatPp + eps &&
    Math.abs(o.grindDevPp) <= tol.grindPp + eps &&
    Math.abs(o.totalDevPct) <= tol.totalPct + eps
  );
}

/**
 * Butcher Smart Rounding: search multiples of `step` around the ideal split.
 * Returns up to `limit` options inside tolerances, best first. Never relabels a deviation as exact.
 */
export function roundForButcher(
  recipe: Recipe,
  targetMeatBlock: number,
  step: number,
  tol: RoundingTolerances = DEFAULT_TOLERANCES,
  limit = 4,
): RoundingResult {
  if (!(targetMeatBlock > 0)) throw new RangeError('target must be positive');
  if (!(step > 0)) throw new RangeError('step must be positive');
  const ideal = idealParts(recipe, targetMeatBlock);

  const candidates = (x: number) => {
    const out: number[] = [];
    const base = Math.round(x / step);
    for (let k = base - 3; k <= base + 3; k++) if (k >= 1) out.push(k * step);
    return out;
  };

  const options: RoundingOption[] = [];
  for (const c of candidates(ideal.coarse))
    for (const g of candidates(ideal.fine))
      for (const f of candidates(ideal.fat)) {
        const o = evaluate(recipe, { coarse: c, fine: g, fat: f }, targetMeatBlock, tol);
        if (withinTolerance(o, tol)) options.push(o);
      }

  options.sort((a, b) => a.score - b.score);
  const seen = new Set<string>();
  const unique = options.filter((o) => {
    const k = `${o.parts.coarse}|${o.parts.fine}|${o.parts.fat}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const reason =
    unique.length === 0
      ? `אין צירוף בכפולות של ${step} גרם שעומד בגבולות (שומן ±${tol.fatPp}, טחינה ±${tol.grindPp} נק' אחוז, משקל ±${tol.totalPct}%). נסה צעד קטן יותר או הרחב גבולות.`
      : null;
  return { ideal, options: unique.slice(0, limit), reason };
}
