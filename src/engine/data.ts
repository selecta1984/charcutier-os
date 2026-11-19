import type { Recipe, RegulatoryProfile } from './types';

const perKg = (gramsPer5kg: number) => gramsPer5kg / 5;

/** Source recipe v1 — locked. Quantities from the user's recipe sheet for 5,000 g meat block. */
export const SOURCE_RECIPE: Recipe = {
  id: 'emulsion-beef-v1',
  name: 'נקניקיות אמולסיה בקר — מתכון מקור',
  version: 1,
  locked: true,
  source: 'דף מתכון מצולם (2 תמונות) + אפיון v1',
  fatFraction: 0.3,
  coarseShareOfLean: 4 / 7,
  iceFraction: 0.15,
  grinding: { coarseMm: 8, fineMm: 3.5 },
  additives: [
    { id: 'salt', name: 'מלח', category: 'salt', gramsPerKgMeatBlock: perKg(75), role: 'מסייע למיצוי חלבונים שקושרים מים ושומן', safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true },
    { id: 'cure', name: 'מלח קיור (ניטריט)', category: 'cure', gramsPerKgMeatBlock: perKg(20), role: 'קיור: צבע, טעם והגנה. מינון מחייב מוצר מאומת', safetyCritical: true, requiresVerification: true, provenance: 'source', enabled: true, note: 'בדף כתוב "6%". המשתמש אישר שהמוצר 0.6%' },
    { id: 'garlic', name: 'שום גבישי', category: 'spice', gramsPerKgMeatBlock: perKg(50), safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true },
    { id: 'paprika', name: 'פפריקה מתוקה', category: 'spice', gramsPerKgMeatBlock: perKg(25), safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true },
    { id: 'coriander', name: 'כוסברה טחונה', category: 'spice', gramsPerKgMeatBlock: perKg(25), safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true, note: 'מופיע בתמונת המתכון, חסר באפיון v1' },
    { id: 'mace', name: 'משיה', category: 'spice', gramsPerKgMeatBlock: perKg(7.5), safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true },
    { id: 'caraway', name: 'קימל טחון', category: 'spice', gramsPerKgMeatBlock: perKg(25), safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true },
    { id: 'dextrose', name: 'סוכר ענבים', category: 'sugar', gramsPerKgMeatBlock: perKg(50), role: 'איזון טעם', safetyCritical: false, requiresVerification: false, provenance: 'source', enabled: true },
    { id: 'nutmeg', name: 'מוסקט טחון', category: 'spice', gramsPerKgMeatBlock: perKg(2.5), safetyCritical: false, requiresVerification: true, provenance: 'needs_verification', enabled: true, note: 'מופיע באפיון v1, לא נראה בתמונה' },
    { id: 'brownsugar', name: 'סוכר חום', category: 'sugar', gramsPerKgMeatBlock: perKg(50), safetyCritical: false, requiresVerification: true, provenance: 'needs_verification', enabled: true, note: 'מופיע באפיון v1, לא נראה בתמונה' },
    { id: 'phosphate', name: 'פוספט', category: 'phosphate', gramsPerKgMeatBlock: 0, role: 'בהתאם לסוגו, עשוי לסייע בהחזקת מים ומיצוי חלבונים', safetyCritical: true, requiresVerification: true, provenance: 'needs_verification', enabled: false, note: 'רישום ידני בדף, לא מפוענח. כבוי עד הגדרה' },
  ],
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
