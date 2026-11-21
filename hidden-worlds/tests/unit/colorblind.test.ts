// SHELL-4: the colour-blind palette stays distinguishable by lightness under simulated
// deuteranopia and protanopia (Machado et al. 2009), and only changes drawing.
import { describe, expect, it } from 'vitest';
import { COLORS, COLORS_CB } from '../../src/engine/render/palette';
import { lightness, simulate } from '../../src/engine/render/cvd';
import { generate } from '../../src/engine/logic';
import { syntheticPack } from '../fixtures/synthetic-pack';

const MIN_GAP = 5;
const minGap = (p: Record<string, string>, v: 'normal' | 'protanopia' | 'deuteranopia') => {
  const L = Object.values(p)
    .map((h) => lightness(simulate(h, v)))
    .sort((a, b) => a - b);
  return Math.min(...L.slice(1).map((x, i) => x - L[i]!));
};

describe('colour-blind palette', () => {
  it('has the same eight colour names', () => {
    expect(Object.keys(COLORS_CB).sort()).toEqual(Object.keys(COLORS).sort());
  });
  for (const v of ['normal', 'protanopia', 'deuteranopia'] as const)
    it(`every pair is at least ${MIN_GAP} L* apart (${v})`, () => {
      expect(minGap(COLORS_CB, v)).toBeGreaterThanOrEqual(MIN_GAP);
    });
  it('the default palette does not meet the bar, which is why the mode exists', () => {
    expect(minGap(COLORS, 'deuteranopia')).toBeLessThan(MIN_GAP);
  });
  it('the simulation behaves: red and green converge for deuteranopes', () => {
    const r = simulate('#ff0000', 'deuteranopia');
    const g = simulate('#00ff00', 'deuteranopia');
    expect(Math.abs(r[0] - g[0]) + Math.abs(r[2] - g[2])).toBeLessThan(0.6);
  });
  it('never changes placement: specs carry colour names, never display hex values', () => {
    const pack = syntheticPack();
    const spec = generate({ seed: 'cb', difficulty: 3, worldId: 'meadow', pack });
    for (const sp of spec.sprites.filter((x) => x.role === 'target' || x.role === 'decoy')) {
      expect(pack.colors).toContain(sp.color);
      expect(Object.values(COLORS_CB)).not.toContain(sp.color);
    }
    // the logic layer has no way to see the palette (also enforced by the purity test)
    expect(JSON.stringify(spec)).not.toMatch(new RegExp(Object.values(COLORS_CB).join('|'), 'i'));
  });
});
