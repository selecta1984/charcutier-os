import type { CureProduct, Recipe, RegulatoryProfile } from './types';

const perKg = (gramsPer5kg: number) => gramsPer5kg / 5;

/** Source recipe v1 — locked. Quantities from the user's recipe sheet for 5,000 g meat block. */
export const SOURCE_RECIPE: Recipe = {
  id: 'emulsion-beef-v1',
  name: 'נקניקיות אמולסיה בקר — מתכון מקור',
  version: 1,
  locked: true,
  source: 'דף המתכון "נקניקית עגל קנקר׳ס" (MEATSHOPS)',
  fatFraction: 0.3,
  coarseShareOfLean: 4 / 7,
  iceFraction: 0.15,
  grinding: { coarseMm: 8, fineMm: 3.5 },
  additives: [
    { id: 'salt', name: 'מלח', category: 'salt', gramsPerKgMeatBlock: perKg(75), role: 'מסייע למיצוי חלבונים שקושרים מים ושומן', safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true },
    { id: 'cure', name: 'מלח קיור (ניטריט)', category: 'cure', gramsPerKgMeatBlock: perKg(20), role: 'קיור: צבע, טעם והגנה. מינון מחייב מוצר מאומת', safetyCritical: true, requiresVerification: true, provenance: 'source', enabled: true, note: 'בדף המתכון כתוב "6%"; על השקית: 0.6%' },
    { id: 'garlic', name: 'שום גבישי', category: 'spice', gramsPerKgMeatBlock: perKg(50), safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true },
    { id: 'paprika', name: 'פפריקה מתוקה', category: 'spice', gramsPerKgMeatBlock: perKg(25), safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true },
    { id: 'coriander', name: 'כוסברה טחונה', category: 'spice', gramsPerKgMeatBlock: perKg(25), safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true, note: undefined },
    { id: 'mace', name: 'משיה', category: 'spice', gramsPerKgMeatBlock: perKg(7.5), safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true },
    { id: 'caraway', name: 'קימל טחון', category: 'spice', gramsPerKgMeatBlock: perKg(25), safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true },
    { id: 'dextrose', name: 'סוכר ענבים', category: 'sugar', gramsPerKgMeatBlock: perKg(50), role: 'איזון טעם', safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true },
    { id: 'phosphate', name: 'פוספט', category: 'phosphate', gramsPerKgMeatBlock: 0, role: 'בהתאם לסוגו, עשוי לסייע בהחזקת מים ומיצוי חלבונים', safetyCritical: true, requiresVerification: true, provenance: 'needs_verification', enabled: false, note: 'בדף בכתב יד: 6 גרם ל-5 ק״ג (0.12%). סוג הפוספט לא ידוע — כבוי עד שיוגדר' },
  ],
};

/**
 * Recipe v2 — same total salt as the source (19 g per kg meat block), all of it as 0.6% curing salt.
 * Follows the supplier's guidance for heat-treated products (15–20 g). Source v1 stays untouched.
 */
export const ALL_CURE_RECIPE: Recipe = {
  ...SOURCE_RECIPE,
  id: 'emulsion-beef-v2-all-cure',
  name: 'נקניקיות אמולסיה בקר — כל המלח כמלח קיור',
  version: 2,
  source: 'נגזר ממתכון המקור. מלח רגיל 15 + מלח קיור 4 גרם לק״ג → מלח קיור 19 גרם לק״ג',
  additives: SOURCE_RECIPE.additives.map((a) =>
    a.category === 'salt'
      ? { ...a, enabled: false, note: 'מוחלף במלח קיור' }
      : a.category === 'cure'
        ? {
            ...a,
            gramsPerKgMeatBlock: 19,
            provenance: 'recommendation' as const,
            note: 'הספק: למוצר שעובר טיפול תרמי 15–20 גרם. כאן 19 — אותה כמות מלח כוללת כמו במקור',
          }
        : a,
  ),
};

export const RECIPES: Recipe[] = [SOURCE_RECIPE, ALL_CURE_RECIPE];

/** the user's curing salt — from the pack label and the supplier's answers (19.11.2026) */
export const SUPPLIER_CURE: CureProduct = {
  name: 'מלח כיור 0.6% (ניטריט)',
  manufacturer: 'תבליני בר (ר.ב) בע״מ, ברקן · דרך הספק ארטיום',
  nitriteFraction: 0.006,
  containsNitrate: 'no',
  restIsSalt: 'yes',
  labelInstructions: 'אין מינון יצרן. לפי הספק: מוצר שעובר טיפול תרמי 15–20 גרם, מוצר יבש 25–30 גרם (לק״ג בשר).',
  verified: true,
  verifiedSource: 'תווית: 0.6% ניטריט. הספק ארטיום: ניטריט בלבד (בלי ניטראט), 99.4% מלח שולחן',
  verifiedAt: '2026-11-19',
  bestBefore: '2025-03-06',
};

export const REGULATORY_PROFILES: RegulatoryProfile[] = [
  {
    id: 'eu-2023-2108',
    name: 'EU 2023/2108 — מוצרי בשר כללי',
    maxPpmAsSodiumNitrite: 120,
    basis: 'כמות שנוספה בייצור. האפליקציה מחשבת על בשר+שומן (מחמיר)',
    source: 'Commission Decision (EU) 2024/1225 — 80 mg/kg כיון ניטריט = 120 mg/kg כנתרן ניטריט',
    sourceUrl: 'https://eur-lex.europa.eu/eli/dec/2024/1225/oj/eng',
    versionDate: '2025-10-09',
    scope: 'מוצרי בשר כללי (לא מעוקרים, לא מסורתיים)',
  },
  {
    id: 'usda-comminuted',
    name: 'USDA FSIS — בשר טחון',
    maxPpmAsSodiumNitrite: 156,
    basis: 'Meat block (בשר+שומן)',
    source: 'FSIS Sausage Operations Equations Quick Reference — 0.25 oz ל-100 lb',
    sourceUrl: 'https://www.fsis.usda.gov/sites/default/files/media_file/2021-11/FPLIC-Sausage-Operations-Equations-Quick-Reference.pdf',
    versionDate: '2021-11',
    scope: 'מוצרים טחונים (comminuted)',
  },
];
