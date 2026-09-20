import { describe, it, expect } from 'vitest';
import { importInitiatives, toCsv } from '../src/csv.ts';
import { sampleInitiatives } from '../src/model.ts';
import { csvField, parseCsv } from '../src/csv-core.ts';

describe('initiative CSV', () => {
  it('round-trips the sample', () => {
    const back = importInitiatives(toCsv(sampleInitiatives()));
    expect(back.warnings).toEqual([]);
    expect(back.initiatives).toEqual(sampleInitiatives());
  });
  it('requires columns, validates, rejects duplicates', () => {
    expect(importInitiatives('id,name\n1,x\n').warnings[0]).toMatch(/Missing required/);
    const head = 'id,name,horizon,stage,invested,next_stage_cost,upside,success_probability,hypotheses_tested,hypotheses_held,months_in_stage,strategic_fit';
    const r = importInitiatives([head, 'a,Good,1,pilot,1,2,3,0.5,2,1,1,3', 'a,Dup,1,pilot,1,2,3,0.5,2,1,1,3', 'b,Bad,9,x,1,2,3,5,2,3,1,3'].join('\n'));
    expect(r.initiatives.map((i) => i.id)).toEqual(['a']);
    expect(r.warnings).toHaveLength(2);
  });
});

describe('csv-core', () => {
  it('parses quotes, doubled quotes, newlines, CRLF, BOM; reports ragged/empty/unterminated', () => {
    expect(parseCsv('﻿A,B\r\n"x, ""y""","l1\nl2"\r\n').rows).toEqual([{ a: 'x, "y"', b: 'l1\nl2' }]);
    expect(parseCsv('a,b\n1\n').warnings[0]).toMatch(/Row 2/);
    expect(parseCsv('').warnings).toEqual(['File is empty.']);
    expect(parseCsv('a\n"x').warnings[0]).toMatch(/Unterminated/);
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField(null)).toBe('');
  });
});
