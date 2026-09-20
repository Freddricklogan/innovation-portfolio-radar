/**
 * Option-value scoring and the stage gates. Stated so a reader can disagree:
 *
 *   expected value  = successProbability × upside
 *   option value    = expected value − nextStageCost   (what the next stage buys, net)
 *   value ratio     = expected value ÷ nextStageCost   (leverage of the next dollar)
 *   evidence rate   = hypothesesHeld ÷ hypothesesTested
 *
 * Gates, in order:
 *   kill   evidence rate below the kill threshold once minHypotheses have been tested
 *   hold   stale in stage beyond staleMonths, or evidence not yet sufficient (fewer than minHypotheses tested at validation or later)
 *   scale  pilot or later and value ratio ≥ scaleRatio
 *   fund   otherwise — proceed to the next stage
 */

import { DEFAULT_THRESHOLDS, STAGES, type GateThresholds, type Horizon, type Initiative, type Stage } from './model.ts';

export type Gate = 'kill' | 'hold' | 'scale' | 'fund';
export const GATE_LABEL: Record<Gate, string> = { kill: 'Kill', hold: 'Hold', scale: 'Scale', fund: 'Fund next stage' };

export interface Score {
  id: string;
  expectedValue: number;
  optionValue: number;
  valueRatio: number | null;
  evidenceRate: number | null;
  gate: Gate;
  rationale: string;
}

const r2 = (v: number): number => Number(v.toFixed(2));
const stageIndex = (s: Stage): number => STAGES.indexOf(s);

export function score(i: Initiative, t: GateThresholds = DEFAULT_THRESHOLDS): Score {
  const expectedValue = i.successProbability * i.upside;
  const optionValue = expectedValue - i.nextStageCost;
  const valueRatio = i.nextStageCost > 0 ? r2(expectedValue / i.nextStageCost) : null;
  const evidenceRate = i.hypothesesTested > 0 ? r2(i.hypothesesHeld / i.hypothesesTested) : null;
  let gate: Gate;
  let rationale: string;
  if (evidenceRate != null && i.hypothesesTested >= t.minHypotheses && evidenceRate < t.killEvidenceRate) {
    gate = 'kill';
    rationale = `Only ${i.hypothesesHeld} of ${i.hypothesesTested} hypotheses held (${Math.round(evidenceRate * 100)}%), below the ${Math.round(t.killEvidenceRate * 100)}% kill line.`;
  } else if (i.monthsInStage > t.staleMonths) {
    gate = 'hold';
    rationale = `${i.monthsInStage} months in ${i.stage} without a gate decision, beyond the ${t.staleMonths}-month limit; decide or stop.`;
  } else if (stageIndex(i.stage) >= stageIndex('validation') && i.hypothesesTested < t.minHypotheses) {
    gate = 'hold';
    rationale = `At ${i.stage} with only ${i.hypothesesTested} hypotheses tested; gather evidence before funding.`;
  } else if (stageIndex(i.stage) >= stageIndex('pilot') && valueRatio != null && valueRatio >= t.scaleRatio) {
    gate = 'scale';
    rationale = `Expected value is ${valueRatio}× the next-stage cost at ${i.stage}; scale.`;
  } else {
    gate = 'fund';
    rationale = valueRatio == null ? 'No next-stage cost; proceed.' : `Expected value ${valueRatio}× the next-stage cost; fund the next stage and test the next hypotheses.`;
  }
  return { id: i.id, expectedValue: r2(expectedValue), optionValue: r2(optionValue), valueRatio, evidenceRate, gate, rationale };
}

export function scoreAll(initiatives: Initiative[], t?: GateThresholds): Score[] {
  return initiatives.map((i) => score(i, t)).sort((a, b) => b.optionValue - a.optionValue || a.id.localeCompare(b.id));
}

export interface MixRow { horizon: Horizon; count: number; nextSpend: number; share: number; target: number; delta: number }

export interface PortfolioSummary {
  total: number;
  gates: Record<Gate, number>;
  invested: number;
  nextSpend: number;
  expectedValue: number;
  /** Spend on initiatives gated fund or scale, by horizon, against the target mix. */
  mix: MixRow[];
}

export function summarize(initiatives: Initiative[], scores: Score[], t: GateThresholds = DEFAULT_THRESHOLDS): PortfolioSummary {
  const gates: Record<Gate, number> = { kill: 0, hold: 0, scale: 0, fund: 0 };
  const byId = new Map(scores.map((s) => [s.id, s]));
  let invested = 0; let nextSpend = 0; let ev = 0;
  const spendByH: Record<Horizon, number> = { 1: 0, 2: 0, 3: 0 };
  const countByH: Record<Horizon, number> = { 1: 0, 2: 0, 3: 0 };
  for (const i of initiatives) {
    const s = byId.get(i.id);
    if (!s) continue;
    gates[s.gate] += 1;
    invested += i.invested;
    ev += s.expectedValue;
    countByH[i.horizon] += 1;
    if (s.gate === 'fund' || s.gate === 'scale') { nextSpend += i.nextStageCost; spendByH[i.horizon] += i.nextStageCost; }
  }
  const mix: MixRow[] = ([1, 2, 3] as Horizon[]).map((h) => {
    const share = nextSpend > 0 ? spendByH[h] / nextSpend : 0;
    return { horizon: h, count: countByH[h], nextSpend: spendByH[h], share: r2(share), target: t.targetMix[h], delta: r2(share - t.targetMix[h]) };
  });
  return { total: initiatives.length, gates, invested, nextSpend, expectedValue: r2(ev), mix };
}

export function validateInitiative(i: Initiative): string[] {
  const p: string[] = [];
  if (!i.name.trim()) p.push('name is required');
  if (![1, 2, 3].includes(i.horizon)) p.push('horizon must be 1, 2 or 3');
  if (!STAGES.includes(i.stage)) p.push('stage must be idea, discovery, validation, pilot or scale');
  for (const k of ['invested', 'nextStageCost', 'upside'] as const) if (!(i[k] >= 0)) p.push(`${k} must be non-negative`);
  if (!(i.successProbability >= 0 && i.successProbability <= 1)) p.push('successProbability must be 0–1');
  if (!Number.isInteger(i.hypothesesTested) || i.hypothesesTested < 0) p.push('hypothesesTested must be a non-negative integer');
  if (!Number.isInteger(i.hypothesesHeld) || i.hypothesesHeld < 0 || i.hypothesesHeld > i.hypothesesTested) p.push('hypothesesHeld must be 0–hypothesesTested');
  if (!(i.monthsInStage >= 0)) p.push('monthsInStage must be non-negative');
  if (!Number.isInteger(i.strategicFit) || i.strategicFit < 1 || i.strategicFit > 5) p.push('strategicFit must be an integer 1–5');
  return p;
}

export function validateThresholds(t: GateThresholds): string[] {
  const p: string[] = [];
  if (!(t.killEvidenceRate >= 0 && t.killEvidenceRate <= 1)) p.push('kill evidence rate must be 0–1');
  if (!Number.isInteger(t.minHypotheses) || t.minHypotheses < 1) p.push('minimum hypotheses must be a positive integer');
  if (!(t.staleMonths >= 1)) p.push('stale months must be at least 1');
  if (!(t.scaleRatio >= 1)) p.push('scale ratio must be at least 1');
  const sum = t.targetMix[1] + t.targetMix[2] + t.targetMix[3];
  if (Math.abs(sum - 1) > 1e-6) p.push('target mix must sum to 100%');
  return p;
}
