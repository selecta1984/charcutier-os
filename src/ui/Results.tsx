import { useState } from 'react';
import {
  REGULATORY_PROFILES,
  SOURCE_RECIPE,
  butcherMessage,
  evaluateCure,
  grams,
  pct,
  signed,
  whatsappLink,
  type Formulation,
  type MeatParts,
} from '../engine';
import { useApp } from '../store';
import { Card, Notice, Row, SectionTitle, StatusPill, Term } from './components';

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

export function Results({ f, partsProvenance = 'calc', showButcher = true }: { f: Formulation; partsProvenance?: 'calc' | 'user'; showButcher?: boolean }) {
  const { cure, profileId, scaleResolution } = useApp();
  const profile = REGULATORY_PROFILES.find((p) => p.id === profileId) ?? null;
  const gate = evaluateCure(f, cure, profile, scaleResolution);
  const meatLines = f.lines.filter((l) => l.category === 'meat' || l.category === 'fat');
  const addLines = f.lines.filter((l) => !['meat', 'fat', 'ice'].includes(l.category));
  const fatDev = f.fatPercent - SOURCE_RECIPE.fatFraction * 100;
  const grindDev = f.coarsePercentOfLean - SOURCE_RECIPE.coarseShareOfLean * 100;
  const smallOnScale = addLines.filter((l) => l.category !== 'cure' && l.grams > 0 && l.grams < scaleResolution * 10);

  return (
    <div className="space-y-4" aria-live="polite">
      <Card className="bg-gradient-to-b from-ember/15 to-card">
        <p className="text-sm text-muted">
          <Term help="המשקל הכולל של כל מה שנכנס לקערה: בשר, שומן, קרח, מלח ותבלינים. זה מה שיהיה זמין למילוי לפני אובדן.">תערובת סופית</Term>
        </p>
        <p className="text-5xl font-black tabular-nums mt-1" dir="ltr" style={{ textAlign: 'right' }}>
          {grams(f.batch)} <span className="text-xl font-medium text-muted">גרם</span>
        </p>
        <p className="text-sm text-muted mt-2">
          מתוכה{' '}
          <Term help="בשר רזה + שומן מוסף בלבד. היחס 70/30 והקרח (15%) והתבלינים מחושבים ממנו.">בשר+שומן</Term>: <b className="text-text">{grams(f.meatBlock)} גרם</b> · קרח {grams(f.ice)} · תבלינים ותוספים {grams(f.additivesTotal)}
        </p>
        {f.expectedAfterLoss != null && (
          <p className="text-sm text-muted mt-1">
            צפוי אחרי אובדן {pct(f.lossFraction * 100)}: <b className="text-text">{grams(f.expectedAfterLoss)} גרם</b> <span className="text-amber-300">(הנחה)</span>
          </p>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['בשר רזה', f.lean],
          ['שומן', f.fat],
          ['קרח', f.ice],
        ].map(([n, v]) => (
          <div key={n as string} className="rounded-3xl bg-card border border-line p-3 text-center">
            <p className="text-xs text-muted">{n}</p>
            <p className="text-2xl font-black tabular-nums mt-1">{grams(v as number)}</p>
            <p className="text-[11px] text-muted">גרם</p>
          </div>
        ))}
      </div>

      <Card>
        <SectionTitle>חלוקת טחינה</SectionTitle>
        {meatLines.map((l) => (
          <Row key={l.id} name={l.name} value={grams(l.grams)} badge={partsProvenance} />
        ))}
        <div className="flex flex-wrap gap-2 mt-3">
          <StatusPill tone={Math.abs(fatDev) < 0.05 ? 'ok' : Math.abs(fatDev) <= 1 ? 'warn' : 'bad'}>
            <Term help="שומן מוסף מתוך בשר+שומן. לא כולל שומן טבעי שבתוך הבשר הרזה — הוא לא ידוע.">שומן מוסף</Term> {pct(f.fatPercent, 2)}
            {Math.abs(fatDev) >= 0.005 && ` (${signed(fatDev, 2)})`}
          </StatusPill>
          <StatusPill tone={Math.abs(grindDev) < 0.05 ? 'ok' : Math.abs(grindDev) <= 3 ? 'warn' : 'bad'}>
            גס מתוך הרזה {pct(f.coarsePercentOfLean, 1)}
            {Math.abs(grindDev) >= 0.05 && ` (${signed(grindDev)})`}
          </StatusPill>
        </div>
      </Card>

      <Card>
        <SectionTitle>תבלינים ותוספים</SectionTitle>
        {addLines.map((l) => (
          <Row
            key={l.id}
            name={
              <>
                {l.name}
                {l.category === 'cure' && gate.status === 'blocked' && <span className="text-bad text-xs mr-2">לא מאושר</span>}
              </>
            }
            value={grams(l.grams)}
            badge={l.category === 'cure' ? (gate.status === 'approved' ? 'calc' : 'needs_verification') : l.provenance}
            sub={l.note}
          />
        ))}
        {smallOnScale.length > 0 && (
          <div className="mt-3">
            <Notice tone="warn">
              {smallOnScale.map((l) => l.name).join(', ')} — כמות קטנה מדי למשקל ברזולוציה {scaleResolution} גרם (טעות מעל 10%). מומלץ משקל 0.1 או 0.01 גרם.
            </Notice>
          </div>
        )}
      </Card>

      <SafetyPanel f={f} />

      {showButcher && <ButcherActions parts={{ coarse: f.coarse, fine: f.fine, fat: f.fat }} roundTo10={partsProvenance === 'calc'} />}

      <p className="text-xs text-muted leading-relaxed px-1">
        מבוסס על {SOURCE_RECIPE.name} (גרסה {SOURCE_RECIPE.version}): 70% בשר רזה / 30% שומן מוסף, גס 4/7 מהרזה, קרח 15%. המספרים מעוגלים לתצוגה בלבד.
      </p>
    </div>
  );
}
