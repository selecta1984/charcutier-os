import { describe, expect, it } from 'vitest';
import {
  SOURCE_RECIPE as R,
  REGULATORY_PROFILES,
  fromMeatBlock,
  fromLean,
  fromFat,
  fromBatch,
  fromCount,
  formulateFromParts,
  sumLines,
  batchFactor,
  roundForButcher,
  analyzeInventory,
  evaluateCure,
  checkSaltSwap,
  nitritePpm,
  linkVolumeCm3,
  linkWeightG,
  calibrateDensity,
  grams,
  butcherMessage,
  type CureProduct,
} from './index';

const EU = REGULATORY_PROFILES.find((p) => p.id === 'eu-2023-2108')!;
const USDA = REGULATORY_PROFILES.find((p) => p.id === 'usda-comminuted')!;

const cure06 = (verified = true): CureProduct => ({
  name: 'מלח קיור',
  manufacturer: 'בדיקה',
  nitriteFraction: 0.006,
  containsNitrate: 'no',
  restIsSalt: 'yes',
  labelInstructions: '',
  verified,
  verifiedSource: verified ? 'תווית' : '',
  verifiedAt: verified ? '2026-11-19' : null,
});

const line = (f: ReturnType<typeof fromMeatBlock>, id: string) => f.lines.find((l) => l.id === id)!.grams;

describe('בדיקה 1: מתכון בסיס 5,000 גרם', () => {
  const f = fromMeatBlock(R, 5000);
  it('בשר, שומן, טחינה, קרח', () => {
    expect(f.lean).toBeCloseTo(3500, 9);
    expect(f.fat).toBeCloseTo(1500, 9);
    expect(f.coarse).toBeCloseTo(2000, 9);
    expect(f.fine).toBeCloseTo(1500, 9);
    expect(f.ice).toBeCloseTo(750, 9);
  });
  it('תוספים כמו בדף המקור', () => {
    expect(line(f, 'salt')).toBeCloseTo(75, 9);
    expect(line(f, 'cure')).toBeCloseTo(20, 9);
    expect(line(f, 'coriander')).toBeCloseTo(25, 9);
    expect(line(f, 'nutmeg')).toBeCloseTo(2.5, 9);
    expect(f.lines.find((l) => l.id === 'phosphate')).toBeUndefined();
  });
  it('תערובת כוללת 6,080 גרם, מקדם 1.216', () => {
    expect(f.batch).toBeCloseTo(6080, 9);
    expect(batchFactor(R)).toBeCloseTo(1.216, 12);
  });
});

describe('בדיקה 2: חצי מתכון', () => {
  const f = fromMeatBlock(R, 2500);
  it('1,750 / 750 / 1,000 / 750 / 375', () => {
    expect(f.lean).toBeCloseTo(1750, 9);
    expect(f.fat).toBeCloseTo(750, 9);
    expect(f.coarse).toBeCloseTo(1000, 9);
    expect(f.fine).toBeCloseTo(750, 9);
    expect(f.ice).toBeCloseTo(375, 9);
  });
});

describe('בדיקה 3: טחינה עגולה 1,000/800/800', () => {
  const f = formulateFromParts(R, { coarse: 1000, fine: 800, fat: 800 }, { kind: 'rounded', value: 2600 });
  it('2,600 / 1,800 / 800 / 30.769%', () => {
    expect(f.meatBlock).toBe(2600);
    expect(f.lean).toBe(1800);
    expect(f.fat).toBe(800);
    expect(f.fatPercent).toBeCloseTo(30.769, 3);
    expect(f.coarsePercentOfLean).toBeCloseTo(55.556, 3);
  });
});

describe('בדיקה 4: שמירת מסה', () => {
  for (const m of [1, 777.7, 2500, 5000, 12345.678]) {
    it(`M=${m}`, () => {
      const f = fromMeatBlock(R, m);
      expect(sumLines(f)).toBeCloseTo(f.batch, 9);
      expect(f.meatBlock + f.ice + f.additivesTotal).toBeCloseTo(f.batch, 9);
    });
  }
});

describe('בדיקה 5: היפוך חישוב', () => {
  it('M → B → M', () => {
    const a = fromMeatBlock(R, 2500);
    const b = fromBatch(R, a.batch);
    expect(b.meatBlock).toBeCloseTo(2500, 9);
  });
  it('2,500 גרם תערובת → 2,055.92 גרם בשר+שומן', () => {
    expect(fromBatch(R, 2500).meatBlock).toBeCloseTo(2500 / 1.216, 9);
  });
  it('רזה ושומן כנקודות כניסה', () => {
    expect(fromLean(R, 1400).fat).toBeCloseTo(600, 9);
    expect(fromFat(R, 600).lean).toBeCloseTo(1400, 9);
  });
  it('מספר נקניקיות עם אובדן 5%: 50×60 → 3,157.9 הכנה', () => {
    const f = fromCount(R, 50, 60, 0.05);
    expect(f.batch).toBeCloseTo(3000 / 0.95, 9);
    expect(f.expectedAfterLoss).toBeCloseTo(3000, 9);
  });
  it('קיור לא מאומת נשאר במאזן המסה', () => {
    const f = fromBatch(R, 2500);
    expect(f.lines.some((l) => l.category === 'cure')).toBe(true);
  });
});

describe('בדיקה 6: מוצר קיור לא מאומת', () => {
  const f = fromMeatBlock(R, 5000);
  it('אין מוצר → חסום', () => {
    const r = evaluateCure(f, null, EU);
    expect(r.status).toBe('blocked');
    expect(r.issues.map((i) => i.code)).toContain('NO_PRODUCT');
  });
  it('לא מאומת → חסום, ppm עדיין מחושב לשקיפות', () => {
    const r = evaluateCure(f, cure06(false), EU);
    expect(r.status).toBe('blocked');
    expect(r.issues.map((i) => i.code)).toContain('NOT_VERIFIED');
    expect(r.ppm).toBeCloseTo(24, 9);
  });
  it('אין פרופיל → חסום', () => {
    expect(evaluateCure(f, cure06(true), null).status).toBe('blocked');
  });
  it('מאומת + פרופיל + משקל מתאים → מאושר', () => {
    const r = evaluateCure(f, cure06(true), EU, 1);
    expect(r.status).toBe('approved');
    expect(r.totalSaltGrams).toBeCloseTo(75 + 20 * 0.994, 9);
  });
  it('0.6% עם משקל של גרם: לא חוסם, רק הערת דיוק כשהטעות מעל 5%', () => {
    const small = fromMeatBlock(R, 1000); // 4 g cure → ±12.5%
    const r = evaluateCure(small, cure06(true), EU, 1, '2024-01-01');
    expect(r.status).toBe('approved');
    expect(r.warnings.map((w) => w.code)).toContain('SCALE_PRECISION');
    expect(evaluateCure(fromMeatBlock(R, 5000), cure06(true), EU, 1, '2024-01-01').warnings).toHaveLength(0);
  });
  it('טעות שקילה שעלולה לחצות את המגבלה → חסום, ומשקל מדויק משחרר', () => {
    const near: CureProduct = { ...cure06(true), nitriteFraction: 0.0299 }; // 119.6 ppm
    const f = fromMeatBlock(R, 5000);
    const coarse = evaluateCure(f, near, EU, 1, '2024-01-01');
    expect(coarse.ppm).toBeLessThan(120);
    expect(coarse.issues.map((i) => i.code)).toContain('SCALE');
    expect(evaluateCure(f, near, EU, 0.01, '2024-01-01').status).toBe('approved');
  });
  it('חריגה מפרופיל → חסום', () => {
    const strong: CureProduct = { ...cure06(true), nitriteFraction: 0.06 };
    const r = evaluateCure(f, strong, EU);
    expect(r.ppm).toBeCloseTo(240, 9);
    expect(r.issues.map((i) => i.code)).toContain('OVER_LIMIT');
  });
});

describe('בדיקה 7 (מתוקנת): החלפת מלח במלח קיור 1:1', () => {
  it('0.6% מאומת: 114 ppm — מותר ב-EU וב-USDA', () => {
    const e = checkSaltSwap(R, cure06(true), EU);
    expect(e.ppmAfter).toBeCloseTo(114, 9);
    expect(e.allowed).toBe(true);
    expect(checkSaltSwap(R, cure06(true), USDA).allowed).toBe(true);
  });
  it('לא מאומת → חסום', () => {
    expect(checkSaltSwap(R, cure06(false), EU).allowed).toBe(false);
  });
  it('מוצר 6% → חסום (1,140 ppm)', () => {
    const r = checkSaltSwap(R, { ...cure06(true), nitriteFraction: 0.06 }, EU);
    expect(r.ppmAfter).toBeCloseTo(1140, 9);
    expect(r.allowed).toBe(false);
  });
  it('אין מוצר → חסום', () => {
    expect(checkSaltSwap(R, null, EU).allowed).toBe(false);
  });
});

describe('בדיקה 8: נתונים סותרים', () => {
  it('סך רזה מוצהר שונה מגס+דק → אזהרה עם ההפרש, בלי תיקון', () => {
    const a = analyzeInventory(R, { coarse: 719, fine: 680, fat: 600 }, 1450);
    expect(a.leanMismatch).toEqual({ declared: 1450, sum: 1399, diff: 51 });
    expect(a.have.coarse).toBe(719);
  });
  it('תואם → אין אזהרה', () => {
    expect(analyzeInventory(R, { coarse: 719, fine: 680, fat: 600 }, 1399).leanMismatch).toBeNull();
  });
});

describe('בדיקה 9: עיגול לתצוגה בלבד', () => {
  it('הצגה לא משנה ערכים פנימיים', () => {
    const f = fromBatch(R, 2500);
    const before = f.meatBlock;
    grams(f.meatBlock);
    expect(f.meatBlock).toBe(before);
    expect(Number.isInteger(f.meatBlock)).toBe(false);
  });
  it('דיוק לפי גודל', () => {
    expect(grams(2.5)).toBe('2.5');
    expect(grams(1234.6)).toBe('1,235');
  });
});

describe('11: ppm', () => {
  it('מקור עם 0.6% = 24', () => expect(nitritePpm(20, 0.006, 5000)).toBeCloseTo(24, 12));
});

describe('12: מה שיש בבית', () => {
  const a = analyzeInventory(R, { coarse: 719, fine: 680, fat: 600 });
  it('ניתוח', () => {
    expect(a.meatBlock).toBe(1999);
    expect(a.fatPercent).toBeCloseTo(30.015, 3);
  });
  it('השלמה: יחס מדויק ותוספות לא שליליות', () => {
    const p = a.complete.parts;
    const m = p.coarse + p.fine + p.fat;
    expect(p.fat / m).toBeCloseTo(0.3, 12);
    expect(p.coarse / (p.coarse + p.fine)).toBeCloseTo(4 / 7, 12);
    for (const v of Object.values(a.complete.add)) expect(v).toBeGreaterThanOrEqual(-1e-9);
  });
  it('שימוש בחלק: יחס מדויק ושאריות לא שליליות', () => {
    const p = a.usePart.parts;
    const m = p.coarse + p.fine + p.fat;
    expect(p.fat / m).toBeCloseTo(0.3, 12);
    for (const v of Object.values(a.usePart.leftover)) expect(v).toBeGreaterThanOrEqual(-1e-9);
  });
});

describe('13: עיגול לקצב', () => {
  it('צעד 50: האפשרות הראשונה מדויקת 1,000/750/750', () => {
    const r = roundForButcher(R, 2500, 50);
    expect(r.options[0].parts).toEqual({ coarse: 1000, fine: 750, fat: 750 });
    expect(r.options[0].exact).toBe(true);
  });
  it('צעד 100: כל האפשרויות בגבולות, אף אחת לא מסומנת מדויקת בטעות', () => {
    const r = roundForButcher(R, 2500, 100);
    expect(r.options.length).toBeGreaterThan(0);
    for (const o of r.options) {
      expect(Math.abs(o.fatDevPp)).toBeLessThanOrEqual(1 + 1e-9);
      expect(Math.abs(o.grindDevPp)).toBeLessThanOrEqual(3 + 1e-9);
      expect(Math.abs(o.totalDevPct)).toBeLessThanOrEqual(5 + 1e-9);
      if (!o.exact) expect(Math.abs(o.fatDevPp) + Math.abs(o.grindDevPp) + Math.abs(o.totalDevPct)).toBeGreaterThan(0);
    }
  });
  it('1,000/800/800 נכשל בגבול שומן ±1? 30.77% → סטייה 0.77 — עובר', () => {
    const r = roundForButcher(R, 2500, 100, { fatPp: 1, grindPp: 3, totalPct: 5 }, 50);
    expect(r.options.some((o) => o.parts.coarse === 1000 && o.parts.fine === 800 && o.parts.fat === 800)).toBe(true);
  });
  it('צעד 500 על 2,500 → אין פתרון + סיבה', () => {
    const r = roundForButcher(R, 2500, 500);
    expect(r.options).toHaveLength(0);
    expect(r.reason).toBeTruthy();
  });
});

describe('14: מעטפות', () => {
  it('28 מ"מ × 12 ס"מ = 73.89 סמ"ק ≈ 74 גרם', () => {
    expect(linkVolumeCm3(28, 12)).toBeCloseTo(73.89, 2);
    expect(linkWeightG(28, 12)).toBeCloseTo(73.89, 2);
  });
  it('כיול צפיפות', () => {
    expect(calibrateDensity(28, 12, 80)).toBeCloseTo(80 / 73.8902, 4);
  });
});

describe('הודעה לקצב', () => {
  it('נבנית מהחישוב', () => {
    const msg = butcherMessage(R, { coarse: 1000, fine: 800, fat: 800 }, false);
    expect(msg).toContain('1,000 גרם בשר בטחינה גסה 8 מ"מ');
    expect(msg).toContain('800 גרם שומן בקר בטחינה דקה 3.5 מ"מ');
  });
});

describe('קלט לא תקין', () => {
  it('נדחה', () => {
    expect(() => fromMeatBlock(R, 0)).toThrow();
    expect(() => fromMeatBlock(R, NaN)).toThrow();
    expect(() => fromBatch(R, 100, 1)).toThrow();
    expect(() => fromCount(R, 2.5, 60)).toThrow();
  });
});

describe('הודעה לקצב — השלמה', () => {
  it('רכיב אפס לא מופיע', () => {
    const msg = butcherMessage(R, { coarse: 187.7, fine: 0, fat: 80 }, true);
    expect(msg).not.toContain('טחינה דקה 3.5 מ"מ\n• ');
    expect(msg).not.toMatch(/• 0 /);
    expect(msg).toContain('190 גרם בשר בטחינה גסה');
  });
});

describe('גרסה 2: כל המלח כמלח קיור', () => {
  it('19 גרם מלח קיור לק״ג, בלי מלח רגיל, 114 ppm, אותו מקדם תערובת', async () => {
    const { ALL_CURE_RECIPE, SUPPLIER_CURE } = await import('./index');
    const f = fromMeatBlock(ALL_CURE_RECIPE, 2000 / 0.7);
    expect(f.lines.find((l) => l.category === 'salt')).toBeUndefined();
    expect(f.lines.find((l) => l.category === 'cure')!.grams).toBeCloseTo((19 * 2000) / 0.7 / 1000, 9);
    expect(batchFactor(ALL_CURE_RECIPE)).toBeCloseTo(batchFactor(R), 12);
    const r = evaluateCure(f, SUPPLIER_CURE, EU, 1, '2024-01-01');
    expect(r.ppm).toBeCloseTo(114, 9);
    expect(r.status).toBe('approved');
    expect(r.totalSaltPercentOfMeatBlock).toBeCloseTo(1.9 * 0.994, 9);
  });
  it('המקור לא השתנה', () => {
    expect(R.additives.find((a) => a.id === 'salt')!.enabled).toBe(true);
    expect(R.additives.find((a) => a.id === 'cure')!.gramsPerKgMeatBlock).toBe(4);
  });
});

describe('מוצר הספק ותאריך אריזה', () => {
  it('מאומת: 0.6%, בלי ניטראט, השאר מלח', async () => {
    const { SUPPLIER_CURE } = await import('./index');
    expect(SUPPLIER_CURE.verified).toBe(true);
    expect(SUPPLIER_CURE.containsNitrate).toBe('no');
    expect(SUPPLIER_CURE.nitriteFraction).toBe(0.006);
  });
  it('תאריך שעבר → אזהרה, לא חסימה', async () => {
    const { SUPPLIER_CURE } = await import('./index');
    const r = evaluateCure(fromMeatBlock(R, 5000), SUPPLIER_CURE, EU, 1, '2026-11-19');
    expect(r.warnings.map((w) => w.code)).toContain('EXPIRED');
    expect(r.status).toBe('approved');
    expect(evaluateCure(fromMeatBlock(R, 5000), SUPPLIER_CURE, EU, 1, '2025-01-01').warnings).toHaveLength(0);
  });
});
