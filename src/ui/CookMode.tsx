import { useEffect, useMemo, useRef, useState } from 'react';
import { grams1, gramsInt } from '../engine';
import { buildCookSteps, type Amount, type CookStep } from '../cook/steps';
import { useApp, type TimerState } from '../store';
import { Notice } from './components';

const fmtG = (g: number) => (g >= 100 ? gramsInt(g) : grams1(g));

function mmss(ms: number): string {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

function remaining(t: TimerState | undefined, totalMs: number, now: number): number {
  if (!t) return totalMs;
  return t.endsAt != null ? t.endsAt - now : t.remainingMs;
}

/** short beep + vibration; both optional and never throw */
function alarm() {
  try {
    navigator.vibrate?.([400, 200, 400, 200, 400]);
  } catch {
    /* noop */
  }
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.5, 1].forEach((d) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.value = 0.2;
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + d);
      o.stop(ctx.currentTime + d + 0.3);
    });
  } catch {
    /* noop */
  }
}

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/** keep the screen on while cooking; silently skipped where unsupported */
function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const req = async () => {
      try {
        lock = await (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null;
      } catch {
        lock = null;
      }
    };
    req();
    const onVis = () => document.visibilityState === 'visible' && req();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => undefined);
    };
  }, []);
}

function Timer({ step, now }: { step: CookStep; now: number }) {
  const { cook, patchCook } = useApp();
  const totalMs = (step.timerMin ?? 0) * 60_000;
  const t = cook?.timers[step.id];
  const left = remaining(t, totalMs, now);
  const running = t?.endsAt != null;
  const finished = left <= 0;
  const fired = useRef(false);

  useEffect(() => {
    if (running && finished && !fired.current) {
      fired.current = true;
      alarm();
    }
    if (!running) fired.current = false;
  }, [running, finished]);

  const setT = (v: TimerState | null) => {
    if (!cook) return;
    const timers = { ...cook.timers };
    if (v) timers[step.id] = v;
    else delete timers[step.id];
    patchCook({ timers });
  };

  return (
    <div className={`rounded-3xl border p-5 text-center ${finished && running ? 'border-ok bg-ok/10' : 'border-line bg-bg'}`}>
      <p className={`text-6xl font-black tabular-nums ${finished && running ? 'text-ok' : ''}`} dir="ltr">
        {finished && running ? '00:00' : mmss(left)}
      </p>
      {finished && running && <p className="text-ok font-bold mt-1">הזמן נגמר</p>}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {!running ? (
          <button type="button" className="btn-primary" onClick={() => {
              const base = left > 0 ? left : totalMs;
              setT({ endsAt: now + base, remainingMs: base });
            }}>
            {t ? 'המשך' : `הפעל ${step.timerMin} דק׳`}
          </button>
        ) : (
          <button type="button" className="btn-secondary" disabled={finished} onClick={() => setT({ endsAt: null, remainingMs: left })}>
            השהה
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={() => setT(null)}>
          איפוס
        </button>
      </div>
    </div>
  );
}

function AmountList({ title, amounts, checks, toggle }: { title?: string; amounts: Amount[]; checks: Record<string, boolean>; toggle: (id: string) => void }) {
  return (
    <div className="rounded-3xl bg-card border border-line p-4">
      {title && <p className="text-sm text-muted mb-1">{title}</p>}
      {amounts.map((a) => {
        const done = a.checkId ? checks[a.checkId] : false;
        const row = (
          <div className={`flex items-baseline gap-3 py-3 ${done ? 'opacity-50' : ''}`}>
            {a.checkId && (
              <span className={`size-7 shrink-0 rounded-lg border-2 grid place-items-center self-center ${done ? 'bg-ok border-ok text-bg' : 'border-line'}`} aria-hidden>
                {done ? '✓' : ''}
              </span>
            )}
            <span className={`flex-1 text-lg ${a.emphasis ? 'font-bold text-amber-200' : ''}`}>{a.label}</span>
            <span className="text-3xl font-black tabular-nums" dir="ltr">
              {fmtG(a.grams)}
            </span>
            <span className="text-sm text-muted">גרם</span>
          </div>
        );
        return a.checkId ? (
          <button key={a.checkId} type="button" role="checkbox" aria-checked={!!done} onClick={() => toggle(a.checkId!)} className="w-full text-right border-b border-line last:border-0">
            {row}
          </button>
        ) : (
          <div key={a.label} className="border-b border-line last:border-0">
            {row}
          </div>
        );
      })}
      {amounts.some((a) => a.checkId) && <p className="text-xs text-muted mt-2">לוחצים על שורה כשהיא שקולה.</p>}
    </div>
  );
}

export function CookMode() {
  const { cook, patchCook, endCook, go } = useApp();
  const steps = useMemo(() => (cook ? buildCookSteps(cook.snapshot) : []), [cook?.snapshot]);
  const anyRunning = !!cook && Object.values(cook.timers).some((t) => t.endsAt != null);
  const now = useNow(anyRunning);
  useWakeLock();

  if (!cook) {
    return (
      <div className="min-h-dvh max-w-xl mx-auto px-4 pt-10">
        <Notice tone="info">אין הכנה פתוחה. מתחילים מדף העבודה בלחיצה על "התחל הכנה".</Notice>
        <button type="button" className="btn-primary w-full mt-4" onClick={() => go('home')}>
          למסך הבית
        </button>
      </div>
    );
  }

  const i = Math.min(cook.step, steps.length - 1);
  const step = steps[i];
  const last = i === steps.length - 1;
  const toggle = (id: string) => patchCook({ checks: { ...cook.checks, [id]: !cook.checks[id] } });
  const goto = (n: number) => {
    patchCook({ step: Math.max(0, Math.min(steps.length - 1, n)) });
    try {
      window.scrollTo({ top: 0 });
    } catch {
      /* noop */
    }
  };
  // a timer that keeps running on another step
  const otherTimer = Object.entries(cook.timers).find(([id, t]) => id !== step.id && t.endsAt != null);
  const otherStep = otherTimer ? steps.find((s) => s.id === otherTimer[0]) : null;
  const needConfirm = step.confirm && !cook.checks[step.confirm.id];
  const lines = step.lines?.map((l) => (
    <p key={l} className="text-xl leading-relaxed">
      {l}
    </p>
  ));

  return (
    <div className="min-h-dvh max-w-xl mx-auto px-4 pb-36">
      <header className="sticky top-0 z-10 -mx-4 px-4 pt-3 pb-3 bg-bg/95 backdrop-blur border-b border-line">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => go('home')} className="size-11 rounded-2xl bg-card border border-line text-lg" aria-label="יציאה, ההתקדמות נשמרת">
            ✕
          </button>
          <div className="flex-1">
            <p className="text-sm text-ember font-semibold">{step.section}</p>
            <p className="text-xs text-muted">
              שלב {i + 1} מתוך {steps.length}
            </p>
          </div>
        </div>
        <div className="h-1.5 bg-card rounded-full mt-3 overflow-hidden" aria-hidden>
          <div className="h-full bg-ember transition-all" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>
        {otherTimer && otherStep && (
          <button type="button" onClick={() => goto(steps.indexOf(otherStep))} className="mt-2 w-full text-right text-sm rounded-2xl bg-ember/15 border border-ember/40 px-3 py-2 flex justify-between">
            <span>⏱ {otherStep.title}</span>
            <span className="tabular-nums font-bold" dir="ltr">
              {remaining(otherTimer[1], 0, now) <= 0 ? 'נגמר' : mmss(remaining(otherTimer[1], 0, now))}
            </span>
          </button>
        )}
      </header>

      <main className="pt-6 space-y-5">
        <h1 className="text-3xl font-black leading-tight">{step.title}</h1>

        {step.target && (
          <div className="rounded-3xl bg-ember/15 border border-ember/50 p-4 text-center">
            <p className="text-xs text-muted">יעד</p>
            <p className="text-2xl font-black text-ember mt-1">{step.target}</p>
          </div>
        )}

        {step.linesFirst && lines}
        {step.amounts && <AmountList title={step.amountsTitle} amounts={step.amounts} checks={cook.checks} toggle={toggle} />}
        {step.amounts2 && <AmountList title={step.amounts2Title} amounts={step.amounts2} checks={cook.checks} toggle={toggle} />}

        {!step.linesFirst && lines}

        {step.checklist && (
          <div className="space-y-2">
            {step.checklist.map((c) => (
              <button
                key={c.id}
                type="button"
                role="checkbox"
                aria-checked={!!cook.checks[c.id]}
                onClick={() => toggle(c.id)}
                className={`w-full text-right rounded-2xl border p-4 flex items-center gap-3 min-h-14 ${cook.checks[c.id] ? 'border-ok/60 bg-ok/10' : 'border-line bg-card'}`}
              >
                <span className={`size-7 shrink-0 rounded-lg border-2 grid place-items-center ${cook.checks[c.id] ? 'bg-ok border-ok text-bg' : 'border-line'}`} aria-hidden>
                  {cook.checks[c.id] ? '✓' : ''}
                </span>
                <span className="text-lg">{c.label}</span>
              </button>
            ))}
          </div>
        )}

        {step.timerMin != null && <Timer step={step} now={now} />}

        {step.warn?.map((w) => (
          <Notice key={w} tone="warn">
            {w}
          </Notice>
        ))}
        {step.tip?.map((t) => (
          <p key={t} className="text-muted">
            {t}
          </p>
        ))}

        {step.confirm && (
          <button
            type="button"
            role="checkbox"
            aria-checked={!!cook.checks[step.confirm.id]}
            onClick={() => toggle(step.confirm!.id)}
            className={`w-full rounded-3xl border-2 p-5 text-xl font-bold flex items-center justify-center gap-3 ${cook.checks[step.confirm.id] ? 'border-ok bg-ok/15 text-ok' : 'border-line bg-card'}`}
          >
            <span>{cook.checks[step.confirm.id] ? '✓' : '○'}</span>
            {step.confirm.label}
          </button>
        )}

        {needConfirm && <p className="text-sm text-muted text-center -mt-2">מסמנים כשזה קרה בפועל</p>}

        {step.source && <p className="text-xs text-muted leading-relaxed">{step.source}</p>}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-bg/95 backdrop-blur border-t border-line">
        <div className="max-w-xl mx-auto px-4 py-3 grid grid-cols-3 gap-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <button type="button" className="btn-secondary min-h-14" disabled={i === 0} onClick={() => goto(i - 1)}>
            הקודם
          </button>
          {last ? (
            <button type="button" className="btn-primary min-h-14 col-span-2 text-lg" onClick={endCook}>
              סיום הכנה
            </button>
          ) : (
            <button type="button" className="btn-primary min-h-14 col-span-2 text-lg" onClick={() => goto(i + 1)}>
              הבא
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
