/** DOM rendering — textContent and createElement only. */

import { HORIZON_LABEL, STAGES, STAGE_LABEL, type GateThresholds, type Horizon, type Initiative } from './model.ts';
import { GATE_LABEL, type PortfolioSummary, type Score } from './scoring.ts';

type Props = Record<string, string | number | boolean | null | undefined>;
export function el(tag: string, props: Props = {}, kids: Array<Node | string | null | undefined> = []): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) if (kid != null) node.append(kid);
  return node;
}
export function clear(node: Element): void { while (node.firstChild) node.removeChild(node.firstChild); }
export const fmtUsd = (v: number): string => `$${Math.round(v).toLocaleString('en-US')}`;
export const fmtPct = (v: number | null, dp = 0): string => (v == null ? '—' : `${(v * 100).toFixed(dp)}%`);

export function renderSummary(host: HTMLElement, mixHost: HTMLElement, s: PortfolioSummary): void {
  clear(host); clear(mixHost);
  for (const g of ['scale', 'fund', 'hold', 'kill'] as const) {
    host.append(el('div', { class: 'ipr-count', 'data-gate': g }, [el('div', { class: 'ipr-count__n', text: String(s.gates[g]) }), el('div', { class: 'ipr-count__l', text: GATE_LABEL[g] })]));
  }
  mixHost.append(el('thead', {}, [el('tr', {}, ['Horizon', 'Initiatives', 'Next-stage spend (fund + scale)', 'Share', 'Target', 'Gap'].map((h) => el('th', { scope: 'col', text: h })))]));
  const body = el('tbody');
  for (const m of s.mix) {
    body.append(el('tr', {}, [
      el('th', { scope: 'row', text: HORIZON_LABEL[m.horizon] }), el('td', { text: String(m.count) }), el('td', { text: fmtUsd(m.nextSpend) }),
      el('td', { text: fmtPct(m.share) }), el('td', { text: fmtPct(m.target) }),
      el('td', { 'data-tone': Math.abs(m.delta) <= 0.05 ? 'ok' : 'warn', text: `${m.delta > 0 ? '+' : ''}${Math.round(m.delta * 100)} pts` })
    ]));
  }
  mixHost.append(body);
}

/** Radar: stage across (x), horizon as rows (y), bubble size by expected value, colour by gate. */
export function renderRadar(host: HTMLElement, initiatives: Initiative[], scores: Score[], selectedId: string | null, onSelect: (id: string) => void): void {
  clear(host);
  const ns = 'http://www.w3.org/2000/svg';
  const W = 560; const H = 300; const padL = 130; const padR = 30; const padT = 30; const padB = 40;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'ipr-radar'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Portfolio radar: stage across, horizon down, bubble size is expected value, colour is the gate; ${initiatives.length} initiatives`);
  const sx = (stage: number): number => padL + ((stage + 0.5) / STAGES.length) * (W - padL - padR);
  const sy = (h: Horizon): number => padT + ((h - 0.5) / 3) * (H - padT - padB);
  const text = (x: number, y: number, t: string, cls: string): void => { const e = document.createElementNS(ns, 'text'); e.setAttribute('x', String(x)); e.setAttribute('y', String(y)); e.setAttribute('class', cls); e.textContent = t; svg.append(e); };
  STAGES.forEach((st, i) => { text(sx(i), H - padB + 16, STAGE_LABEL[st], 'ipr-axis-label'); const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', String(padL + (i / STAGES.length) * (W - padL - padR))); l.setAttribute('x2', String(padL + (i / STAGES.length) * (W - padL - padR))); l.setAttribute('y1', String(padT)); l.setAttribute('y2', String(H - padB)); l.setAttribute('class', 'ipr-grid'); svg.append(l); });
  ([1, 2, 3] as Horizon[]).forEach((h) => { text(padL - 8, sy(h) + 4, HORIZON_LABEL[h].split(' · ')[0] ?? `H${h}`, 'ipr-axis-label ipr-axis-label--r'); const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', String(padL)); l.setAttribute('x2', String(W - padR)); l.setAttribute('y1', String(padT + ((h - 1) / 3) * (H - padT - padB))); l.setAttribute('y2', String(padT + ((h - 1) / 3) * (H - padT - padB))); l.setAttribute('class', 'ipr-grid'); svg.append(l); });
  const byId = new Map(scores.map((s) => [s.id, s]));
  const maxEv = Math.max(1, ...scores.map((s) => s.expectedValue));
  // spread bubbles that share a cell
  const cellCount = new Map<string, number>();
  for (const i of initiatives) {
    const s = byId.get(i.id); if (!s) continue;
    const key = `${i.stage}-${i.horizon}`;
    const k = cellCount.get(key) ?? 0; cellCount.set(key, k + 1);
    const cx = sx(STAGES.indexOf(i.stage)) + (k % 2 === 0 ? -1 : 1) * 14 * Math.ceil(k / 2);
    const cy = sy(i.horizon) + (k > 0 ? (k % 2 === 0 ? 1 : -1) * 8 : 0);
    const r = 6 + 18 * Math.sqrt(s.expectedValue / maxEv);
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'ipr-dot' + (i.id === selectedId ? ' is-selected' : '')); g.setAttribute('data-gate', s.gate);
    g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', `${i.name}: ${STAGE_LABEL[i.stage]}, ${HORIZON_LABEL[i.horizon]}, ${GATE_LABEL[s.gate]}`);
    const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', String(cx)); c.setAttribute('cy', String(cy)); c.setAttribute('r', String(r));
    const t = document.createElementNS(ns, 'text'); t.setAttribute('x', String(cx)); t.setAttribute('y', String(cy + r + 11)); t.setAttribute('class', 'ipr-dot__label'); t.textContent = i.name;
    g.append(c, t);
    g.addEventListener('click', () => onSelect(i.id));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i.id); } });
    svg.append(g);
  }
  host.append(svg);
}

export function renderList(host: HTMLElement, initiatives: Initiative[], scores: Score[], selectedId: string | null, onSelect: (id: string) => void): void {
  clear(host);
  host.append(el('thead', {}, [el('tr', {}, ['Initiative', 'Horizon', 'Stage', 'Evidence', 'Expected value', 'Next stage', 'Ratio', 'Gate'].map((h) => el('th', { scope: 'col', text: h })))]));
  const body = el('tbody');
  for (const s of scores) {
    const i = initiatives.find((x) => x.id === s.id); if (!i) continue;
    const tr = el('tr', { class: i.id === selectedId ? 'is-selected' : '', tabindex: '0', role: 'button', 'aria-pressed': String(i.id === selectedId), 'aria-label': `Select ${i.name}` }, [
      el('th', { scope: 'row', text: i.name }), el('td', { text: `H${i.horizon}` }), el('td', { text: STAGE_LABEL[i.stage] }),
      el('td', { text: i.hypothesesTested ? `${i.hypothesesHeld}/${i.hypothesesTested} (${fmtPct(s.evidenceRate)})` : 'none yet' }),
      el('td', { text: fmtUsd(s.expectedValue) }), el('td', { text: fmtUsd(i.nextStageCost) }), el('td', { text: s.valueRatio == null ? '—' : `${s.valueRatio}×` }),
      el('td', {}, [el('span', { class: 'ipr-chip', 'data-gate': s.gate, text: GATE_LABEL[s.gate] })])
    ]);
    tr.addEventListener('click', () => onSelect(i.id));
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i.id); } });
    body.append(tr);
  }
  host.append(body);
}

export type Field = 'horizon' | 'stage' | 'invested' | 'nextStageCost' | 'upside' | 'successProbability' | 'hypothesesTested' | 'hypothesesHeld' | 'monthsInStage' | 'strategicFit';

export function renderEditor(host: HTMLElement, i: Initiative | null, s: Score | null, onEdit: (field: Field, value: number | string) => void): void {
  clear(host);
  if (!i || !s) { host.append(el('p', { class: 'ipr-muted', text: 'Select an initiative.' })); return; }
  host.append(el('p', { class: 'ipr-selected', text: `${i.name} — ${i.owner}` }));
  host.append(el('div', { class: 'ipr-verdict', 'data-gate': s.gate }, [el('div', { class: 'ipr-verdict__gate', text: GATE_LABEL[s.gate], 'aria-live': 'polite' }), el('p', { class: 'ipr-verdict__why', text: s.rationale }), el('p', { class: 'ipr-verdict__nums', text: `Expected value ${fmtUsd(s.expectedValue)} · option value ${fmtUsd(s.optionValue)} · evidence ${fmtPct(s.evidenceRate)}` })]));
  const grid = el('div', { class: 'ipr-fields' });
  const horizon = el('select', { id: 'f-horizon' }) as HTMLSelectElement;
  for (const h of [1, 2, 3] as Horizon[]) horizon.append(el('option', { value: String(h), selected: h === i.horizon ? true : null, text: HORIZON_LABEL[h] }));
  horizon.addEventListener('change', () => onEdit('horizon', Number(horizon.value)));
  grid.append(el('label', { for: 'f-horizon' }, ['Horizon', horizon]));
  const stage = el('select', { id: 'f-stage' }) as HTMLSelectElement;
  for (const st of STAGES) stage.append(el('option', { value: st, selected: st === i.stage ? true : null, text: STAGE_LABEL[st] }));
  stage.addEventListener('change', () => onEdit('stage', stage.value));
  grid.append(el('label', { for: 'f-stage' }, ['Stage', stage]));
  const nums: Array<[Field, string, string, (v: number) => string, (v: string) => number]> = [
    ['invested', 'Invested so far ($)', '1000', String, Number], ['nextStageCost', 'Next-stage cost ($)', '1000', String, Number], ['upside', 'Upside if it works ($)', '10000', String, Number],
    ['successProbability', 'Success probability (%)', '5', (v) => String(Math.round(v * 100)), (v) => Number(v) / 100],
    ['hypothesesTested', 'Hypotheses tested', '1', String, Number], ['hypothesesHeld', 'Hypotheses held', '1', String, Number], ['monthsInStage', 'Months in stage', '1', String, Number], ['strategicFit', 'Strategic fit (1–5)', '1', String, Number]
  ];
  for (const [field, label, step, show, parse] of nums) {
    const id = `f-${field}`;
    const input = el('input', { type: 'number', id, step, value: show(i[field] as number) }) as HTMLInputElement;
    input.addEventListener('change', () => onEdit(field, parse(input.value)));
    grid.append(el('label', { for: id }, [label, input]));
  }
  host.append(grid);
}

export function renderThresholds(host: HTMLElement, t: GateThresholds, onChange: (next: GateThresholds) => void): void {
  clear(host);
  const grid = el('div', { class: 'ipr-fields' });
  const rows: Array<[string, string, string, () => string, (v: string) => GateThresholds]> = [
    ['kill', 'Kill below evidence rate (%)', '5', () => String(Math.round(t.killEvidenceRate * 100)), (v) => ({ ...t, killEvidenceRate: Number(v) / 100 })],
    ['min', 'Minimum hypotheses before kill', '1', () => String(t.minHypotheses), (v) => ({ ...t, minHypotheses: Number(v) })],
    ['stale', 'Hold after months in stage', '1', () => String(t.staleMonths), (v) => ({ ...t, staleMonths: Number(v) })],
    ['scale', 'Scale at value ratio (×)', '0.5', () => String(t.scaleRatio), (v) => ({ ...t, scaleRatio: Number(v) })],
    ['h1', 'Target H1 share (%)', '5', () => String(Math.round(t.targetMix[1] * 100)), (v) => ({ ...t, targetMix: { ...t.targetMix, 1: Number(v) / 100 } })],
    ['h2', 'Target H2 share (%)', '5', () => String(Math.round(t.targetMix[2] * 100)), (v) => ({ ...t, targetMix: { ...t.targetMix, 2: Number(v) / 100 } })],
    ['h3', 'Target H3 share (%)', '5', () => String(Math.round(t.targetMix[3] * 100)), (v) => ({ ...t, targetMix: { ...t.targetMix, 3: Number(v) / 100 } })]
  ];
  for (const [key, label, step, show, build] of rows) {
    const id = `t-${key}`;
    const input = el('input', { type: 'number', id, step, value: show() }) as HTMLInputElement;
    input.addEventListener('change', () => onChange(build(input.value)));
    grid.append(el('label', { for: id }, [label, input]));
  }
  host.append(grid);
}
