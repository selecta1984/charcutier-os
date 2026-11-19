import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  REGULATORY_PROFILES,
  SOURCE_RECIPE,
  RECIPES,
  analyzeInventory,
  checkSaltSwap,
  evaluateCure,
  formulateFromParts,
  fromBatch,
  fromCount,
  fromFat,
  fromLean,
  fromMeatBlock,
  grams,
  linkWeightG,
  linksFromMass,
  pct,
  roundForButcher,
  signed,
  type Formulation,
} from '../engine';
import { CHANGELOG } from '../changelog';
import { DEFAULT_CURE, exportData, useApp, useRecipe, type Screen, type WeightBasis } from '../store';
import { Card, Notice, NumberField, Row, SectionTitle, Segmented, StatusPill } from './components';
import { ButcherActions, Results } from './Results';

function safe<T>(fn: () => T): { value: T | null; error: string | null } {
  try {
    return { value: fn(), error: null };
  } catch (e) {
    return { value: null, error: e instanceof Error ? e.message : 'שגיאה' };
  }
}

export function Shell({ title, children }: { title: string; children: ReactNode }) {
  const go = useApp((s) => s.go);
  return (
    <div className="min-h-dvh max-w-xl mx-auto px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-bg/90 backdrop-blur flex items-center gap-3 border-b border-line">
        <button type="button" onClick={() => go('home')} className="size-11 rounded-2xl bg-card border border-line text-xl" aria-label="חזרה למסך הבית">
          →
        </button>
        <h1 className="text-lg font-bold">{title}</h1>
      </header>
      <div className="pt-5 space-y-4">{children}</div>
    </div>
  );
}

/* ---------------- Home ---------------- */

const MODES: { s: Screen; title: string; sub: string; icon: string }[] = [
  { s: 'inventory', title: 'בשר שכבר טחון', sub: 'יש לי גס, דק ושומן — מה עכשיו?', icon: '🥩' },
  { s: 'count', title: 'לפי מספר נקניקיות', sub: 'כמות × משקל, או לפי מעטפת', icon: '🌭' },
  { s: 'rounding', title: 'מספרים עגולים לקצב', sub: 'הזמנה נוחה בלי להרוס יחסים', icon: '🔪' },
];

const LABEL: Partial<Record<Screen, string>> = { weight: 'יש לי בשר', inventory: 'בשר שכבר טחון', count: 'לפי מספר נקניקיות', rounding: 'מספרים עגולים לקצב' };

export function Home() {
  const { go, lastWork, cure, profileId, scaleResolution } = useApp();
  const R = useRecipe();
  const profile = REGULATORY_PROFILES.find((p) => p.id === profileId) ?? null;
  const gate = evaluateCure(fromMeatBlock(R, 5000), cure, profile, scaleResolution);
  return (
    <div className="min-h-dvh max-w-xl mx-auto px-4 pt-8 pb-16">
      <p className="text-ember text-sm font-semibold tracking-wide">מעבדת הנקניקיות</p>
      <h1 className="text-4xl font-black mt-1">מה מכינים היום?</h1>
      <p className="text-muted mt-2">מהבשר ועד הביס. בדיוק.</p>

      {lastWork && (
        <button type="button" onClick={() => go(lastWork)} className="mt-6 w-full text-right rounded-3xl border border-ember/50 bg-ember/10 p-4 flex items-center gap-3">
          <span className="text-2xl">↩︎</span>
          <span>
            <span className="block font-bold">המשך מאיפה שעצרת</span>
            <span className="block text-sm text-muted">{LABEL[lastWork]}</span>
          </span>
        </button>
      )}

      <button type="button" onClick={() => go('weight')} className="mt-6 w-full text-right rounded-3xl bg-ember text-bg p-5 active:scale-[0.99] transition">
        <span className="block text-3xl" aria-hidden>
          ⚖️
        </span>
        <span className="block text-2xl font-black mt-2">יש לי בשר</span>
        <span className="block text-sm font-medium mt-1 opacity-80">כותבים כמה בשר — מקבלים שומן, טחינה ומשקלים מדויקים לאמולסיה</span>
      </button>

      <div className="mt-3 space-y-3">
        {MODES.map((m) => (
          <button key={m.s} type="button" onClick={() => go(m.s)} className="w-full text-right rounded-3xl bg-card border border-line p-4 flex items-center gap-4 active:scale-[0.99] transition">
            <span className="text-3xl" aria-hidden>
              {m.icon}
            </span>
            <span>
              <span className="block font-bold text-lg leading-tight">{m.title}</span>
              <span className="block text-sm text-muted mt-0.5">{m.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <button type="button" onClick={() => go('cure')} className="mt-6 w-full text-right rounded-3xl bg-card border border-line p-4 flex items-center justify-between gap-3">
        <span>
          <span className="block font-bold">מלח קיור ובטיחות</span>
          <span className="block text-sm text-muted">{cure?.name || 'לא הוגדר'} · {profile?.name ?? 'אין פרופיל'}</span>
        </span>
        {gate.status === 'approved' ? <StatusPill tone="ok">מאומת</StatusPill> : <StatusPill tone="bad">דורש אימות</StatusPill>}
      </button>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <button type="button" onClick={() => go('recipe')} className="btn-secondary">
          המתכון · גרסה {R.version}
        </button>
        <button type="button" onClick={() => go('backup')} className="btn-secondary">
          גיבוי ושחזור
        </button>
      </div>
      <p className="text-xs text-muted mt-8 leading-relaxed">
        בקרוב: אשף הכנה שלב אחר שלב, יומן נגלות, השוואות ואבחון תקלות.
      </p>
      <button type="button" onClick={() => go('changelog')} className="mt-3 text-xs text-muted underline min-h-11">
        גרסה {__APP_VERSION__} · מה חדש
      </button>
    </div>
  );
}

/* ---------------- By weight ---------------- */

const BASES: { value: WeightBasis; label: string; field: string; hint: string }[] = [
  { value: 'lean', label: 'בשר רזה', field: 'כמה בשר רזה יש לך?', hint: 'משקל הבשר לפני טחינה. המערכת מחשבת שומן, טחינה וכל מה שנכנס לאמולסיה.' },
  { value: 'fat', label: 'שומן', field: 'כמה שומן יש לך?', hint: 'המערכת מחשבת כמה בשר רזה צריך ואת כל השאר.' },
  { value: 'meatBlock', label: 'בשר+שומן', field: 'כמה בשר ושומן יחד?', hint: '70% בשר רזה, 30% שומן.' },
  { value: 'batch', label: 'תערובת מוכנה', field: 'כמה תערובת מוכנה למילוי אתה רוצה?', hint: 'כולל קרח, מלח ותבלינים. המערכת מחשבת לאחור.' },
];

function weightNeeds(basis: WeightBasis, f: Formulation) {
  if (basis === 'lean') return { title: 'מה להשלים', rows: [{ name: 'שומן בקר', grams: f.fat }] };
  if (basis === 'fat') return { title: 'מה להשלים', rows: [{ name: 'בשר בקר רזה', grams: f.lean }] };
  return {
    title: 'מה צריך',
    rows: [
      { name: 'בשר בקר רזה', grams: f.lean },
      { name: 'שומן בקר', grams: f.fat },
    ],
  };
}

export function WeightScreen() {
  const { weight, set } = useApp();
  const R = useRecipe();
  const basis = BASES.find((b) => b.value === weight.basis)!;
  const [more, setMore] = useState(weight.basis !== 'lean');
  const loss = weight.basis === 'batch' ? weight.lossPct / 100 : 0;
  const r = safe<Formulation>(() =>
    weight.basis === 'meatBlock'
      ? fromMeatBlock(R, weight.value)
      : weight.basis === 'lean'
        ? fromLean(R, weight.value)
        : weight.basis === 'fat'
          ? fromFat(R, weight.value)
          : fromBatch(R, weight.value, loss),
  );
  return (
    <Shell title="יש לי בשר">
      <Card>
        <NumberField label={basis.field} value={weight.value} min={1} onChange={(v) => set('weight', { ...weight, value: v })} hint={basis.hint} />
        {more ? (
          <>
            <p className="text-sm text-muted mb-2">מה אני יודע?</p>
            <Segmented label="נקודת התחלה" options={BASES.map(({ value, label }) => ({ value, label }))} value={weight.basis} onChange={(b) => set('weight', { ...weight, basis: b })} />
            {weight.basis === 'batch' && (
              <NumberField
                label="אובדן צפוי במילוי"
                unit="%"
                value={weight.lossPct}
                min={0}
                max={50}
                steps={[1, 5]}
                decimals={1}
                onChange={(v) => set('weight', { ...weight, lossPct: v })}
                hint="הנחה שלך. התערובת תוגדל כך שאחרי האובדן יישאר המשקל שביקשת."
              />
            )}
          </>
        ) : (
          <button type="button" className="text-sm text-ember underline min-h-11" onClick={() => setMore(true)}>
            אפשרויות נוספות: להתחיל משומן או מכמות תערובת
          </button>
        )}
      </Card>
      {r.value ? <Results f={r.value} needs={weightNeeds(weight.basis, r.value)} /> : <Notice tone="bad">{r.error}</Notice>}
    </Shell>
  );
}

/* ---------------- Inventory ---------------- */

export function InventoryScreen() {
  const { inventory: inv, set } = useApp();
  const R = useRecipe();
  const upd = (p: Partial<typeof inv>) => set('inventory', { ...inv, ...p });
  const a = safe(() => analyzeInventory(R, { coarse: inv.coarse, fine: inv.fine, fat: inv.fat }, inv.declaredLean));
  const [showDeclared, setShowDeclared] = useState(inv.declaredLean != null);

  let f: Formulation | null = null;
  if (a.value) {
    const parts = inv.option === 'asis' ? a.value.have : inv.option === 'complete' ? a.value.complete.parts : a.value.usePart.parts;
    const res = safe(() => formulateFromParts(R, parts, { kind: 'inventory', value: a.value!.meatBlock }, 0, inv.option === 'asis' ? 'user' : 'calc'));
    f = res.value;
  }

  return (
    <Shell title="בשר שכבר טחון">
      <Card>
        <NumberField label={`בשר רזה טחון גס (${R.grinding.coarseMm} מ"מ)`} value={inv.coarse} onChange={(v) => upd({ coarse: v })} />
        <NumberField label={`בשר רזה טחון דק (${R.grinding.fineMm} מ"מ)`} value={inv.fine} onChange={(v) => upd({ fine: v })} />
        <NumberField label="שומן בקר טחון" value={inv.fat} onChange={(v) => upd({ fat: v })} />
        {showDeclared ? (
          <NumberField
            label="סה״כ בשר רזה לפי שקילה (לבדיקה)"
            value={inv.declaredLean ?? inv.coarse + inv.fine}
            onChange={(v) => upd({ declaredLean: v })}
            steps={[]}
            hint="אם הסכום לא תואם לגס+דק — תוצג אזהרה. המערכת לא מתקנת בשקט."
          />
        ) : (
          <button type="button" className="text-sm text-ember underline" onClick={() => { setShowDeclared(true); upd({ declaredLean: inv.coarse + inv.fine }); }}>
            יש לי גם משקל כולל של הבשר — לבדוק התאמה
          </button>
        )}
      </Card>

      {a.error && <Notice tone="bad">{a.error === 'nothing on hand' ? 'הזן לפחות רכיב אחד' : a.error}</Notice>}
      {a.value && (
        <>
          {a.value.leanMismatch && (
            <Notice tone="warn">
              הסכום לא תואם: גס+דק = {grams(a.value.leanMismatch.sum)} גרם, הזנת {grams(a.value.leanMismatch.declared)} גרם (הפרש {signed(a.value.leanMismatch.diff, 0)}). בדוק את השקילה — החישוב משתמש בגס+דק.
            </Notice>
          )}
          <Card>
            <SectionTitle>מה יש לך</SectionTitle>
            <Row name="בשר+שומן" value={grams(a.value.meatBlock)} badge="user" />
            <Row name="שומן מוסף" value={pct(a.value.fatPercent, 2)} sub={`במתכון 30% · סטייה ${signed(a.value.fatDevPp, 2)} נק' אחוז`} />
            <Row name="גס מתוך הבשר הרזה" value={pct(a.value.coarsePercentOfLean, 1)} sub={`במתכון 57.1% · סטייה ${signed(a.value.grindDevPp)} נק' אחוז`} />
            <p className="text-xs text-muted mt-2">החישוב מתייחס לשומן מוסף בלבד. השומן הטבעי בבשר לא ידוע.</p>
          </Card>

          <Card>
            <SectionTitle>איך ממשיכים?</SectionTitle>
            <Segmented
              label="אפשרות"
              options={[
                { value: 'asis', label: 'כמו שיש' },
                { value: 'complete', label: 'להשלים' },
                { value: 'part', label: 'חלק בלבד' },
              ]}
              value={inv.option}
              onChange={(o) => upd({ option: o })}
            />
            {inv.option === 'asis' && <p className="text-sm text-muted">עובדים עם כל מה שיש. הקרח והתבלינים לפי {grams(a.value.meatBlock)} גרם בשר+שומן. היחסים נשארים עם הסטייה שלמעלה.</p>}
            {inv.option === 'complete' && <p className="text-sm text-muted">משלימים את מה שחסר כדי לחזור ליחס המדויק, בלי לזרוק כלום.</p>}
            {inv.option === 'part' && <p className="text-sm text-muted">משתמשים רק בחלק כדי לשמור על היחס המדויק. השאר נשאר בצד.</p>}
          </Card>

          {inv.option === 'complete' && (
            <ButcherActions
              title="הודעה לקצב — רק התוספת"
              parts={{ coarse: a.value.complete.add.coarse, fine: a.value.complete.add.fine, fat: a.value.complete.add.fat }}
              roundTo10
            />
          )}
          {f && (
            <Results
              f={f}
              partsProvenance={inv.option === 'asis' ? 'user' : 'calc'}
              showButcher={false}
              needs={
                inv.option === 'complete'
                  ? {
                      title: 'מה להשלים',
                      rows: [
                        { name: `בשר רזה גס ${R.grinding.coarseMm} מ"מ`, grams: a.value.complete.add.coarse },
                        { name: `בשר רזה דק ${R.grinding.fineMm} מ"מ`, grams: a.value.complete.add.fine },
                        { name: `שומן דק ${R.grinding.fineMm} מ"מ`, grams: a.value.complete.add.fat },
                      ],
                    }
                  : inv.option === 'part'
                    ? {
                        title: 'להשאיר בצד',
                        rows: [
                          { name: 'בשר גס', grams: a.value.usePart.leftover.coarse },
                          { name: 'בשר דק', grams: a.value.usePart.leftover.fine },
                          { name: 'שומן', grams: a.value.usePart.leftover.fat },
                        ],
                      }
                    : null
              }
            />
          )}
        </>
      )}
    </Shell>
  );
}

/* ---------------- By count ---------------- */

export function CountScreen() {
  const { count: c, set } = useApp();
  const R = useRecipe();
  const upd = (p: Partial<typeof c>) => set('count', { ...c, ...p });
  const casing = safe(() => linkWeightG(c.diameterMm, c.lengthCm, c.density));
  const each = c.useCasing ? casing.value ?? 0 : c.gramsEach;
  const r = safe(() => fromCount(R, Math.round(c.count), each, c.lossPct / 100));
  return (
    <Shell title="לפי מספר נקניקיות">
      <Card>
        <NumberField label="כמה נקניקיות?" unit="יח׳" value={c.count} min={1} max={5000} steps={[5, 10]} onChange={(v) => upd({ count: Math.round(v) })} />
        <Segmented
          label="משקל לנקניקייה"
          options={[
            { value: 'manual', label: 'משקל ידוע' },
            { value: 'casing', label: 'לפי מעטפת' },
          ]}
          value={c.useCasing ? 'casing' : 'manual'}
          onChange={(v) => upd({ useCasing: v === 'casing' })}
        />
        {!c.useCasing ? (
          <NumberField label="משקל ממוצע לנקניקייה" value={c.gramsEach} min={1} max={2000} steps={[5, 10]} onChange={(v) => upd({ gramsEach: v })} />
        ) : (
          <>
            <NumberField label="קוטר מעטפת" unit='מ"מ' value={c.diameterMm} min={10} max={120} steps={[1, 2]} decimals={1} onChange={(v) => upd({ diameterMm: v })} />
            <NumberField label="אורך נקניקייה" unit='ס"מ' value={c.lengthCm} min={1} max={100} steps={[1, 2]} decimals={1} onChange={(v) => upd({ lengthCm: v })} />
            <NumberField
              label="צפיפות משוערת"
              unit='ג׳/סמ"ק'
              value={c.density}
              min={0.5}
              max={1.5}
              steps={[0.01, 0.05]}
              decimals={2}
              onChange={(v) => upd({ density: v })}
              hint="הנחה, לא קבוע פיזיקלי. לכיול: שקול נקניקייה אמיתית וחלק בנפח."
            />
            {casing.value != null && (
              <Notice tone="info">
                נפח גלילי משוער · משקל לנקניקייה ≈ <b>{grams(casing.value)} גרם</b> (קירוב)
              </Notice>
            )}
          </>
        )}
        <NumberField label="אובדן צפוי במילוי" unit="%" value={c.lossPct} min={0} max={50} steps={[1, 5]} decimals={1} onChange={(v) => upd({ lossPct: v })} hint="הנחה גלויה: תערובת שנשארת במכונה, בצנרת ובסוף המעטפת." />
      </Card>
      {r.value ? (
        <>
          <Notice tone="info">
            {Math.round(c.count)} × {grams(each)} = <b>{grams(Math.round(c.count) * each)} גרם</b> ממולא. עם אובדן {pct(c.lossPct)} מכינים {grams(r.value.batch)} גרם תערובת.
            {each > 0 && <> בלי אובדן היו יוצאות {linksFromMass(r.value.batch, each)} נקניקיות.</>}
          </Notice>
          <Results
            f={r.value}
            needs={{
              title: 'מה צריך',
              rows: [
                { name: 'בשר בקר רזה', grams: r.value.lean },
                { name: 'שומן בקר', grams: r.value.fat },
              ],
            }}
          />
        </>
      ) : (
        <Notice tone="bad">{r.error}</Notice>
      )}
    </Shell>
  );
}

/* ---------------- Rounding ---------------- */

export function RoundingScreen() {
  const { rounding: rd, set } = useApp();
  const R = useRecipe();
  const upd = (p: Partial<typeof rd>) => set('rounding', { ...rd, ...p });
  const res = useMemo(() => safe(() => roundForButcher(R, rd.target, rd.step, rd.tol)), [R, rd.target, rd.step, rd.tol]);
  const opts = res.value?.options ?? [];
  const sel = opts[Math.min(rd.selected, opts.length - 1)];
  const f = sel ? safe(() => formulateFromParts(R, sel.parts, { kind: 'rounded', value: rd.target })).value : null;

  return (
    <Shell title="מספרים עגולים לקצב">
      <Card>
        <NumberField label="בערך כמה בשר+שומן?" value={rd.target} min={100} onChange={(v) => upd({ target: v, selected: 0 })} />
        <p className="text-sm text-muted mb-2">עד כמה חשובים מספרים עגולים?</p>
        <Segmented
          label="צעד עיגול"
          options={[50, 100, 200, 500].map((s) => ({ value: s, label: `${s} ג׳` }))}
          value={rd.step}
          onChange={(s) => upd({ step: s, selected: 0 })}
        />
        <details className="mt-1">
          <summary className="text-sm text-ember cursor-pointer py-2">גבולות סטייה</summary>
          <NumberField label="שומן ± נק' אחוז" unit="%" value={rd.tol.fatPp} min={0.1} max={5} steps={[0.5]} decimals={1} onChange={(v) => upd({ tol: { ...rd.tol, fatPp: v }, selected: 0 })} />
          <NumberField label="חלוקת טחינה ± נק' אחוז" unit="%" value={rd.tol.grindPp} min={0.1} max={15} steps={[1]} decimals={1} onChange={(v) => upd({ tol: { ...rd.tol, grindPp: v }, selected: 0 })} />
          <NumberField label="משקל כולל ±" unit="%" value={rd.tol.totalPct} min={0.5} max={30} steps={[1]} decimals={1} onChange={(v) => upd({ tol: { ...rd.tol, totalPct: v }, selected: 0 })} />
        </details>
      </Card>

      {res.value && (
        <Card>
          <SectionTitle>חישוב מדויק (להשוואה)</SectionTitle>
          <p className="tabular-nums text-sm">
            גס {grams(res.value.ideal.coarse)} · דק {grams(res.value.ideal.fine)} · שומן {grams(res.value.ideal.fat)}
          </p>
        </Card>
      )}

      {res.value?.reason && <Notice tone="warn">{res.value.reason}</Notice>}
      {res.error && <Notice tone="bad">{res.error}</Notice>}

      {opts.length > 0 && (
        <div className="space-y-3" role="radiogroup" aria-label="אפשרויות עיגול">
          {opts.map((o, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={sel === o}
              onClick={() => upd({ selected: i })}
              className={`w-full text-right rounded-3xl border p-4 transition ${sel === o ? 'border-ember bg-ember/10' : 'border-line bg-card'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{i === 0 ? 'הכי מאוזן' : `אפשרות ${i + 1}`}</span>
                {o.exact ? <StatusPill tone="ok">יחס מדויק</StatusPill> : <StatusPill tone="warn">יש סטייה</StatusPill>}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                {[
                  ['גס', o.parts.coarse],
                  ['דק', o.parts.fine],
                  ['שומן', o.parts.fat],
                ].map(([n, v]) => (
                  <div key={n as string} className="rounded-2xl bg-bg py-2">
                    <div className="text-xs text-muted">{n}</div>
                    <div className="text-xl font-black tabular-nums">{grams(v as number)}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-3 tabular-nums">
                סה״כ {grams(o.total)} ({signed(o.totalDevPct)}%) · שומן {pct(o.fatPercent, 2)} ({signed(o.fatDevPp, 2)}) · גס {pct(o.coarsePercentOfLean)} ({signed(o.grindDevPp)})
              </p>
            </button>
          ))}
        </div>
      )}

      {sel && <ButcherActions parts={sel.parts} roundTo10={false} />}
      {f && <Results f={f} showButcher={false} />}
    </Shell>
  );
}

/* ---------------- Cure settings ---------------- */

export function CureScreen() {
  const { cure, set, profileId, scaleResolution } = useApp();
  const R = useRecipe();
  const c = cure ?? DEFAULT_CURE;
  const upd = (p: Partial<typeof c>) => set('cure', { ...c, ...p });
  const profile = REGULATORY_PROFILES.find((p) => p.id === profileId) ?? null;
  const swap = checkSaltSwap(SOURCE_RECIPE, c, profile);
  const canVerify = c.verifiedSource.trim().length >= 3 && c.nitriteFraction != null && c.containsNitrate !== 'unknown';

  return (
    <Shell title="מלח קיור ובטיחות">
      <Notice tone="warn">
        מלח רגיל ומלח קיור אינם אותו מוצר. אל תסיק הרכב משם מסחרי או מצבע אריזה — רק מהתווית.
      </Notice>
      <Card>
        <SectionTitle>המוצר שלי</SectionTitle>
        <TextField label="שם המוצר" value={c.name} onChange={(v) => upd({ name: v, verified: false })} />
        <TextField label="יצרן" value={c.manufacturer} onChange={(v) => upd({ manufacturer: v, verified: false })} />
        <NumberField
          label="אחוז נתרן ניטריט (לפי התווית)"
          unit="%"
          value={c.nitriteFraction != null ? Number((c.nitriteFraction * 100).toFixed(4)) : 0}
          min={0}
          max={10}
          steps={[0.1]}
          decimals={3}
          onChange={(v) => upd({ nitriteFraction: v > 0 ? v / 100 : null, verified: false })}
          hint="מלח ניטריט מהול בדרך כלל 0.4–0.6%. תכשיר מרוכז ~6%. ההבדל פי 10."
        />
        <SelectField
          label="מכיל ניטראט?"
          value={c.containsNitrate}
          options={[
            ['unknown', 'לא ידוע'],
            ['no', 'לא'],
            ['yes', 'כן'],
          ]}
          onChange={(v) => upd({ containsNitrate: v as typeof c.containsNitrate, verified: false })}
        />
        <SelectField
          label="שאר המוצר הוא מלח?"
          value={c.restIsSalt}
          options={[
            ['unknown', 'לא ידוע'],
            ['yes', 'כן'],
          ]}
          onChange={(v) => upd({ restIsSalt: v as typeof c.restIsSalt })}
        />
        <TextField label="הוראות מינון (יצרן / ספק)" value={c.labelInstructions} onChange={(v) => upd({ labelInstructions: v })} multiline />
        <label className="block mb-4">
          <span className="block text-sm text-muted mb-1.5">להשתמש לפני (מהאריזה)</span>
          <input
            type="date"
            dir="ltr"
            className="w-full rounded-2xl bg-bg border border-line px-4 py-3 min-h-12 text-right"
            value={c.bestBefore ?? ''}
            onChange={(e) => upd({ bestBefore: e.target.value || null })}
          />
        </label>
      </Card>

      <Card className={c.verified ? 'border-ok/50' : 'border-bad/50'}>
        <SectionTitle>אימות</SectionTitle>
        <TextField
          label="מקור האימות (למשל: צילום תווית, אתר היצרן)"
          value={c.verifiedSource}
          onChange={(v) => upd({ verifiedSource: v, verified: c.verified && v.trim().length >= 3 })}
        />
        <label className={`flex items-start gap-3 min-h-12 ${canVerify ? '' : 'opacity-50'}`}>
          <input
            type="checkbox"
            className="size-6 mt-0.5 accent-[#E8833A]"
            checked={c.verified}
            disabled={!canVerify && !c.verified}
            onChange={(e) => upd({ verified: e.target.checked, verifiedAt: e.target.checked ? new Date().toISOString().slice(0, 10) : null })}
          />
          <span className="text-sm leading-relaxed">בדקתי את אחוז הניטריט ואת שאלת הניטראט מול התווית או נתוני היצרן.</span>
        </label>
        {!canVerify && !c.verified && <p className="text-xs text-muted mt-2">לאימות צריך: אחוז ניטריט, תשובה לגבי ניטראט, ומקור.</p>}
        {c.verified && <p className="text-xs text-ok mt-2">אומת ב-{c.verifiedAt}. כל שינוי בנתוני המוצר מבטל את האימות.</p>}
      </Card>

      <Card>
        <SectionTitle>פרופיל רגולטורי</SectionTitle>
        <div className="space-y-2">
          {REGULATORY_PROFILES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => set('profileId', p.id)}
              className={`w-full text-right rounded-2xl border p-3 ${profileId === p.id ? 'border-ember bg-ember/10' : 'border-line bg-bg'}`}
              aria-pressed={profileId === p.id}
            >
              <span className="block font-semibold">{p.name}</span>
              <span className="block text-xs text-muted mt-1">
                עד {p.maxPpmAsSodiumNitrite} מ״ג/ק״ג כנתרן ניטריט · {p.basis} · גרסה {p.versionDate}
              </span>
              <a className="block text-xs text-ember underline mt-1" href={p.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                {p.source}
              </a>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">התקן הישראלי עדיין לא נבדק ולא נכלל.</p>
      </Card>

      <Card>
        <SectionTitle>משקל דיגיטלי</SectionTitle>
        <Segmented
          label="רזולוציית משקל"
          options={[
            { value: 1, label: '1 ג׳' },
            { value: 0.1, label: '0.1 ג׳' },
            { value: 0.01, label: '0.01 ג׳' },
          ]}
          value={scaleResolution}
          onChange={(v) => set('scaleResolution', v)}
        />
        <p className="text-xs text-muted">נחסם רק אם טעות השקילה עלולה להעביר את הניטריט מעל המגבלה. אחרת מוצגת הערת דיוק.</p>
      </Card>

      <Card>
        <SectionTitle>בדיקה: החלפת כל המלח במלח קיור 1:1</SectionTitle>
        <div className="flex items-center gap-2 mb-2">{swap.allowed ? <StatusPill tone="ok">בתוך המגבלה</StatusPill> : <StatusPill tone="bad">חסום</StatusPill>}</div>
        <p className="text-sm leading-relaxed">{swap.reason}</p>
        <p className="text-xs text-muted mt-2">זו בדיקה בלבד. המתכון המקורי לא משתנה.</p>
      </Card>

      <CureBaselineNote ppm={evaluateCure(fromMeatBlock(R, 5000), c, profile, scaleResolution).ppm} recipeName={R.name} />
    </Shell>
  );
}

function CureBaselineNote({ ppm, recipeName }: { ppm: number | null; recipeName: string }) {
  if (ppm == null) return null;
  return (
    <Notice tone="info">
      ב{recipeName.split('—')[1]?.trim() ?? 'מתכון'} עם המוצר הזה: <b>{grams(ppm)} מ״ג ניטריט לק״ג</b> בשר+שומן. המערכת לא קובעת מינימום אפקטיבי — אין לה מקור מאומת לכך. ערך נמוך מאוד שווה בדיקה מקצועית.
    </Notice>
  );
}

function TextField({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const cls = 'w-full rounded-2xl bg-bg border border-line px-4 py-3 outline-none focus:border-ember';
  return (
    <label className="block mb-4">
      <span className="block text-sm text-muted mb-1.5">{label}</span>
      {multiline ? <textarea className={cls} rows={3} value={value} onChange={(e) => onChange(e.target.value)} /> : <input className={cls} value={value} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm text-muted mb-1.5">{label}</span>
      <select className="w-full rounded-2xl bg-bg border border-line px-4 py-3 min-h-12" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---------------- Recipe ---------------- */

export function RecipeScreen() {
  const R = useRecipe();
  const { recipeId, set, cure, profileId, scaleResolution } = useApp();
  const profile = REGULATORY_PROFILES.find((p) => p.id === profileId) ?? null;
  const f = fromMeatBlock(R, 5000);
  return (
    <Shell title="המתכון">
      <Card>
        <SectionTitle>איזו גרסה להכין?</SectionTitle>
        <div className="space-y-2" role="radiogroup" aria-label="גרסת מתכון">
          {RECIPES.map((r) => {
            const rep = evaluateCure(fromMeatBlock(r, 1000), cure, profile, scaleResolution);
            const salt = r.additives.find((x) => x.category === 'salt' && x.enabled)?.gramsPerKgMeatBlock ?? 0;
            const cureG = r.additives.find((x) => x.category === 'cure' && x.enabled)?.gramsPerKgMeatBlock ?? 0;
            return (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={recipeId === r.id}
                onClick={() => set('recipeId', r.id)}
                className={`w-full text-right rounded-2xl border p-4 ${recipeId === r.id ? 'border-ember bg-ember/10' : 'border-line bg-bg'}`}
              >
                <span className="block font-bold">
                  גרסה {r.version}: {r.version === 1 ? 'מקור' : 'כל המלח כמלח קיור'}
                </span>
                <span className="block text-sm text-muted mt-1">
                  לכל ק״ג בשר+שומן: {salt > 0 ? `מלח ${grams(salt)} + ` : ''}מלח קיור {grams(cureG)} גרם
                  {rep.ppm != null && ` · ניטריט ${grams(rep.ppm)} מ״ג/ק״ג`}
                </span>
                {r.version === 2 && <span className="block text-xs text-muted mt-1">לפי הנחיית הספק (15–20 גרם למוצר מבושל). אותה כמות מלח כוללת, צבע וקיור חזקים יותר.</span>}
                {r.version === 1 && <span className="block text-xs text-muted mt-1">כמו בדף המתכון. ניטריט נמוך מאוד.</span>}
              </button>
            );
          })}
        </div>
      </Card>
      <Notice tone="info">
        גרסה {R.version}, נעולה. מקור: {R.source}. זהו תיעוד של המתכון, לא אישור בטיחות.
      </Notice>
      <Card>
        <SectionTitle>ל-5 ק״ג בשר+שומן</SectionTitle>
        <Row name="בשר בקר ללא שומן" value="3,500" badge="source" sub='2,000 גס 8 מ"מ · 1,500 דק 3.5 מ"מ' />
        <Row name="שומן בקר (שומן בוקס עדיף)" value="1,500" badge="source" sub='דק 3.5 מ"מ' />
        <Row name="קרח" value="750" badge="source" />
        {R.additives.map((a) => (
          <Row key={a.id} name={a.name} value={a.enabled ? grams(a.gramsPerKgMeatBlock * 5) : 'לא בשימוש'} badge={a.provenance} sub={a.note} />
        ))}
        <Row name="סה״כ תערובת" value={grams(f.batch)} badge="calc" strong />
      </Card>
      <PendingConfirmations />
    </Shell>
  );
}

function PendingConfirmations() {
  const { confirmations, set } = useApp();
  const items = SOURCE_RECIPE.additives.filter((a) => a.provenance === 'needs_verification' && a.category !== 'phosphate');
  return (
    <Card>
      <SectionTitle>לאישורך: לא מופיעים בדף המתכון שצילמת</SectionTitle>
      {items.map((a) => {
        const c = confirmations[a.id];
        return (
          <div key={a.id} className="py-3 border-b border-line last:border-0">
            <p className="mb-2">
              {a.name} — {grams(a.gramsPerKgMeatBlock * 5)} גרם ל-5 ק״ג
              {c && <span className="text-sm text-muted"> · {c === 'keep' ? 'נשאר במתכון' : 'הוסר'}</span>}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={c === 'keep' ? 'btn-primary' : 'btn-secondary'} onClick={() => set('confirmations', { ...confirmations, [a.id]: 'keep' })}>
                כן, יש במתכון
              </button>
              <button type="button" className={c === 'remove' ? 'btn-primary' : 'btn-secondary'} onClick={() => set('confirmations', { ...confirmations, [a.id]: 'remove' })}>
                לא, להוריד
              </button>
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted mt-3">פוספט — רישום ידני בדף שלא פוענח. נשאר כבוי.</p>
    </Card>
  );
}

export function ChangelogScreen() {
  return (
    <Shell title={`מה חדש · גרסה ${__APP_VERSION__}`}>
      {CHANGELOG.map((c) => (
        <Card key={c.version}>
          <SectionTitle>
            גרסה {c.version} · {c.date}
          </SectionTitle>
          <ul className="space-y-2 text-sm leading-relaxed list-disc pr-5">
            {c.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </Card>
      ))}
    </Shell>
  );
}

/* ---------------- Backup ---------------- */

export function BackupScreen() {
  const state = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ tone: 'info' | 'bad'; text: string } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  const doExport = () => {
    const blob = new Blob([exportData(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `charcutier-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg({ tone: 'info', text: 'קובץ הגיבוי ירד. שמור אותו ב-Drive או שלח לעצמך ב-WhatsApp.' });
  };
  const doImport = async (file: File) => {
    try {
      state.importData(JSON.parse(await file.text()));
      setMsg({ tone: 'info', text: 'השחזור הושלם.' });
    } catch (e) {
      setMsg({ tone: 'bad', text: e instanceof Error ? e.message : 'שחזור נכשל' });
    }
  };
  const [pasted, setPasted] = useState('');
  const copyBackup = async () => {
    try {
      await navigator.clipboard.writeText(exportData(state));
      setMsg({ tone: 'info', text: 'הגיבוי הועתק. הדבק אותו בהודעה לעצמך ב-WhatsApp או בקובץ ב-Drive.' });
    } catch {
      setMsg({ tone: 'bad', text: 'ההעתקה נחסמה בדפדפן הזה' });
    }
  };
  const restorePasted = () => {
    try {
      state.importData(JSON.parse(pasted));
      setPasted('');
      setMsg({ tone: 'info', text: 'השחזור הושלם.' });
    } catch (e) {
      setMsg({ tone: 'bad', text: e instanceof SyntaxError ? 'הטקסט אינו גיבוי תקין' : e instanceof Error ? e.message : 'שחזור נכשל' });
    }
  };
  const askPersist = async () => {
    try {
      setPersisted((await navigator.storage?.persist?.()) ?? false);
    } catch {
      setPersisted(false);
    }
  };

  return (
    <Shell title="גיבוי ושחזור">
      <Card>
        <p className="text-sm leading-relaxed mb-4">כל הנתונים נשמרים רק בטלפון. אנדרואיד עלול למחוק אותם כשחסר מקום — שמור גיבוי מדי פעם.</p>
        <div className="grid gap-3">
          <button type="button" className="btn-primary" onClick={copyBackup}>
            העתק גיבוי
          </button>
          {import.meta.env.MODE !== 'single' && (
            <button type="button" className="btn-secondary" onClick={doExport}>
              הורד קובץ גיבוי
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
            שחזור מקובץ
          </button>
          <button type="button" className="btn-secondary" onClick={askPersist}>
            בקש אחסון קבוע
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        {persisted != null && <p className="text-sm mt-3">{persisted ? 'האחסון סומן כקבוע ✓' : 'הדפדפן לא אישר אחסון קבוע. מומלץ להתקין את האפליקציה למסך הבית ולגבות.'}</p>}
      </Card>
      <Card>
        <SectionTitle>שחזור מטקסט מועתק</SectionTitle>
        <textarea dir="ltr" className="w-full rounded-2xl bg-bg border border-line p-3 text-xs h-28" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder='{"app":"charcutier-os", ...}' aria-label="טקסט גיבוי" />
        <button type="button" className="btn-secondary w-full mt-3" disabled={!pasted.trim()} onClick={restorePasted}>
          שחזר
        </button>
      </Card>
      {msg && <Notice tone={msg.tone === 'bad' ? 'bad' : 'info'}>{msg.text}</Notice>}
    </Shell>
  );
}
