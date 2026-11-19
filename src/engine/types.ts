/** All masses are grams. Fractions are 0..1. */

export type Provenance = 'source' | 'user' | 'calc' | 'recommendation' | 'needs_verification';

export type AdditiveCategory = 'salt' | 'cure' | 'spice' | 'sugar' | 'phosphate' | 'other';

export interface Additive {
  id: string;
  name: string;
  category: AdditiveCategory;
  /** grams per kg of meat block (lean + added fat) */
  gramsPerKgMeatBlock: number;
  role?: string;
  safetyCritical: boolean;
  requiresVerification: boolean;
  provenance: Provenance;
  enabled: boolean;
  note?: string;
}

export interface Recipe {
  id: string;
  name: string;
  version: number;
  locked: boolean;
  source: string;
  /** added fat as fraction of meat block */
  fatFraction: number;
  /** coarse share of lean meat */
  coarseShareOfLean: number;
  /** ice as fraction of meat block */
  iceFraction: number;
  grinding: { coarseMm: number; fineMm: number };
  additives: Additive[];
}

export interface CureProduct {
  name: string;
  manufacturer: string;
  /** sodium nitrite fraction, e.g. 0.006 for 0.6% */
  nitriteFraction: number | null;
  containsNitrate: 'yes' | 'no' | 'unknown';
  restIsSalt: 'yes' | 'unknown';
  labelInstructions: string;
  verified: boolean;
  verifiedSource: string;
  verifiedAt: string | null;
  /** date printed on the pack (YYYY-MM-DD), if any */
  bestBefore?: string | null;
}

export interface RegulatoryProfile {
  id: string;
  name: string;
  /** maximum ingoing nitrite, expressed as sodium nitrite, mg per kg */
  maxPpmAsSodiumNitrite: number;
  basis: string;
  source: string;
  sourceUrl: string;
  versionDate: string;
  scope: string;
}

export interface Line {
  id: string;
  name: string;
  grams: number;
  provenance: Provenance;
  category: 'meat' | 'fat' | 'ice' | AdditiveCategory;
  requiresVerification?: boolean;
  safetyCritical?: boolean;
  note?: string;
}

export interface Formulation {
  meatBlock: number; // M
  lean: number; // L
  fat: number; // F
  coarse: number; // C
  fine: number; // G
  ice: number; // I
  additivesTotal: number; // A
  batch: number; // B
  lines: Line[];
  /** basis the user started from, for display */
  input: { kind: InputKind; value: number };
  fatPercent: number;
  coarsePercentOfLean: number;
  lossFraction: number;
  /** expected mass after process loss, when a loss was given */
  expectedAfterLoss: number | null;
}

export type InputKind = 'meatBlock' | 'lean' | 'fat' | 'batch' | 'count' | 'inventory' | 'rounded';
