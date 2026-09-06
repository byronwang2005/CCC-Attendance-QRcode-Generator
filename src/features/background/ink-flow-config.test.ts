import { describe, expect, it } from 'vitest';
import { adaptInkQuality, blendSceneWeights, inkAsset, INK_PALETTES, INK_SCENES,
  INK_STEPS, initialInkQuality, resolveInkMotionPolicy, sceneWeights } from './ink-flow-config';

describe('ink scenes', () => {
  it('maps each step to its own painting and a single chromatic ink', () => {
    expect(INK_STEPS.map(s => INK_SCENES[s].title)).toEqual(['容膝斋图','溪山清远','富春山居图']);
    expect(new Set(INK_STEPS.map(s => inkAsset(s, 'packed'))).size).toBe(3);
    for (const step of INK_STEPS) {
      expect(INK_PALETTES[step].ink).toEqual(INK_PALETTES[step].accent);
      expect(INK_PALETTES[step].accentOpacity).toBe(0);
      expect(INK_SCENES[step].mobileAnchor).toBeGreaterThanOrEqual(0);
      expect(INK_SCENES[step].mobileAnchor).toBeLessThanOrEqual(1);
    }
  });
  it('retargets interrupted fades without jumps or changing total ink weight', () => {
    const midway = blendSceneWeights(sceneWeights(1), 2, .5);
    expect(midway).toEqual([.5,.5,0]);
    expect(blendSceneWeights(midway, 3, 0)).toEqual(midway);
    expect(blendSceneWeights(midway, 3, .5).reduce((a,b)=>a+b,0)).toBeCloseTo(1);
    expect(blendSceneWeights(midway, 3, 1)).toEqual([0,0,1]);
    expect(blendSceneWeights(midway, 3, 2)).toEqual([0,0,1]);
  });
});

describe('adaptive ink quality', () => {
  it('keeps stable 60Hz output and ignores one isolated slow window', () => {
    const initial=initialInkQuality();
    expect(adaptInkQuality(initial,16.8).tier).toBe(initial.tier);
    expect(adaptInkQuality(initial,35).tier).toBe(initial.tier);
    expect(adaptInkQuality(adaptInkQuality(initial,35),16.8).slowWindows).toBe(0);
  });
  it('degrades a struggling 60Hz device before reducing frame rate', () => {
    let state=initialInkQuality();
    state=adaptInkQuality(adaptInkQuality(state,33.4),33.4);
    expect(state).toMatchObject({tier:1,fps:60});
    state=adaptInkQuality(adaptInkQuality(state,33.4),33.4);
    expect(state).toMatchObject({tier:0,fps:60});
    state=adaptInkQuality(adaptInkQuality(state,33.4),33.4);
    expect(state).toMatchObject({tier:0,fps:30});
  });
  it('requires five healthy windows to recover one quality level', () => {
    let state={...initialInkQuality(),tier:0};
    for(let i=0;i<4;i++) state=adaptInkQuality(state,16.8);
    expect(state.tier).toBe(0);
    expect(adaptInkQuality(state,16.8).tier).toBe(1);
  });
});

describe('ink motion policy', () => {
  it.each([
    [false,false,true,true], [true,false,true,false], [false,true,false,false], [true,true,false,false]
  ])('coarse=%s, reduced=%s', (coarsePointer,reducedMotion,animate,pointerReactive) => {
    expect(resolveInkMotionPolicy({coarsePointer,reducedMotion})).toEqual({animate,pointerReactive});
  });
});
