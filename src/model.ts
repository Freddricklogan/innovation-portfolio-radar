/**
 * Three-horizons innovation portfolio (McKinsey's framing, used as a
 * teaching model): H1 extends the core, H2 builds emerging businesses,
 * H3 creates options for the future. Each initiative carries a stage-gate
 * position and the evidence gathered so far; the engine scores option value
 * and applies explicit kill / hold / scale gates.
 */

export type Horizon = 1 | 2 | 3;
export type Stage = 'idea' | 'discovery' | 'validation' | 'pilot' | 'scale';
export const STAGES: readonly Stage[] = ['idea', 'discovery', 'validation', 'pilot', 'scale'] as const;
export const STAGE_LABEL: Record<Stage, string> = { idea: 'Idea', discovery: 'Discovery', validation: 'Validation', pilot: 'Pilot', scale: 'Scale' };
export const HORIZON_LABEL: Record<Horizon, string> = { 1: 'H1 · Extend the core', 2: 'H2 · Emerging business', 3: 'H3 · Future options' };

export interface Initiative {
  id: string;
  name: string;
  owner: string;
  horizon: Horizon;
  stage: Stage;
  /** Money committed so far and the ask for the next stage. */
  invested: number;
  nextStageCost: number;
  /** Assessor's estimate of the upside if it works, in the same currency. */
  upside: number;
  /** Probability (0–1) the initiative succeeds, as assessed today. */
  successProbability: number;
  /** Hypotheses tested so far and how many held. */
  hypothesesTested: number;
  hypothesesHeld: number;
  /** Months since the last stage gate. */
  monthsInStage: number;
  /** Strategic fit 1–5. */
  strategicFit: number;
}

export interface GateThresholds {
  /** Kill below this evidence rate once enough hypotheses have been tested. */
  killEvidenceRate: number;
  /** Minimum hypotheses tested before evidence rate is trusted. */
  minHypotheses: number;
  /** Hold beyond this many months in a stage without advancing. */
  staleMonths: number;
  /** Scale when option value ÷ next-stage cost exceeds this and the stage is pilot or later. */
  scaleRatio: number;
  /** Target allocation of next-stage spend by horizon (fractions summing to 1). */
  targetMix: Record<Horizon, number>;
}

export const DEFAULT_THRESHOLDS: GateThresholds = {
  killEvidenceRate: 0.4,
  minHypotheses: 3,
  staleMonths: 9,
  scaleRatio: 3,
  targetMix: { 1: 0.7, 2: 0.2, 3: 0.1 }
};

export const SAMPLE_INITIATIVES: Initiative[] = [
  { id: 'a', name: 'Adaptive advising nudges', owner: 'Elevate', horizon: 1, stage: 'pilot', invested: 60_000, nextStageCost: 90_000, upside: 900_000, successProbability: 0.7, hypothesesTested: 6, hypothesesHeld: 5, monthsInStage: 4, strategicFit: 5 },
  { id: 'b', name: 'Employer credential wallet', owner: 'Elevate', horizon: 2, stage: 'validation', invested: 45_000, nextStageCost: 120_000, upside: 1_500_000, successProbability: 0.45, hypothesesTested: 5, hypothesesHeld: 3, monthsInStage: 5, strategicFit: 5 },
  { id: 'c', name: 'Micro-internship marketplace', owner: 'Career Services', horizon: 2, stage: 'discovery', invested: 15_000, nextStageCost: 40_000, upside: 800_000, successProbability: 0.35, hypothesesTested: 4, hypothesesHeld: 1, monthsInStage: 11, strategicFit: 4 },
  { id: 'd', name: 'Lecture-capture search', owner: 'IT Services', horizon: 1, stage: 'scale', invested: 140_000, nextStageCost: 60_000, upside: 600_000, successProbability: 0.85, hypothesesTested: 8, hypothesesHeld: 7, monthsInStage: 3, strategicFit: 3 },
  { id: 'e', name: 'AI tutoring for gateway courses', owner: 'Provost', horizon: 3, stage: 'discovery', invested: 20_000, nextStageCost: 75_000, upside: 4_000_000, successProbability: 0.15, hypothesesTested: 2, hypothesesHeld: 2, monthsInStage: 2, strategicFit: 5 },
  { id: 'f', name: 'Alumni skills graph', owner: 'Advancement', horizon: 3, stage: 'idea', invested: 0, nextStageCost: 25_000, upside: 2_000_000, successProbability: 0.1, hypothesesTested: 0, hypothesesHeld: 0, monthsInStage: 14, strategicFit: 3 },
  { id: 'g', name: 'Course-scheduling optimiser', owner: 'Registrar', horizon: 1, stage: 'validation', invested: 30_000, nextStageCost: 50_000, upside: 400_000, successProbability: 0.6, hypothesesTested: 5, hypothesesHeld: 4, monthsInStage: 6, strategicFit: 2 },
  { id: 'h', name: 'Peer-mentoring matching', owner: 'Student Affairs', horizon: 2, stage: 'pilot', invested: 55_000, nextStageCost: 70_000, upside: 500_000, successProbability: 0.5, hypothesesTested: 7, hypothesesHeld: 2, monthsInStage: 7, strategicFit: 4 }
];

export function sampleInitiatives(): Initiative[] {
  return structuredClone(SAMPLE_INITIATIVES);
}
