import { describe, expect, it } from 'vitest';
import { SOURCE_RECIPE, fromMeatBlock } from './engine';
import { applyConfirmations } from './store';

describe('אישור מוסקט וסוכר חום', () => {
  it('"להוריד" מוציא מהחישוב, "כן" מוריד את סימון האימות', () => {
    const r = applyConfirmations(SOURCE_RECIPE, { nutmeg: 'remove', brownsugar: 'keep' });
    const f = fromMeatBlock(r, 5000);
    expect(f.lines.find((l) => l.id === 'nutmeg')).toBeUndefined();
    const bs = f.lines.find((l) => l.id === 'brownsugar')!;
    expect(bs.grams).toBeCloseTo(50, 9);
    expect(bs.requiresVerification).toBe(false);
    expect(f.batch).toBeCloseTo(6080 - 2.5, 9);
  });
  it('בלי תשובות — המתכון ללא שינוי', () => {
    expect(applyConfirmations(SOURCE_RECIPE, {})).toBe(SOURCE_RECIPE);
    expect(SOURCE_RECIPE.additives.find((a) => a.id === 'nutmeg')!.requiresVerification).toBe(true);
  });
});
