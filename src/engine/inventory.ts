import type { Recipe } from './types';
import type { MeatParts } from './formulate';
import { idealParts } from './formulate';

export interface InventoryAnalysis {
  have: MeatParts;
  lean: number;
  meatBlock: number;
  fatPercent: number;
  coarsePercentOfLean: number;
  fatDevPp: number;
  grindDevPp: number;
  /** option B: minimal additions so ratios become exact */
  complete: { parts: MeatParts; add: MeatParts };
  /** option C: largest exact batch from what is on hand */
  usePart: { parts: MeatParts; leftover: MeatParts };
  /** warning when an optional declared lean total disagrees with coarse+fine */
  leanMismatch: { declared: number; sum: number; diff: number } | null;
}

export function analyzeInventory(recipe: Recipe, have: MeatParts, declaredLeanTotal?: number | null): InventoryAnalysis {
  for (const [k, v] of Object.entries(have)) {
    if (!Number.isFinite(v) || v < 0) throw new RangeError(`${k} must be >= 0`);
  }
  const lean = have.coarse + have.fine;
  const meatBlock = lean + have.fat;
  if (meatBlock <= 0) throw new RangeError('nothing on hand');

  const fatPercent = (have.fat / meatBlock) * 100;
  const coarsePercentOfLean = lean > 0 ? (have.coarse / lean) * 100 : 0;

  // meat block implied by each component if it were exactly on ratio
  const leanFrac = 1 - recipe.fatFraction;
  const implied = [
    have.coarse / (leanFrac * recipe.coarseShareOfLean),
    have.fine / (leanFrac * (1 - recipe.coarseShareOfLean)),
    have.fat / recipe.fatFraction,
  ];
  const mMax = Math.max(...implied);
  const positive = implied.filter((x) => x > 0);
  const mMin = positive.length === 3 ? Math.min(...implied) : 0;

  const full = idealParts(recipe, mMax);
  const part = idealParts(recipe, mMin);

  let leanMismatch: InventoryAnalysis['leanMismatch'] = null;
  if (declaredLeanTotal != null && Number.isFinite(declaredLeanTotal)) {
    const diff = declaredLeanTotal - lean;
    if (Math.abs(diff) > 1) leanMismatch = { declared: declaredLeanTotal, sum: lean, diff };
  }

  return {
    have,
    lean,
    meatBlock,
    fatPercent,
    coarsePercentOfLean,
    fatDevPp: fatPercent - recipe.fatFraction * 100,
    grindDevPp: coarsePercentOfLean - recipe.coarseShareOfLean * 100,
    complete: {
      parts: full,
      add: { coarse: full.coarse - have.coarse, fine: full.fine - have.fine, fat: full.fat - have.fat },
    },
    usePart: {
      parts: part,
      leftover: { coarse: have.coarse - part.coarse, fine: have.fine - part.fine, fat: have.fat - part.fat },
    },
    leanMismatch,
  };
}
