import { describe, expect, it } from 'vitest';
import {
  chooseQualityTier,
  DEFAULT_QUALITY_TIER,
  INK_AUTONOMOUS_MOTION,
  INK_MACRO_DRIFT,
  INK_MACRO_DRIFT_SPEED,
  INK_PALETTES,
  resolveInkMotionPolicy
} from './ink-flow-config';

describe('ink flow configuration', () => {
  it('keeps a restrained and distinct accent for every step', () => {
    expect(INK_PALETTES[1].accentHex).toBe('#315c73');
    expect(INK_PALETTES[2].accentHex).toBe('#35675d');
    expect(INK_PALETTES[3].accentHex).toBe('#6e6042');
    expect(Object.values(INK_PALETTES).map((palette) => palette.accentOpacity)).toEqual([
      0.105,
      0.095,
      0.1
    ]);
    expect(Object.values(INK_PALETTES).map((palette) => palette.inkOpacity)).toEqual([
      0.155,
      0.15,
      0.155
    ]);
  });

  it('uses a chromatic wash that matches each step accent', () => {
    expect(INK_PALETTES[1].inkHex).toBe('#5a7488');
    expect(INK_PALETTES[2].inkHex).toBe('#5a7b73');
    expect(INK_PALETTES[3].inkHex).toBe('#897b60');

    const [blueRed, , blue] = INK_PALETTES[1].ink;
    const [greenRed, green, greenBlue] = INK_PALETTES[2].ink;
    const [goldRed, goldGreen, goldBlue] = INK_PALETTES[3].ink;
    expect(blue).toBeGreaterThan(blueRed);
    expect(green).toBeGreaterThan(greenRed);
    expect(green).toBeGreaterThan(greenBlue);
    expect(goldRed).toBeGreaterThan(goldGreen);
    expect(goldGreen).toBeGreaterThan(goldBlue);
    expect(INK_PALETTES[1].accent).toEqual([0.192, 0.361, 0.451]);
    expect(INK_PALETTES[1].ink).toEqual([0.353, 0.455, 0.533]);
    expect(INK_PALETTES[2].accent).toEqual([0.208, 0.404, 0.365]);
    expect(INK_PALETTES[2].ink).toEqual([0.353, 0.482, 0.451]);
    expect(INK_PALETTES[3].accent).toEqual([0.431, 0.376, 0.259]);
    expect(INK_PALETTES[3].ink).toEqual([0.537, 0.482, 0.376]);
  });

  it('uses one clearly visible autonomous flow cadence on every animated device', () => {
    expect(INK_AUTONOMOUS_MOTION).toEqual({
      timeScale: 0.1,
      warpStrength: 0.92
    });
    expect(resolveInkMotionPolicy({ coarsePointer: true, reducedMotion: false }).animate).toBe(true);
    expect(resolveInkMotionPolicy({ coarsePointer: false, reducedMotion: false }).animate).toBe(true);
  });

  it('keeps independently phased macro drift inside the composition bounds', () => {
    expect(INK_MACRO_DRIFT).toEqual({
      left: {
        xAmplitude: 0.07,
        xPeriodSeconds: 18,
        xPhase: 0,
        yAmplitude: 0.045,
        yPeriodSeconds: 24,
        yPhase: 1.15
      },
      upper: {
        xAmplitude: 0.055,
        xPeriodSeconds: 23,
        xPhase: 2.1,
        yAmplitude: 0.035,
        yPeriodSeconds: 17,
        yPhase: 0.35
      },
      right: {
        xAmplitude: 0.065,
        xPeriodSeconds: 20,
        xPhase: 4.2,
        yAmplitude: 0.05,
        yPeriodSeconds: 27,
        yPhase: 2.75
      }
    });

    const lobes = Object.values(INK_MACRO_DRIFT);
    expect(Math.max(...lobes.flatMap((lobe) => [lobe.xAmplitude, lobe.yAmplitude]))).toBeLessThanOrEqual(0.07);
    expect(new Set(lobes.flatMap((lobe) => [lobe.xPeriodSeconds, lobe.yPeriodSeconds])).size).toBe(6);
    expect(INK_MACRO_DRIFT_SPEED).toBe(1.6);
    const effectivePeriods = lobes.flatMap((lobe) => [
      lobe.xPeriodSeconds / INK_MACRO_DRIFT_SPEED,
      lobe.yPeriodSeconds / INK_MACRO_DRIFT_SPEED
    ]);
    expect(Math.min(...effectivePeriods)).toBeCloseTo(10.625, 3);
    expect(Math.max(...effectivePeriods)).toBeCloseTo(16.875, 3);
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
