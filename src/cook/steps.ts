import type { Formulation, Recipe } from '../engine';
import { linkWeightG } from '../engine';

/** Frozen amounts for one cooking session, so a refresh or a later change in the calculator never shifts them. */
export interface CookSnapshot {
  createdAt: string;
  recipeName: string;
  recipeVersion: number;
  coarseMm: number;
  fineMm: number;
  coarse: number;
  fine: number;
  fat: number;
  ice: number;
  batch: number;
  /** food-processor rounds for the paste (fine meat + fat) */
  rounds: number;
  additives: { id: string; name: string; grams: number; isCure: boolean }[];
}

/** rounds needed so each run of fine meat + fat stays within the processor's capacity */
export function processorRounds(fine: number, fat: number, capacity: number): number {
  if (!(capacity > 0)) return 1;
  return Math.max(1, Math.ceil((fine + fat) / capacity - 1e-9));
}

export function makeSnapshot(f: Formulation, recipe: Recipe, processorCapacity = Infinity): CookSnapshot {
  return {
    createdAt: new Date().toISOString(),
    recipeName: recipe.name,
    recipeVersion: recipe.version,
    coarseMm: recipe.grinding.coarseMm,
    fineMm: recipe.grinding.fineMm,
    coarse: f.coarse,
    fine: f.fine,
    fat: f.fat,
    ice: f.ice,
    batch: f.batch,
    rounds: processorRounds(f.fine, f.fat, processorCapacity),
    additives: f.lines
      .filter((l) => !['meat', 'fat', 'ice'].includes(l.category))
      .map((l) => ({ id: l.id, name: l.name, grams: l.grams, isCure: l.category === 'cure' })),
  };
}

export interface Amount {
  label: string;
  grams: number;
  /** checkable while weighing */
  checkId?: string;
  emphasis?: boolean;
}

export interface CookStep {
  id: string;
  section: string;
  title: string;
  lines?: string[];
  /** lines rendered as a tick list */
  checklist?: { id: string; label: string }[];
  amounts?: Amount[];
  amountsTitle?: string;
  /** second weighing list (e.g. bowl B) */
  amounts2?: Amount[];
  amounts2Title?: string;
  target?: string;
  timerMin?: number;
  warn?: string[];
  tip?: string[];
  source?: string;
  confirm?: { id: string; label: string };
  /** show the explanation above the weighing lists */
  linesFirst?: boolean;
}

/** sausages per batch for a 28 mm casing and ~20 cm links (estimate only) */
export function estimateLinks(batch: number): number {
  return Math.floor(batch / linkWeightG(28, 20));
}

/**
 * Preparation steps from the recipe sheet "נקניקית עגל קנקר׳ס" (MEATSHOPS), rewritten as one action per screen.
 * Amounts come from the snapshot; spices are split into two equal bowls as the sheet adds them in two halves.
 */
export function buildCookSteps(s: CookSnapshot): CookStep[] {
  const mm = (x: number) => `${x} מ״מ`;
  const half: Amount[] = s.additives.map((a) => ({ label: a.name, grams: a.grams / 2, checkId: `w-${a.id}`, emphasis: a.isCure }));
  const links = estimateLinks(s.batch);
  const n = Math.max(1, s.rounds ?? 1);
  const bowlNames = Array.from({ length: n }, (_, k) => `א׳${k + 1}`).join(', ');
  const perRound: Amount[] = s.additives.map((a) => ({ label: a.name, grams: a.grams / 2 / n, checkId: `wa-${a.id}`, emphasis: a.isCure }));
  const cureWarn = s.additives.some((a) => a.isCure) ? ['מלח קיור — לשקול בדיוק את הכמות שמופיעה, לא "בערך".'] : undefined;
  return [
    {
      id: 'tools',
      section: 'הכנות',
      title: 'מכינים ציוד',
      checklist: [
        { id: 't-grinder', label: `מטחנה עם דיסקיות ${mm(s.coarseMm)} ו-${mm(s.fineMm)}` },
        { id: 't-processor', label: 'מעבד מזון (מגימיקס)' },
        { id: 't-stuffer', label: 'מנקנקת ושרוולי קולגן 28 מ״מ (אפשר טבעיים)' },
        { id: 't-scale', label: 'משקל ומדחום ליבה' },
        { id: 't-bowls', label: '2 קערות קטנות לתבלינים וקערה גדולה' },
        { id: 't-end', label: 'מעשנה, סיר מים וקערת מי קרח לסוף' },
      ],
    },
    n === 1
      ? {
          id: 'spices',
          linesFirst: true,
          section: 'הכנות',
          title: 'שוקלים תבלינים לשתי קערות',
          lines: ['שוקלים את הכמות הזו פעמיים — לקערה א׳ ולקערה ב׳.', 'קערה א׳ נכנסת עם הבשר הדק, קערה ב׳ בסוף.'],
          amountsTitle: 'בכל קערה',
          amounts: half,
          warn: cureWarn,
        }
      : {
          id: 'spices',
          linesFirst: true,
          section: 'הכנות',
          title: `שוקלים תבלינים ל-${n + 1} קערות`,
          lines: [`${bowlNames} — אחת לכל סבב במעבד המזון.`, 'קערה ב׳ נכנסת בסוף, עם הבשר הגס.'],
          amountsTitle: `בכל אחת מהקערות ${bowlNames}`,
          amounts: perRound,
          amounts2Title: 'בקערה ב׳ (לסוף)',
          amounts2: half.map((a) => ({ ...a, checkId: `wb-${a.checkId}` })),
          warn: cureWarn,
        },
    {
      id: 'ice',
      section: 'הכנות',
      title: 'שוקלים קרח',
      amounts: [{ label: 'קרח', grams: s.ice }],
      lines: ['שומרים במקפיא עד שלב המשחה.'],
    },
    {
      id: 'grind-coarse',
      section: 'טחינה',
      title: 'טוחנים בשר גס',
      amounts: [{ label: `בשר רזה · דיסקית ${mm(s.coarseMm)}`, grams: s.coarse }],
      lines: ['שומרים בצד במקרר — הוא נכנס רק בסוף.'],
    },
    {
      id: 'grind-fine',
      section: 'טחינה',
      title: 'טוחנים בשר דק',
      amounts: [{ label: `בשר רזה · דיסקית ${mm(s.fineMm)}`, grams: s.fine }],
    },
    {
      id: 'grind-fat',
      section: 'טחינה',
      title: 'טוחנים שומן ← למקפיא',
      amounts: [{ label: `שומן · דיסקית ${mm(s.fineMm)}`, grams: s.fat }],
      lines: ['מכניסים למקפיא לזמן קצר — הוא צריך להיות קפוא כשמוסיפים אותו למשחה.'],
    },
    ...Array.from({ length: n }, (_, k) => {
      const r = k + 1;
      const tag = n > 1 ? `סבב ${r}: ` : '';
      const section = n > 1 ? `משחה · סבב ${r} מתוך ${n}` : 'משחה';
      const bowl = n > 1 ? `קערה א׳${r}` : 'קערה א׳';
      const steps: CookStep[] = [
        {
          id: `r${r}-spice`,
          section,
          title: `${tag}בשר דק + ${bowl}`,
          lines: [`מערבבים את ${bowl} עם הבשר הדק.`],
          amounts: [{ label: 'בשר דק', grams: s.fine / n }],
          tip: n > 1 && r === 1 ? [`מעבד המזון לוקח עד כ-1 ק״ג בשר, לכן המשחה נעשית ב-${n} סבבים זהים.`] : undefined,
        },
        {
          id: `r${r}-process`,
          section,
          title: `${tag}מעבד מזון + קרח`,
          lines: ['מכניסים למעבד המזון ועובדים בפולסים עד מרקם של משחה.', 'תוך כדי מוסיפים את הקרח בהדרגה — כדי שהבשר יישאר קר.'],
          amounts: [{ label: 'קרח', grams: s.ice / n }],
        },
        {
          id: `r${r}-fat`,
          section,
          title: `${tag}מוסיפים שומן קפוא`,
          lines: ['מוסיפים למשחה ומערבבים בעדינות.', ...(n > 1 ? ['מעבירים את המשחה לקערה הגדולה.'] : [])],
          amounts: [{ label: 'שומן קפוא', grams: s.fat / n }],
          tip: n > 1 && r < n ? ['את שאר השומן משאירים במקפיא עד הסבב הבא.'] : undefined,
        },
      ];
      return steps;
    }).flat(),
    {
      id: 'combine',
      section: 'משחה',
      title: 'מחברים הכול',
      lines: [n > 1 ? 'כל המשחה מכל הסבבים — בקערה הגדולה.' : 'מעבירים את המשחה לקערה הגדולה.', 'מוסיפים את הבשר הגס ואת קערה ב׳ (שאר התבלינים).', 'מערבבים היטב.'],
      amounts: [{ label: 'בשר גס', grams: s.coarse }],
    },
    {
      id: 'sticky',
      section: 'משחה',
      title: 'בדיקת מוכנות',
      lines: ['נוגעים בתערובת: כשהבשר נדבק ליד בקלות — מוכנים למילוי.'],
      confirm: { id: 'c-sticky', label: 'הבשר נדבק ליד' },
    },
    {
      id: 'stuff',
      section: 'מילוי',
      title: 'ממלאים לשרוולים',
      lines: ['מכניסים את התערובת למנקנקת וממלאים לשרוולי קולגן 28 מ״מ (אפשר טבעיים).'],
      warn: ['בלי כיסי אוויר בשרוול.'],
    },
    {
      id: 'tie',
      section: 'מילוי',
      title: 'קושרים נקניקיות',
      lines: ['קושרים כל נקניקייה באורך של כ-20 ס״מ. אפשר בזוגות.'],
      tip: links > 0 ? [`יצאו בערך ${links} נקניקיות (הערכה לשרוול 28 מ״מ).`] : undefined,
    },
    {
      id: 'smoke',
      section: 'עישון ובישול',
      title: 'מעשנה — שעה ב-70°C',
      target: 'תא המעשנה: 70°C',
      timerMin: 60,
      warn: ['טמפרטורה גבוהה מפרקת את השומן — לשמור על 70°C מדויק.', 'דיווחת שהמינימום במעשנה שלך הוא כ-90°C. מדוד את טמפרטורת התא בפועל.'],
    },
    {
      id: 'water',
      section: 'עישון ובישול',
      title: 'מים חמים — עד 70°C בליבה',
      target: 'ליבת הנקניקייה: 70°C, ולהחזיק 2 דקות',
      timerMin: 15,
      lines: ['מעבירים מהמעשנה לסיר מים חמים ב-70°C, בערך רבע שעה.', 'מודדים במדחום ליבה. הזמן הוא הערכה — המדחום קובע.'],
      warn: ['לא לחמם את המים מעל 70°C — מים חמים מדי מפרקים את השומן ועלולים לפוצץ את השרוולים.'],
      source: 'יעד הליבה מהמתכון. 2 הדקות — לפי הנחיית FSA (בריטניה): 70°C בליבה למשך 2 דקות.',
      confirm: { id: 'c-core', label: 'מדדתי 70°C בליבה' },
    },
    {
      id: 'chill',
      section: 'עישון ובישול',
      title: 'מי קרח — חצי שעה',
      timerMin: 30,
      lines: ['מוציאים מהמים החמים ומכניסים מיד למי קרח, לעצירת הבישול.'],
    },
    {
      id: 'done',
      section: 'סיום',
      title: 'הנקניקיות מוכנות',
      lines: ['בתיאבון!'],
      tip: ['הוראות קירור ואחסון לא מופיעות בדף המתכון.'],
    },
  ];
}
