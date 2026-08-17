import { describe, expect, it } from 'vitest';
import {
  chooseQualityTier,
  DEFAULT_QUALITY_TIER,
  INK_PALETTES,
  shouldRenderStaticInk
} from './ink-flow-config';

describe('ink flow configuration', () => {
  it('keeps a restrained and distinct accent for every step', () => {
    expect(INK_PALETTES[1].accentHex).toBe('#174087');
    expect(INK_PALETTES[2].accentHex).toBe('#a87314');
    expect(INK_PALETTES[3].accentHex).toBe('#92291c');
    expect(Object.values(INK_PALETTES).every((palette) => palette.accentOpacity <= 0.11)).toBe(true);
    expect(Object.values(INK_PALETTES).every((palette) => palette.inkOpacity <= 0.16)).toBe(true);
  });

  it('adapts quality only when a high-refresh display misses its frame budget', () => {
    expect(chooseQualityTier(1, 10.2, 7.1)).toBe(0);
    expect(chooseQualityTier(1, 6.9, 6.2)).toBe(2);
    expect(chooseQualityTier(1, 8.2, 7.2)).toBe(1);
  });

  it('does not penalize a stable display whose refresh interval is the limiting factor', () => {
    expect(chooseQualityTier(0, 16.7, 16.1)).toBe(DEFAULT_QUALITY_TIER);
  });

  it('uses a static frame only for reduced motion and coarse pointers', () => {
    expect(shouldRenderStaticInk({ coarsePointer: false, reducedMotion: false, step: 1 })).toBe(false);
    expect(shouldRenderStaticInk({ coarsePointer: true, reducedMotion: false, step: 1 })).toBe(true);
    expect(shouldRenderStaticInk({ coarsePointer: false, reducedMotion: true, step: 2 })).toBe(true);
    expect(shouldRenderStaticInk({ coarsePointer: false, reducedMotion: false, step: 3 })).toBe(false);
  });
});
