import { describe, expect, it } from 'vitest';
import { SOURCE_RECIPE, fromMeatBlock } from './engine';
import { applyConfirmations } from './store';

describe('תשובות משתמש על רכיבים', () => {
  it('"להוריד" מוציא מהחישוב, "כן" מוריד סימון אימות', () => {
    const r = applyConfirmations(SOURCE_RECIPE, { mace: 'remove', paprika: 'keep' });
    const f = fromMeatBlock(r, 5000);
    expect(f.lines.find((l) => l.id === 'mace')).toBeUndefined();
    expect(f.lines.find((l) => l.id === 'paprika')!.requiresVerification).toBe(false);
    expect(f.batch).toBeCloseTo(6027.5 - 7.5, 9);
  });
  it('בלי תשובות — המתכון ללא שינוי', () => {
    expect(applyConfirmations(SOURCE_RECIPE, {})).toBe(SOURCE_RECIPE);
  });
});
