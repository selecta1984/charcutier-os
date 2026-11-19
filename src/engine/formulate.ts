import type { Formulation, InputKind, Line, Recipe } from './types';

/** sum of enabled additive fractions of the meat block */
export function additiveFraction(recipe: Recipe): number {
  return recipe.additives.filter((a) => a.enabled).reduce((s, a) => s + a.gramsPerKgMeatBlock / 1000, 0);
}

/** batch mass per gram of meat block: 1 + ice + additives */
export function batchFactor(recipe: Recipe): number {
  return 1 + recipe.iceFraction + additiveFraction(recipe);
}

export interface MeatParts {
  coarse: number;
  fine: number;
  fat: number;
}

/** ideal split of a meat block according to the recipe ratios */
export function idealParts(recipe: Recipe, meatBlock: number): MeatParts {
  const lean = meatBlock * (1 - recipe.fatFraction);
  return {
    coarse: lean * recipe.coarseShareOfLean,
    fine: lean * (1 - recipe.coarseShareOfLean),
    fat: meatBlock * recipe.fatFraction,
  };
}

/**
 * Build a full formulation from explicit meat parts (coarse, fine, fat).
 * Ice and additives scale with the actual meat block. No rounding.
 */
export function formulateFromParts(
  recipe: Recipe,
  parts: MeatParts,
  input: { kind: InputKind; value: number },
  lossFraction = 0,
  partsProvenance: 'calc' | 'user' = 'calc',
): Formulation {
  assertNonNegative(parts.coarse, 'coarse');
  assertNonNegative(parts.fine, 'fine');
  assertNonNegative(parts.fat, 'fat');
  if (lossFraction < 0 || lossFraction >= 1) throw new RangeError('lossFraction must be in [0,1)');

  const lean = parts.coarse + parts.fine;
  const meatBlock = lean + parts.fat;
  const ice = meatBlock * recipe.iceFraction;

  const lines: Line[] = [
    { id: 'coarse', name: `בשר רזה — טחינה גסה ${recipe.grinding.coarseMm} מ"מ`, grams: parts.coarse, provenance: partsProvenance, category: 'meat' },
    { id: 'fine', name: `בשר רזה — טחינה דקה ${recipe.grinding.fineMm} מ"מ`, grams: parts.fine, provenance: partsProvenance, category: 'meat' },
    { id: 'fat', name: `שומן בקר — טחינה דקה ${recipe.grinding.fineMm} מ"מ`, grams: parts.fat, provenance: partsProvenance, category: 'fat' },
    { id: 'ice', name: 'קרח', grams: ice, provenance: 'calc', category: 'ice' },
  ];

  let additivesTotal = 0;
  for (const a of recipe.additives) {
    if (!a.enabled) continue;
    const grams = (meatBlock * a.gramsPerKgMeatBlock) / 1000;
    additivesTotal += grams;
    lines.push({
      id: a.id,
      name: a.name,
      grams,
      provenance: a.requiresVerification ? 'needs_verification' : 'calc',
      category: a.category,
      requiresVerification: a.requiresVerification,
      safetyCritical: a.safetyCritical,
      note: a.note,
    });
  }

  const batch = meatBlock + ice + additivesTotal;
  return {
    meatBlock,
    lean,
    fat: parts.fat,
    coarse: parts.coarse,
    fine: parts.fine,
    ice,
    additivesTotal,
    batch,
    lines,
    input,
    fatPercent: meatBlock > 0 ? (parts.fat / meatBlock) * 100 : 0,
    coarsePercentOfLean: lean > 0 ? (parts.coarse / lean) * 100 : 0,
    lossFraction,
    expectedAfterLoss: lossFraction > 0 ? batch * (1 - lossFraction) : null,
  };
}

export function fromMeatBlock(recipe: Recipe, meatBlock: number, lossFraction = 0): Formulation {
  assertPositive(meatBlock, 'meatBlock');
  return formulateFromParts(recipe, idealParts(recipe, meatBlock), { kind: 'meatBlock', value: meatBlock }, lossFraction);
}

export function fromLean(recipe: Recipe, lean: number, lossFraction = 0): Formulation {
  assertPositive(lean, 'lean');
  const m = lean / (1 - recipe.fatFraction);
  return formulateFromParts(recipe, idealParts(recipe, m), { kind: 'lean', value: lean }, lossFraction);
}

export function fromFat(recipe: Recipe, fat: number, lossFraction = 0): Formulation {
  assertPositive(fat, 'fat');
  const m = fat / recipe.fatFraction;
  return formulateFromParts(recipe, idealParts(recipe, m), { kind: 'fat', value: fat }, lossFraction);
}

/**
 * From a desired batch mass that must be available for stuffing.
 * lossFraction = expected loss of prepared mixture before/during stuffing.
 * Unverified additives (incl. cure) stay inside the mass balance so the result does not shift after verification.
 */
export function fromBatch(recipe: Recipe, desiredBatch: number, lossFraction = 0): Formulation {
  assertPositive(desiredBatch, 'desiredBatch');
  if (lossFraction < 0 || lossFraction >= 1) throw new RangeError('lossFraction must be in [0,1)');
  const prepared = desiredBatch / (1 - lossFraction);
  const m = prepared / batchFactor(recipe);
  return formulateFromParts(recipe, idealParts(recipe, m), { kind: 'batch', value: desiredBatch }, lossFraction);
}

export function fromCount(recipe: Recipe, count: number, gramsEach: number, lossFraction = 0): Formulation {
  if (!Number.isInteger(count) || count <= 0) throw new RangeError('count must be a positive integer');
  assertPositive(gramsEach, 'gramsEach');
  const f = fromBatch(recipe, count * gramsEach, lossFraction);
  return { ...f, input: { kind: 'count', value: count } };
}

/** mass balance check: sum of lines equals batch */
export function sumLines(f: Formulation): number {
  return f.lines.reduce((s, l) => s + l.grams, 0);
}

function assertPositive(v: number, name: string) {
  if (!Number.isFinite(v) || v <= 0) throw new RangeError(`${name} must be a positive number`);
}
function assertNonNegative(v: number, name: string) {
  if (!Number.isFinite(v) || v < 0) throw new RangeError(`${name} must be >= 0`);
}
