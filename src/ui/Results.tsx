import { useState, type ReactNode } from 'react';
import {
  REGULATORY_PROFILES,
  SOURCE_RECIPE,
  butcherMessage,
  evaluateCure,
  grams,
  grams1,
  gramsInt,
  pct,
  signed,
  whatsappLink,
  type Formulation,
  type MeatParts,
  type Provenance,
} from '../engine';
import { useApp } from '../store';
import { Badge, Card, Notice, Row, SectionTitle, StatusPill, Term } from './components';

export function ButcherActions({ parts, roundTo10, title = 'הודעה לקצב' }: { parts: MeatParts; roundTo10: boolean; title?: string }) {
  const msg = butcherMessage(SOURCE_RECIPE, parts, roundTo10);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed bg-bg rounded-2xl p-4 border border-line">{msg}</pre>
      {roundTo10 && <p className="text-xs text-muted mt-2">הכמויות בהודעה מעוגלות ל-10 גרם. לעיגול גס יותר — "מספרים עגולים לקצב".</p>}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <a className="btn-primary" href={whatsappLink(msg)} target="_blank" rel="noopener noreferrer">
          שלח ב-WhatsApp
        </a>
        <button type="button" className="btn-secondary" onClick={copy}>
          {copied ? 'הועתק ✓' : 'העתק'}
        </button>
      </div>
    </Card>
  );
}

export function SafetyPanel({ f }: { f: Formulation }) {
  const { cure, profileId, scaleResolution, go } = useApp();
  const profile = REGULATORY_PROFILES.find((p) => p.id === profileId) ?? null;
  const r = evaluateCure(f, cure, profile, scaleResolution);
  const approved = r.status === 'approved';
  return (
    <Card className={approved ? '' : 'border-bad/50'}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted">בטיחות וקיור</h2>
        {approved ? <StatusPill tone="ok">מינון קיור מאושר</StatusPill> : <StatusPill tone="bad">חסום לייצור</StatusPill>}
      </div>
      {!approved && (
        <>
          <p className="text-sm mb-2">המשקלים מוצגים לתכנון בלבד. מה חסר:</p>
          <ul className="text-sm space-y-1.5 mb-3">
            {r.issues.map((i) => (
              <li key={i.code} className="flex gap-2">
                <span className="text-bad">✕</span>
                <span>{i.message}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <Row
        name={<Term help="מיליגרם נתרן ניטריט לכל ק״ג בשר+שומן (בלי קרח ותבלינים). זו מסת הייחוס בנוסחת USDA, והיא מחמירה ביחס לחישוב על המוצר המוגמר.">ניטריט (מ"ג/ק"ג בשר+שומן)</Term>}
        value={r.ppm != null ? grams(r.ppm) : '—'}
        badge={approved ? 'calc' : 'needs_verification'}
        sub={r.limitPpm != null ? `מגבלה בפרופיל: ${r.limitPpm} · ${profile?.name}` : 'אין פרופיל רגולטורי'}
      />
      <Row
        name="סך מלח"
        value={r.totalSaltGrams != null ? `${grams(r.totalSaltGrams)} ג'` : '—'}
        badge="calc"
        sub={
          r.totalSaltPercentOfMeatBlock != null
            ? `${pct(r.totalSaltPercentOfMeatBlock, 2)} מבשר+שומן (כולל המלח שבמלח הקיור)`
            : 'לא ידוע אם שאר מלח הקיור הוא מלח — הגדר בהגדרות הקיור'
        }
      />
      <button type="button" className="btn-secondary w-full mt-4" onClick={() => go('cure')}>
        הגדרות מלח קיור ובטיחות
      </button>
    </Card>
  );
}

export interface Need {
  name: string;
  grams: number;
}

function Step({ n, title, children, tone = 'default' }: { n: number; title: string; children: ReactNode; tone?: 'default' | 'accent' }) {
  return (
    <Card className={tone === 'accent' ? 'border-ember/60' : ''}>
      <div className="flex items-center gap-3 mb-2">
        <span className="size-8 shrink-0 rounded-full bg-ember text-bg font-black grid place-items-center">{n}</span>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function SheetRow({ name, value, sub, warn, badge }: { name: ReactNode; value: string; sub?: ReactNode; warn?: ReactNode; badge?: Provenance }) {
  return (
    <div className="py-3 border-b border-line last:border-0">
      <div className="flex items-baseline gap-2">
        <span className="flex-1 text-[17px]">{name}</span>
        {badge && <Badge p={badge} />}
        <span className="tabular-nums font-black text-2xl" dir="ltr">
          {value}
        </span>
        <span className="text-sm text-muted w-8">גרם</span>
      </div>
      {warn && <div className="text-xs text-bad mt-1">{warn}</div>}
      {sub && <div className="text-xs text-muted mt-1 leading-relaxed">{sub}</div>}
    </div>
  );
}

/**
 * Work sheet: numbered steps in the order you actually work —
 * what to get, how to grind, what goes into the emulsion, total.
 */
export function Results({
  f,
  partsProvenance = 'calc',
  showButcher = true,
  needs,
}: {
  f: Formulation;
  partsProvenance?: 'calc' | 'user';
  showButcher?: boolean;
  needs?: { title: string; rows: Need[]; note?: string } | null;
}) {
  const { cure, profileId, scaleResolution } = useApp();
  const profile = REGULATORY_PROFILES.find((p) => p.id === profileId) ?? null;
  const gate = evaluateCure(f, cure, profile, scaleResolution);
  const fatDev = f.fatPercent - SOURCE_RECIPE.fatFraction * 100;
  const grindDev = f.coarsePercentOfLean - SOURCE_RECIPE.coarseShareOfLean * 100;
  const hasDeviation = Math.abs(fatDev) >= 0.05 || Math.abs(grindDev) >= 0.05;
  const emulsion = f.lines.filter((l) => !['meat', 'fat'].includes(l.category));
  const smallOnScale = emulsion.filter((l) => l.category !== 'cure' && l.category !== 'ice' && l.grams > 0 && l.grams < scaleResolution * 10);
  const shownNeeds = needs?.rows.filter((r) => r.grams >= 0.5) ?? [];
  let n = 0;
  const { coarseMm, fineMm } = SOURCE_RECIPE.grinding;

  return (
    <div className="space-y-4" aria-live="polite">
      {needs && (
        <Step n={++n} title={needs.title} tone="accent">
          {shownNeeds.length > 0 ? (
            shownNeeds.map((r) => <SheetRow key={r.name} name={r.name} value={gramsInt(r.grams)} />)
          ) : (
            <p className="text-sm text-muted py-2">לא צריך להשלים כלום.</p>
          )}
          {needs.note && <p className="text-xs text-muted mt-2">{needs.note}</p>}
        </Step>
      )}

      <Step n={++n} title="טחינה">
        <SheetRow name={<>בשר רזה · דיסקית גסה <b>{coarseMm} מ"מ</b></>} value={gramsInt(f.coarse)} badge={partsProvenance === 'user' ? 'user' : undefined} />
        <SheetRow name={<>בשר רזה · דיסקית דקה <b>{fineMm} מ"מ</b></>} value={gramsInt(f.fine)} badge={partsProvenance === 'user' ? 'user' : undefined} />
        <SheetRow name={<>שומן בקר · דיסקית דקה <b>{fineMm} מ"מ</b></>} value={gramsInt(f.fat)} badge={partsProvenance === 'user' ? 'user' : undefined} />
        <p className="text-xs text-muted mt-2">כל חלק בנפרד, קר מאוד.</p>
        {hasDeviation && (
          <div className="flex flex-wrap gap-2 mt-3">
            <StatusPill tone={Math.abs(fatDev) <= 1 ? 'warn' : 'bad'}>
              שומן {pct(f.fatPercent, 2)} ({signed(fatDev, 2)} מול 30%)
            </StatusPill>
            <StatusPill tone={Math.abs(grindDev) <= 3 ? 'warn' : 'bad'}>
              גס {pct(f.coarsePercentOfLean, 1)} מהבשר ({signed(grindDev)} מול 57.1%)
            </StatusPill>
          </div>
        )}
      </Step>

      <Step n={++n} title="לאמולסיה">
        {emulsion.map((l) => {
          const isCure = l.category === 'cure';
          const blocked = isCure && gate.status === 'blocked';
          return (
            <SheetRow
              key={l.id}
              name={l.name}
              value={l.category === 'ice' ? gramsInt(l.grams) : grams1(l.grams)}
              badge={isCure ? (blocked ? 'needs_verification' : undefined) : l.requiresVerification ? 'needs_verification' : undefined}
              warn={blocked ? 'לא מאושר לשימוש עד אימות התווית — ראה "בטיחות וקיור"' : undefined}
              sub={!isCure && l.requiresVerification ? l.note : undefined}
            />
          );
        })}
        {smallOnScale.length > 0 && (
          <div className="mt-3">
            <Notice tone="warn">
              {smallOnScale.map((l) => l.name).join(', ')} — קטן מדי למשקל ברזולוציה {scaleResolution} גרם (טעות מעל 10%). מומלץ משקל 0.1 גרם.
            </Notice>
          </div>
        )}
      </Step>

      <Step n={++n} title="סה״כ תערובת למילוי">
        <p className="text-5xl font-black tabular-nums text-ember" dir="ltr" style={{ textAlign: 'right' }}>
          {gramsInt(f.batch)} <span className="text-xl font-medium text-muted">גרם</span>
        </p>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          בשר ושומן {gramsInt(f.meatBlock)} + קרח {gramsInt(f.ice)} + מלח ותבלינים {grams1(f.additivesTotal)}
        </p>
        {f.expectedAfterLoss != null && (
          <p className="text-sm text-muted mt-1">
            אחרי אובדן {pct(f.lossFraction * 100)} נשארים בערך <b className="text-text">{gramsInt(f.expectedAfterLoss)} גרם</b> (הנחה)
          </p>
        )}
      </Step>

      <SafetyPanel f={f} />

      {showButcher && <ButcherActions parts={{ coarse: f.coarse, fine: f.fine, fat: f.fat }} roundTo10={false} />}

      <p className="text-xs text-muted leading-relaxed px-1">
        לפי {SOURCE_RECIPE.name}: 70% בשר רזה ו-30% שומן, מהבשר 4/7 גס ו-3/7 דק, קרח 15%. המספרים מעוגלים לתצוגה בלבד.
      </p>
    </div>
  );
}
