import { describe, expect, it } from 'vitest';
import {
  chooseQualityTier,
  DEFAULT_QUALITY_TIER,
  INK_AUTONOMOUS_MOTION,
  INK_PALETTES,
  resolveInkMotionPolicy
} from './ink-flow-config';

describe('ink flow configuration', () => {
  it('keeps a restrained and distinct accent for every step', () => {
    expect(INK_PALETTES[1].accentHex).toBe('#174087');
    expect(INK_PALETTES[2].accentHex).toBe('#a87314');
    expect(INK_PALETTES[3].accentHex).toBe('#92291c');
    expect(Object.values(INK_PALETTES).every((palette) => palette.accentOpacity <= 0.11)).toBe(true);
    expect(Object.values(INK_PALETTES).every((palette) => palette.inkOpacity <= 0.16)).toBe(true);
  });

  it('uses one clearly visible autonomous flow cadence on every animated device', () => {
    expect(INK_AUTONOMOUS_MOTION).toEqual({
      timeScale: 0.1,
      warpStrength: 0.92
    });
    expect(resolveInkMotionPolicy({ coarsePointer: true, reducedMotion: false }).animate).toBe(true);
    expect(resolveInkMotionPolicy({ coarsePointer: false, reducedMotion: false }).animate).toBe(true);
  });

  it('adapts quality only when a high-refresh display misses its frame budget', () => {
    expect(chooseQualityTier(1, 10.2, 7.1)).toBe(0);
    expect(chooseQualityTier(1, 6.9, 6.2)).toBe(2);
    expect(chooseQualityTier(1, 8.2, 7.2)).toBe(1);
  });

  it('does not penalize a stable display whose refresh interval is the limiting factor', () => {
    expect(chooseQualityTier(0, 16.7, 16.1)).toBe(DEFAULT_QUALITY_TIER);
  });

  it('keeps mobile ink moving without reacting to touch pointers', () => {
    expect(resolveInkMotionPolicy({ coarsePointer: true, reducedMotion: false })).toEqual({
      animate: true,
      pointerReactive: false
    });
  });

  it('keeps fine-pointer ink moving and pointer reactive', () => {
    expect(resolveInkMotionPolicy({ coarsePointer: false, reducedMotion: false })).toEqual({
      animate: true,
      pointerReactive: true
    });
  });

  it('renders one static frame when motion is reduced', () => {
    expect(resolveInkMotionPolicy({ coarsePointer: false, reducedMotion: true })).toEqual({
      animate: false,
      pointerReactive: false
    });
  });
});
