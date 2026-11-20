import { describe, expect, it } from 'vitest';
import { ALL_CURE_RECIPE, SOURCE_RECIPE, fromLean } from '../engine';
import { buildCookSteps, estimateLinks, makeSnapshot } from './steps';

describe('מצב הכנה', () => {
  const f = fromLean(SOURCE_RECIPE, 2000);
  const snap = makeSnapshot(f, SOURCE_RECIPE);
  const steps = buildCookSteps(snap);

  it('שתי הקערות יחד = כל התבלינים בדיוק', () => {
    const spices = steps.find((s) => s.id === 'spices')!;
    const half = spices.amounts!.reduce((a, x) => a + x.grams, 0);
    expect(half * 2).toBeCloseTo(f.additivesTotal, 9);
  });
  it('משקלי הטחינה והקרח כמו בדף העבודה', () => {
    expect(steps.find((s) => s.id === 'grind-coarse')!.amounts![0].grams).toBeCloseTo(f.coarse, 9);
    expect(steps.find((s) => s.id === 'grind-fine')!.amounts![0].grams).toBeCloseTo(f.fine, 9);
    expect(steps.find((s) => s.id === 'grind-fat')!.amounts![0].grams).toBeCloseTo(f.fat, 9);
    expect(steps.find((s) => s.id === 'ice')!.amounts![0].grams).toBeCloseTo(f.ice, 9);
  });
  it('טיימרים מהמתכון: שעה, רבע שעה, חצי שעה', () => {
    expect(steps.filter((s) => s.timerMin).map((s) => s.timerMin)).toEqual([60, 15, 30]);
  });
  it('מזהי שלבים ייחודיים, מתחיל בציוד ונגמר בסיום', () => {
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
    expect(steps[0].id).toBe('tools');
    expect(steps.at(-1)!.id).toBe('done');
  });
  it('גרסה 2: אין מלח רגיל בקערות, מלח קיור מודגש', () => {
    const s2 = buildCookSteps(makeSnapshot(fromLean(ALL_CURE_RECIPE, 2000), ALL_CURE_RECIPE)).find((s) => s.id === 'spices')!;
    expect(s2.amounts!.some((a) => a.label === 'מלח')).toBe(false);
    expect(s2.amounts!.find((a) => a.emphasis)!.grams).toBeCloseTo((19 * 2000) / 0.7 / 1000 / 2, 9);
  });
  it('הערכת כמות נקניקיות', () => {
    expect(estimateLinks(f.batch)).toBe(Math.floor(f.batch / (Math.PI * 1.4 * 1.4 * 20)));
  });
});

describe('סבבים במעבד המזון', () => {
  it('1,897 גרם בשר, מעבד של 1 ק״ג → 2 סבבים, כל סבב חצי', async () => {
    const { processorRounds } = await import('./steps');
    const f = fromLean(SOURCE_RECIPE, 1897);
    expect(processorRounds(f.fine, f.fat, 1000)).toBe(2);
    const steps = buildCookSteps(makeSnapshot(f, SOURCE_RECIPE, 1000));
    expect(steps).toHaveLength(20);
    expect(steps.find((s) => s.id === 'r2-fat')!.amounts![0].grams).toBeCloseTo(f.fat / 2, 9);
    expect(steps.find((s) => s.id === 'r1-process')!.amounts![0].grams).toBeCloseTo(f.ice / 2, 9);
    const sp = steps.find((s) => s.id === 'spices')!;
    const total = sp.amounts!.reduce((a, x) => a + x.grams, 0) * 2 + sp.amounts2!.reduce((a, x) => a + x.grams, 0);
    expect(total).toBeCloseTo(f.additivesTotal, 9);
  });
  it('פוספט ל-1,897 גרם בשר רזה = 3.25 גרם', () => {
    const f = fromLean(SOURCE_RECIPE, 1897);
    expect(f.lines.find((l) => l.id === 'phosphate')!.grams).toBeCloseTo(3.252, 9);
  });
  it('כמות קטנה → סבב אחד', async () => {
    const { processorRounds } = await import('./steps');
    expect(processorRounds(400, 200, 1000)).toBe(1);
    expect(processorRounds(500, 500, 1000)).toBe(1);
  });
});
