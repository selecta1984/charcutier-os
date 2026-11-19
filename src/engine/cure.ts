import type { CureProduct, Formulation, Recipe, RegulatoryProfile } from './types';

export type GateStatus = 'approved' | 'blocked';

export interface GateIssue {
  code: 'NO_PRODUCT' | 'NO_FRACTION' | 'NOT_VERIFIED' | 'NO_PROFILE' | 'OVER_LIMIT' | 'SCALE' | 'NITRATE_UNKNOWN' | 'EXPIRED' | 'SCALE_PRECISION';
  message: string;
}

export interface CureReport {
  status: GateStatus;
  issues: GateIssue[];
  /** shown, but do not block */
  warnings: GateIssue[];
  cureGrams: number;
  nitriteMg: number | null;
  /** mg sodium nitrite per kg meat block */
  ppm: number | null;
  limitPpm: number | null;
  /** salt from regular salt + salt part of cure (when composition known), grams */
  totalSaltGrams: number | null;
  totalSaltPercentOfMeatBlock: number | null;
}

/** ppm of sodium nitrite against the meat block (lean + added fat, no ice) */
export function nitritePpm(cureGrams: number, nitriteFraction: number, meatBlockGrams: number): number {
  if (!(meatBlockGrams > 0)) throw new RangeError('meat block must be positive');
  return (cureGrams * nitriteFraction * 1_000_000) / meatBlockGrams;
}

export function evaluateCure(
  f: Formulation,
  product: CureProduct | null,
  profile: RegulatoryProfile | null,
  scaleResolutionGrams = 1,
  today: string = new Date().toISOString().slice(0, 10),
): CureReport {
  const cureLine = f.lines.find((l) => l.category === 'cure');
  const saltLine = f.lines.find((l) => l.category === 'salt');
  const cureGrams = cureLine?.grams ?? 0;
  const issues: GateIssue[] = [];

  if (!product) issues.push({ code: 'NO_PRODUCT', message: 'לא הוגדר מוצר קיור' });
  const fraction = product?.nitriteFraction ?? null;
  if (product && (fraction == null || !(fraction > 0) || fraction >= 1))
    issues.push({ code: 'NO_FRACTION', message: 'חסר אחוז נתרן ניטריט במוצר' });
  if (product && !product.verified) issues.push({ code: 'NOT_VERIFIED', message: 'המוצר לא אומת מול תווית או נתוני יצרן' });
  if (product && product.containsNitrate !== 'no')
    issues.push({ code: 'NITRATE_UNKNOWN', message: 'לא ידוע אם המוצר מכיל ניטראט — חישוב הניטראט לא נתמך' });
  if (!profile) issues.push({ code: 'NO_PROFILE', message: 'אין פרופיל רגולטורי פעיל' });

  let ppm: number | null = null;
  let nitriteMg: number | null = null;
  if (cureGrams > 0 && fraction != null && fraction > 0 && fraction < 1) {
    ppm = nitritePpm(cureGrams, fraction, f.meatBlock);
    nitriteMg = cureGrams * fraction * 1000;
    if (profile && ppm > profile.maxPpmAsSodiumNitrite + 1e-9)
      issues.push({
        code: 'OVER_LIMIT',
        message: `${round1(ppm)} מ"ג/ק"ג חורג מהמגבלה ${profile.maxPpmAsSodiumNitrite} (${profile.name})`,
      });
  }

  const warnings: GateIssue[] = [];

  // weighing error is ± half the scale resolution; it matters through its effect on nitrite
  if (cureGrams > 0 && fraction != null && fraction > 0 && fraction < 1) {
    const halfRes = scaleResolutionGrams / 2;
    const ppmErr = (halfRes * fraction * 1_000_000) / f.meatBlock;
    if (ppm != null && profile && ppm <= profile.maxPpmAsSodiumNitrite && ppm + ppmErr > profile.maxPpmAsSodiumNitrite + 1e-9)
      issues.push({
        code: 'SCALE',
        message: `טעות שקילה של ±${halfRes} גרם עלולה להעביר את הניטריט מעל ${profile.maxPpmAsSodiumNitrite} — צריך משקל מדויק יותר`,
      });
    else if (halfRes / cureGrams > 0.05)
      warnings.push({
        code: 'SCALE_PRECISION',
        message: `במשקל של ${scaleResolutionGrams} גרם, ${round1(cureGrams)} גרם מלח קיור נשקלים בדיוק של ±${round1((halfRes / cureGrams) * 100)}% (±${round1(ppmErr)} מ״ג/ק״ג ניטריט). זה בתוך המגבלה; משקל 0.1 גרם ידייק יותר.`,
      });
  }
  if (product?.bestBefore && product.bestBefore < today)
    warnings.push({
      code: 'EXPIRED',
      message: `על האריזה כתוב "להשתמש לפני ${formatDate(product.bestBefore)}" — התאריך עבר. ניטריט עלול להתפרק עם הזמן, והקיור יהיה חלש מהמחושב. מומלץ אריזה טרייה.`,
    });

  let totalSaltGrams: number | null = null;
  // regular salt may be absent when all salt comes from the curing salt
  const regularSalt = saltLine?.grams ?? 0;
  if (cureGrams === 0) totalSaltGrams = saltLine ? regularSalt : null;
  else if (product?.restIsSalt === 'yes' && fraction != null) totalSaltGrams = regularSalt + cureGrams * (1 - fraction);

  return {
    status: issues.length === 0 ? 'approved' : 'blocked',
    issues,
    warnings,
    cureGrams,
    nitriteMg,
    ppm,
    limitPpm: profile?.maxPpmAsSodiumNitrite ?? null,
    totalSaltGrams,
    totalSaltPercentOfMeatBlock: totalSaltGrams != null ? (totalSaltGrams / f.meatBlock) * 100 : null,
  };
}

export interface SaltSwapCheck {
  allowed: boolean;
  ppmAfter: number | null;
  reason: string;
}

/** Replace all regular salt with cure product 1:1 and check the resulting nitrite level. */
export function checkSaltSwap(
  recipe: Recipe,
  product: CureProduct | null,
  profile: RegulatoryProfile | null,
): SaltSwapCheck {
  const salt = recipe.additives.find((a) => a.category === 'salt' && a.enabled)?.gramsPerKgMeatBlock ?? 0;
  const cure = recipe.additives.find((a) => a.category === 'cure' && a.enabled)?.gramsPerKgMeatBlock ?? 0;
  if (!product || product.nitriteFraction == null || !(product.nitriteFraction > 0))
    return { allowed: false, ppmAfter: null, reason: 'אין מוצר קיור עם אחוז ניטריט ידוע — אי אפשר לחשב' };
  const ppmAfter = nitritePpm(salt + cure, product.nitriteFraction, 1000);
  if (!product.verified)
    return { allowed: false, ppmAfter, reason: 'המוצר לא מאומת — ההחלפה חסומה עד אימות' };
  if (!profile) return { allowed: false, ppmAfter, reason: 'אין פרופיל רגולטורי פעיל' };
  if (ppmAfter > profile.maxPpmAsSodiumNitrite + 1e-9)
    return { allowed: false, ppmAfter, reason: `אחרי החלפה: ${round1(ppmAfter)} מ"ג/ק"ג — חורג מ-${profile.maxPpmAsSodiumNitrite}` };
  return { allowed: true, ppmAfter, reason: `אחרי החלפה: ${round1(ppmAfter)} מ"ג/ק"ג — בתוך ${profile.name}` };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
