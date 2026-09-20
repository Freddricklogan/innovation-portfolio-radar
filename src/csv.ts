/** Initiative CSV import/export with row-level validation. */

import { csvField, parseCsv } from './csv-core.ts';
import type { Horizon, Initiative, Stage } from './model.ts';
import { validateInitiative } from './scoring.ts';

export const COLUMNS = ['id', 'name', 'owner', 'horizon', 'stage', 'invested', 'next_stage_cost', 'upside', 'success_probability', 'hypotheses_tested', 'hypotheses_held', 'months_in_stage', 'strategic_fit'] as const;

export function toCsv(initiatives: Initiative[]): string {
  const lines = [COLUMNS.join(',')];
  for (const i of initiatives) lines.push([i.id, i.name, i.owner, i.horizon, i.stage, i.invested, i.nextStageCost, i.upside, i.successProbability, i.hypothesesTested, i.hypothesesHeld, i.monthsInStage, i.strategicFit].map(csvField).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

export function importInitiatives(text: string): { initiatives: Initiative[]; warnings: string[] } {
  const { headers, rows, warnings } = parseCsv(text);
  const required = COLUMNS.filter((c) => c !== 'id' && c !== 'owner');
  const missing = required.filter((c) => !headers.includes(c));
  if (headers.length && missing.length) return { initiatives: [], warnings: [`Missing required column(s): ${missing.join(', ')}.`] };
  const out: Initiative[] = [];
  const seen = new Set<string>();
  rows.forEach((r, idx) => {
    const n = (k: string): number => Number(r[k]);
    const i: Initiative = {
      id: (r['id'] ?? '').trim().slice(0, 40) || `row-${idx + 1}`,
      name: (r['name'] ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
      owner: (r['owner'] ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
      horizon: n('horizon') as Horizon, stage: (r['stage'] ?? '').trim().toLowerCase() as Stage,
      invested: n('invested'), nextStageCost: n('next_stage_cost'), upside: n('upside'), successProbability: n('success_probability'),
      hypothesesTested: n('hypotheses_tested'), hypothesesHeld: n('hypotheses_held'), monthsInStage: n('months_in_stage'), strategicFit: n('strategic_fit')
    };
    const problems = validateInitiative(i);
    if (seen.has(i.id)) problems.push(`duplicate id "${i.id}"`);
    if (problems.length) { warnings.push(`Row ${idx + 2}: ${problems.join('; ')}; skipped.`); return; }
    seen.add(i.id);
    out.push(i);
  });
  return { initiatives: out, warnings };
}
