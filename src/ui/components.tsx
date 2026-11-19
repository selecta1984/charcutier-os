import { useEffect, useState, type ReactNode } from 'react';
import type { Provenance } from '../engine';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-card border border-line p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-semibold tracking-wide text-muted mb-3">{children}</h2>;
}

const PROV: Record<Provenance, { label: string; cls: string; help: string }> = {
  source: { label: 'מקור', cls: 'bg-sky-500/15 text-sky-300', help: 'נתון מהמתכון המקורי' },
  user: { label: 'הוזן', cls: 'bg-violet-500/15 text-violet-300', help: 'נתון שהזנת' },
  calc: { label: 'חישוב', cls: 'bg-stone-500/20 text-stone-300', help: 'תוצאה של נוסחה מוגדרת' },
  recommendation: { label: 'המלצה', cls: 'bg-emerald-500/15 text-emerald-300', help: 'המלצה מקצועית' },
  needs_verification: { label: 'לאימות', cls: 'bg-amber-500/15 text-amber-300', help: 'נתון שעדיין לא אומת' },
};

export function Badge({ p }: { p: Provenance }) {
  const b = PROV[p];
  return (
    <span title={b.help} className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${b.cls}`}>
      {b.label}
    </span>
  );
}

export function StatusPill({ tone, children }: { tone: 'ok' | 'warn' | 'bad'; children: ReactNode }) {
  const cls = { ok: 'bg-ok/15 text-ok', warn: 'bg-warn/15 text-warn', bad: 'bg-bad/15 text-bad' }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

/** term with a tap-to-reveal explanation */
export function Term({ children, help }: { children: ReactNode; help: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline">
      <button type="button" onClick={() => setOpen((o) => !o)} className="underline decoration-dotted decoration-muted underline-offset-4" aria-expanded={open}>
        {children}
      </button>
      {open && <span className="block mt-1 mb-2 text-sm text-muted font-normal leading-relaxed">{help}</span>}
    </span>
  );
}

function parseNum(s: string): number {
  return Number(s.replace(/,/g, '').replace(/[^\d.\-]/g, ''));
}

/** big numeric field with quick-step chips; validates and never pushes NaN up */
export function NumberField({
  label,
  value,
  onChange,
  unit = 'גרם',
  steps = [50, 100],
  min = 0,
  max = 1_000_000,
  decimals = 0,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  steps?: number[];
  min?: number;
  max?: number;
  decimals?: number;
  hint?: ReactNode;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (parseNum(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const n = parseNum(text);
  const invalid = text.trim() === '' || !Number.isFinite(n) || n < min || n > max;
  const commit = (v: number) => {
    const r = Math.min(max, Math.max(min, Number(v.toFixed(decimals))));
    setText(String(r));
    onChange(r);
  };
  return (
    <div className="mb-4">
      <label className="block text-sm text-muted mb-1.5">{label}</label>
      <div className={`flex items-center rounded-2xl bg-bg border ${invalid ? 'border-bad' : 'border-line'} focus-within:border-ember`}>
        <input
          dir="ltr"
          inputMode={decimals > 0 ? 'decimal' : 'numeric'}
          className="w-full bg-transparent px-4 py-3 text-3xl font-bold tabular-nums text-right outline-none"
          value={text}
          aria-invalid={invalid}
          aria-label={label}
          onChange={(e) => {
            setText(e.target.value);
            const v = parseNum(e.target.value);
            if (e.target.value.trim() !== '' && Number.isFinite(v) && v >= min && v <= max) onChange(v);
          }}
          onFocus={(e) => e.target.select()}
        />
        <span className="pl-4 text-muted shrink-0">{unit}</span>
      </div>
      {invalid && <p className="text-bad text-sm mt-1">ערך לא תקין ({min}–{max})</p>}
      {steps.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-2" dir="ltr">
          {[...steps].reverse().map((s) => (
            <button key={-s} type="button" className="chip" onClick={() => commit((Number.isFinite(n) ? n : value) - s)}>
              −{s}
            </button>
          ))}
          {steps.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => commit((Number.isFinite(n) ? n : value) + s)}>
              +{s}
            </button>
          ))}
        </div>
      )}
      {hint && <p className="text-xs text-muted mt-2 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 4)}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-12 rounded-2xl px-1 text-[13px] leading-tight font-semibold border transition ${
            o.value === value ? 'bg-ember text-bg border-ember' : 'bg-bg border-line text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Row({ name, value, badge, sub, strong }: { name: ReactNode; value: ReactNode; badge?: Provenance; sub?: ReactNode; strong?: boolean }) {
  return (
    <div className="py-3 border-b border-line last:border-0">
      <div className="flex items-center gap-2">
        <span className={`flex-1 ${strong ? 'font-semibold' : ''}`}>{name}</span>
        {badge && <Badge p={badge} />}
        <span className="tabular-nums font-bold text-lg min-w-20 text-left" dir="ltr">
          {value}
        </span>
      </div>
      {sub && <div className="text-xs text-muted mt-1 leading-relaxed">{sub}</div>}
    </div>
  );
}

export function Notice({ tone, children }: { tone: 'info' | 'warn' | 'bad'; children: ReactNode }) {
  const cls = {
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
    warn: 'border-warn/40 bg-warn/10 text-amber-100',
    bad: 'border-bad/40 bg-bad/10 text-red-100',
  }[tone];
  return <div className={`rounded-2xl border p-4 text-sm leading-relaxed ${cls}`}>{children}</div>;
}
