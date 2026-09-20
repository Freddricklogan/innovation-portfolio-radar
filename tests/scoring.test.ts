import { describe, it, expect } from 'vitest';
import { DEFAULT_THRESHOLDS, sampleInitiatives, type Initiative } from '../src/model.ts';
import { score, scoreAll, summarize, validateInitiative, validateThresholds } from '../src/scoring.ts';

const base: Initiative = { id: 'x', name: 'X', owner: 'o', horizon: 2, stage: 'pilot', invested: 10_000, nextStageCost: 50_000, upside: 500_000, successProbability: 0.4, hypothesesTested: 5, hypothesesHeld: 4, monthsInStage: 3, strategicFit: 4 };

describe('score', () => {
  it('computes expected and option value, ratio and evidence rate', () => {
    const s = score(base);
    expect(s.expectedValue).toBe(200_000);
    expect(s.optionValue).toBe(150_000);
    expect(s.valueRatio).toBe(4);
    expect(s.evidenceRate).toBe(0.8);
    expect(s.gate).toBe('scale');
    expect(s.rationale).toMatch(/4× the next-stage cost/);
  });
  it('gates in order: kill beats hold beats scale', () => {
    expect(score({ ...base, hypothesesHeld: 1 }).gate).toBe('kill');                       // 20% < 40% with 5 tested
    expect(score({ ...base, hypothesesHeld: 1, hypothesesTested: 2 }).gate).toBe('hold');  // too few tested at pilot → hold (evidence)
    expect(score({ ...base, monthsInStage: 10 }).gate).toBe('hold');                       // stale
    expect(score({ ...base, monthsInStage: 10 }).rationale).toMatch(/10 months in pilot/);
    expect(score({ ...base, stage: 'validation' }).gate).toBe('fund');                     // not yet pilot → cannot scale
    expect(score({ ...base, successProbability: 0.2 }).gate).toBe('fund');                 // ratio 2 < 3
    expect(score({ ...base, stage: 'idea', hypothesesTested: 0, hypothesesHeld: 0 }).gate).toBe('fund');
    expect(score({ ...base, nextStageCost: 0 }).valueRatio).toBeNull();
    expect(score({ ...base, nextStageCost: 0, stage: 'validation' }).rationale).toMatch(/No next-stage cost/);
  });
  it('boundaries: kill line and scale ratio are inclusive as documented', () => {
    expect(score({ ...base, hypothesesTested: 5, hypothesesHeld: 2 }).gate).toBe('scale');    // 0.4 is not below 0.4, so no kill
    expect(score({ ...base, successProbability: 0.3 }).gate).toBe('scale');                     // ratio exactly 3
    expect(score({ ...base, hypothesesTested: 2, hypothesesHeld: 0 }).gate).toBe('hold');      // below minHypotheses → hold, not kill
    expect(score({ ...base, monthsInStage: 9 }).gate).toBe('scale');                            // 9 is not beyond 9
  });
  it('honours custom thresholds', () => {
    expect(score({ ...base, monthsInStage: 5 }, { ...DEFAULT_THRESHOLDS, staleMonths: 4 }).gate).toBe('hold');
  });
});

describe('sample portfolio', () => {
  it('scores as expected and sorts by option value', () => {
    const all = scoreAll(sampleInitiatives());
    for (let i = 1; i < all.length; i += 1) expect(all[i - 1]!.optionValue).toBeGreaterThanOrEqual(all[i]!.optionValue);
    const g = Object.fromEntries(all.map((s) => [s.id, s.gate]));
    expect(g['a']).toBe('scale');   // 630k / 90k = 7×, pilot
    expect(g['c']).toBe('kill');    // 1 of 4 held
    expect(g['d']).toBe('scale');
    expect(g['f']).toBe('hold');    // 14 months idle
    expect(g['h']).toBe('kill');    // 2 of 7
    expect(g['e']).toBe('fund');
  });
  it('summarises gates, spend and the horizon mix against target', () => {
    const inits = sampleInitiatives();
    const s = summarize(inits, scoreAll(inits));
    expect(s.total).toBe(8);
    expect(s.gates.kill + s.gates.hold + s.gates.scale + s.gates.fund).toBe(8);
    expect(s.invested).toBe(inits.reduce((a, i) => a + i.invested, 0));
    expect(s.mix.reduce((a, m) => a + m.share, 0)).toBeCloseTo(1, 1);
    expect(s.mix[0]!.target).toBe(0.7);
    const funded = inits.filter((i) => ['fund', 'scale'].includes(scoreAll(inits).find((x) => x.id === i.id)!.gate));
    expect(s.nextSpend).toBe(funded.reduce((a, i) => a + i.nextStageCost, 0));
  });
  it('empty portfolio', () => {
    const s = summarize([], []);
    expect(s.nextSpend).toBe(0);
    expect(s.mix.every((m) => m.share === 0)).toBe(true);
  });
});

describe('validation', () => {
  it('accepts the sample and the default thresholds', () => {
    for (const i of sampleInitiatives()) expect(validateInitiative(i)).toEqual([]);
    expect(validateThresholds(DEFAULT_THRESHOLDS)).toEqual([]);
  });
  it('reports every problem', () => {
    expect(validateInitiative({ ...base, name: '', horizon: 4 as never, stage: 'nope' as never, upside: -1, successProbability: 2, hypothesesTested: 1.5, hypothesesHeld: 9, monthsInStage: -1, strategicFit: 0 })).toHaveLength(9);
    expect(validateThresholds({ ...DEFAULT_THRESHOLDS, killEvidenceRate: 2, minHypotheses: 0, staleMonths: 0, scaleRatio: 0.5, targetMix: { 1: 0.5, 2: 0.5, 3: 0.5 } })).toHaveLength(5);
  });
});
