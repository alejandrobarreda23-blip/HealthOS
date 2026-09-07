import { describe, expect, it } from 'vitest';
import { BODY_VISUAL_GRAMMAR_V1, bodyChannelContract, canAnimateBodyChannel } from '../src/body/grammar';

describe('Body Grammar V1', () => {
  it('registers every visual channel with a declarable meaning', () => {
    expect(BODY_VISUAL_GRAMMAR_V1.length).toBeGreaterThan(0);
    for (const channel of BODY_VISUAL_GRAMMAR_V1) expect(channel.meaning.trim().length).toBeGreaterThan(12);
  });
  it('never animates physiological flow without eligible source data', () => {
    expect(canAnimateBodyChannel('measured-flow', false)).toBe(false);
    expect(canAnimateBodyChannel('deviation-turbulence', false)).toBe(false);
  });
  it('keeps the finding accent non-animated and semantic', () => {
    expect(bodyChannelContract('active-finding')?.meaning).toMatch(/hallazgo activo/i);
    expect(canAnimateBodyChannel('active-finding', true)).toBe(false);
  });
  it('defines missingness explicitly instead of zero', () => {
    expect(bodyChannelContract('missing-fog')?.meaning).toMatch(/nunca cero/i);
  });
});
