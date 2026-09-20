/** Entry point. */

import './shell/exec-shell.css';
import './app.css';
import { mountExecShell } from './shell/exec-shell.js';
import { DEFAULT_THRESHOLDS, sampleInitiatives, type GateThresholds, type Initiative } from './model.ts';
import { score, scoreAll, summarize, validateInitiative, validateThresholds, type Score } from './scoring.ts';
import { importInitiatives, toCsv } from './csv.ts';
import { fmtUsd, renderEditor, renderList, renderRadar, renderSummary, renderThresholds, type Field } from './ui.ts';

const REPO = 'https://github.com/Freddricklogan/innovation-portfolio-radar';
const PAGES = 'https://freddricklogan.github.io/innovation-portfolio-radar/';
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => { const n = document.getElementById(id); if (!n) throw new Error(`Missing #${id}`); return n as T; };

const state: { initiatives: Initiative[]; thresholds: GateThresholds; selectedId: string | null; scores: Score[] } = { initiatives: sampleInitiatives(), thresholds: structuredClone(DEFAULT_THRESHOLDS), selectedId: 'b', scores: [] };

function setStatus(text: string, tone: 'ok' | 'warn' | 'danger' | 'muted' = 'muted'): void { const s = $('status'); s.textContent = text; s.dataset['tone'] = tone; }
const selected = (): Initiative | null => state.initiatives.find((i) => i.id === state.selectedId) ?? null;

function render(): void {
  state.scores = scoreAll(state.initiatives, state.thresholds);
  const s = summarize(state.initiatives, state.scores, state.thresholds);
  renderSummary($('summary'), $('mix'), s);
  renderRadar($('radar'), state.initiatives, state.scores, state.selectedId, select);
  renderList($('list'), state.initiatives, state.scores, state.selectedId, select);
  const i = selected();
  renderEditor($('editor'), i, i ? score(i, state.thresholds) : null, edit);
  $('spend-line').textContent = `Invested to date ${fmtUsd(s.invested)} · next-stage spend if every fund/scale gate is approved ${fmtUsd(s.nextSpend)} · expected value across the portfolio ${fmtUsd(s.expectedValue)}`;
  shell.refreshKpis();
}
function select(id: string): void { state.selectedId = id; render(); }
function edit(field: Field, value: number | string): void {
  const i = selected(); if (!i) return;
  const next: Initiative = { ...i, [field]: value };
  const problems = validateInitiative(next);
  if (problems.length) { setStatus(`Change rejected: ${problems[0]}.`, 'danger'); render(); return; }
  const before = score(i, state.thresholds).gate;
  state.initiatives = state.initiatives.map((x) => (x.id === i.id ? next : x));
  const after = score(next, state.thresholds).gate;
  setStatus(before === after ? `${i.name}: ${field} updated.` : `${i.name}: gate changed from ${before} to ${after}.`, before === after ? 'ok' : 'warn');
  render();
}
function setThresholds(next: GateThresholds): void {
  const problems = validateThresholds(next);
  if (problems.length) { setStatus(`Threshold rejected: ${problems[0]}.`, 'danger'); renderThresholds($('thresholds'), state.thresholds, setThresholds); return; }
  state.thresholds = next;
  setStatus('Thresholds updated; every gate re-evaluated.', 'ok');
  render();
}

function download(filename: string, body: string): void { const url = URL.createObjectURL(new Blob([body], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
$('export-csv').addEventListener('click', () => download('initiatives.csv', toCsv(state.initiatives)));
$('import-csv').addEventListener('click', () => $<HTMLInputElement>('file-csv').click());
$<HTMLInputElement>('file-csv').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement; const file = input.files?.[0]; input.value = '';
  if (!file) return;
  file.text().then((text) => {
    const { initiatives, warnings } = importInitiatives(text);
    if (!initiatives.length) { setStatus(`Import failed: ${warnings[0] ?? 'no valid rows.'}`, 'danger'); return; }
    state.initiatives = initiatives; state.selectedId = initiatives[0]?.id ?? null;
    setStatus(warnings.length ? `Imported ${initiatives.length} initiatives with ${warnings.length} warning(s): ${warnings[0]}` : `Imported ${initiatives.length} initiatives.`, warnings.length ? 'warn' : 'ok');
    render();
  }).catch(() => setStatus('Import failed: could not read the file.', 'danger'));
});
$('reset').addEventListener('click', () => { state.initiatives = sampleInitiatives(); state.thresholds = structuredClone(DEFAULT_THRESHOLDS); state.selectedId = 'b'; renderThresholds($('thresholds'), state.thresholds, setThresholds); setStatus('Sample portfolio and thresholds restored.', 'ok'); render(); });

const shell = mountExecShell({
  title: 'Innovation Portfolio Radar',
  tagline: 'A three-horizons innovation portfolio with option-value scoring and explicit kill / hold / fund / scale gates — every gate decision printed with its reason, thresholds editable. Sample portfolio; illustrative.',
  repo: REPO, pagesUrl: PAGES,
  badges: [{ label: 'Explicit stage gates', tone: 'accent' }, { label: 'Three-horizons mix', dot: true }, { label: 'Client-side only', dot: true }],
  kpis: [
    { label: 'Initiatives', compute: () => state.initiatives.length, tone: 'accent' },
    { label: 'Scale', compute: () => summarize(state.initiatives, state.scores, state.thresholds).gates.scale, tone: 'ok' },
    { label: 'Kill', compute: () => summarize(state.initiatives, state.scores, state.thresholds).gates.kill, tone: 'danger' },
    { label: 'Hold', compute: () => summarize(state.initiatives, state.scores, state.thresholds).gates.hold, tone: 'warn' },
    { label: 'Next-stage spend', compute: () => `$${Math.round(summarize(state.initiatives, state.scores, state.thresholds).nextSpend / 1000)}k` }
  ],
  tour: [
    { selector: '#radar', title: 'Three horizons, one chart', body: 'Stage across, horizon down, bubble size is expected value, colour is the gate. The sample is a university innovation portfolio — two of eight initiatives should be killed and one has sat idle for fourteen months.', action: () => { $('reset').click(); } },
    { selector: '#editor', title: 'The gate and its reason', body: 'Kill, hold, fund or scale, decided in that order by evidence rate, time in stage and the ratio of expected value to next-stage cost. The credential wallet is a fund: 3 of 5 hypotheses held, expected value 5.6× the next stage.', action: () => select('b') },
    { selector: '#f-hypothesesHeld', title: 'Evidence moves the gate', body: 'This records three more failed hypotheses on the wallet — 3 of 8 held, 37.5%. The evidence rate drops below the 40% kill line and the gate flips from fund to kill, with the reason printed.', action: () => { edit('hypothesesTested', 8); } },
    { selector: '#mix', title: 'Is the mix right?', body: 'Next-stage spend by horizon against the target split — 70/20/10 by default. The gap column is where the portfolio is over- or under-weight.', action: () => { $('reset').click(); } },
    { selector: '#thresholds', title: 'The rules are yours', body: 'Kill line, minimum evidence, stale-stage limit, scale ratio and target mix are all editable. This lowers the kill line to 25%: both killed initiatives clear their evidence gate — one into hold for staleness, one straight to scale. The rule is visible, so the argument about it can be too.', action: () => { setThresholds({ ...state.thresholds, killEvidenceRate: 0.25 }); } }
  ]
});

renderThresholds($('thresholds'), state.thresholds, setThresholds);
render();
setStatus('Sample portfolio loaded — eight initiatives across three horizons. Select one to see its gate.');
