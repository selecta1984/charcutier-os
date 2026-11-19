import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { CureProduct, Recipe } from './engine';
import { RECIPES, SUPPLIER_CURE } from './engine';
import { DEFAULT_TOLERANCES, type RoundingTolerances } from './engine';

export type Screen = 'home' | 'weight' | 'inventory' | 'count' | 'rounding' | 'cure' | 'backup' | 'recipe' | 'changelog';
export type WeightBasis = 'meatBlock' | 'lean' | 'fat' | 'batch';
export type InventoryOption = 'asis' | 'complete' | 'part';

export interface AppState {
  screen: Screen;
  lastWork: Screen | null;
  weight: { basis: WeightBasis; value: number; lossPct: number };
  inventory: { coarse: number; fine: number; fat: number; declaredLean: number | null; option: InventoryOption };
  count: { count: number; gramsEach: number; lossPct: number; useCasing: boolean; diameterMm: number; lengthCm: number; density: number };
  rounding: { target: number; step: number; tol: RoundingTolerances; selected: number };
  cure: CureProduct | null;
  recipeId: string;
  /** user's answer for source items that are not on the photographed page */
  confirmations: Record<string, 'keep' | 'remove'>;
  profileId: string | null;
  scaleResolution: number;
  go: (s: Screen) => void;
  set: <K extends keyof Omit<AppState, 'go' | 'set' | 'importData'>>(k: K, v: AppState[K]) => void;
  importData: (data: unknown) => void;
}

/** localStorage that never throws (private mode, sandboxed frames) — falls back to memory */
const memory = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      memory.set(k, v);
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      memory.delete(k);
    }
  },
};

const WORK: Screen[] = ['weight', 'inventory', 'count', 'rounding'];

export const DEFAULT_CURE: CureProduct = {
  name: 'מלח קיור (מלח ניטריט)',
  manufacturer: '',
  nitriteFraction: 0.006,
  containsNitrate: 'unknown',
  restIsSalt: 'unknown',
  labelInstructions: '',
  verified: false,
  verifiedSource: '',
  verifiedAt: null,
};

export const PERSIST_KEY = 'charcutier-os-v1';

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      screen: 'home',
      lastWork: null,
      weight: { basis: 'lean', value: 2000, lossPct: 0 },
      inventory: { coarse: 719, fine: 680, fat: 600, declaredLean: null, option: 'asis' },
      count: { count: 50, gramsEach: 60, lossPct: 5, useCasing: false, diameterMm: 28, lengthCm: 12, density: 1 },
      rounding: { target: 2500, step: 100, tol: DEFAULT_TOLERANCES, selected: 0 },
      cure: SUPPLIER_CURE,
      recipeId: RECIPES[0].id,
      confirmations: {},
      profileId: 'eu-2023-2108',
      scaleResolution: 1,
      go: (s) => {
        set((st) => ({ screen: s, lastWork: WORK.includes(s) ? s : st.lastWork }));
        try {
          window.scrollTo({ top: 0 });
        } catch {
          /* noop */
        }
      },
      set: (k, v) => set({ [k]: v } as Partial<AppState>),
      importData: (data) => {
        if (!data || typeof data !== 'object') throw new Error('קובץ לא תקין');
        const d = data as Record<string, unknown>;
        if (d.app !== 'charcutier-os') throw new Error('הקובץ אינו גיבוי של מעבדת הנקניקיות');
        const s = d.state as Partial<AppState>;
        const allowed: (keyof AppState)[] = ['weight', 'inventory', 'count', 'rounding', 'cure', 'recipeId', 'confirmations', 'profileId', 'scaleResolution'];
        const patch: Partial<AppState> = {};
        for (const k of allowed) if (k in s) (patch as Record<string, unknown>)[k] = s[k];
        set(patch);
      },
    }),
    {
      name: PERSIST_KEY,
      version: 3,
      // v2: "יש לי בשר" starts from lean meat
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        if (version < 2) p.weight = { basis: 'lean', value: 2000, lossPct: 0 };
        // v3: curing salt verified from the label and the supplier
        if (version < 3 && (!p.cure || !p.cure.verified)) p.cure = SUPPLIER_CURE;
        if (!p.recipeId) p.recipeId = RECIPES[0].id;
        if (!p.confirmations) p.confirmations = {};
        return p as AppState;
      },
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        screen: s.screen,
        lastWork: s.lastWork,
        weight: s.weight,
        inventory: s.inventory,
        count: s.count,
        rounding: s.rounding,
        cure: s.cure,
        recipeId: s.recipeId,
        confirmations: s.confirmations,
        profileId: s.profileId,
        scaleResolution: s.scaleResolution,
      }),
    },
  ),
);

/** recipe with the user's answers applied: confirmed items lose the "to verify" flag, removed items are switched off */
export function applyConfirmations(r: Recipe, c: Record<string, 'keep' | 'remove'>): Recipe {
  if (!c || Object.keys(c).length === 0) return r;
  return {
    ...r,
    additives: r.additives.map((a) =>
      c[a.id] === 'remove'
        ? { ...a, enabled: false, requiresVerification: false, provenance: 'user' as const, note: 'הוסר לפי אישורך' }
        : c[a.id] === 'keep'
          ? { ...a, requiresVerification: false, provenance: 'user' as const, note: 'אושר על ידך' }
          : a,
    ),
  };
}

export function useRecipe(): Recipe {
  const id = useApp((s) => s.recipeId);
  const conf = useApp((s) => s.confirmations);
  return useMemo(() => applyConfirmations(RECIPES.find((r) => r.id === id) ?? RECIPES[0], conf), [id, conf]);
}

export function exportData(s: AppState): string {
  const { weight, inventory, count, rounding, cure, recipeId, profileId, scaleResolution } = s;
  return JSON.stringify(
    { app: 'charcutier-os', version: 1, exportedAt: new Date().toISOString(), state: { weight, inventory, count, rounding, cure, recipeId, confirmations: s.confirmations, profileId, scaleResolution } },
    null,
    2,
  );
}
