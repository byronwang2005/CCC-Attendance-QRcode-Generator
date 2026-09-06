export type InkStep = 1 | 2 | 3;
export type InkPalette = {
  accent: readonly [number, number, number];
  accentHex: string;
  accentOpacity: number;
  backgroundHex: string;
  ink: readonly [number, number, number];
  inkHex: string;
  inkOpacity: number;
};

export const INK_PALETTES: Record<InkStep, InkPalette> = {
  1: { accent: [0.192, 0.361, 0.451], accentHex: '#315c73', accentOpacity: 0,
    backgroundHex: '#f0f3f4', ink: [0.192, 0.361, 0.451], inkHex: '#315c73', inkOpacity: 0.43 },
  2: { accent: [0.208, 0.404, 0.365], accentHex: '#35675d', accentOpacity: 0,
    backgroundHex: '#f1f4f1', ink: [0.208, 0.404, 0.365], inkHex: '#35675d', inkOpacity: 0.40 },
  3: { accent: [0.431, 0.376, 0.259], accentHex: '#6e6042', accentOpacity: 0,
    backgroundHex: '#f4f2ec', ink: [0.431, 0.376, 0.259], inkHex: '#6e6042', inkOpacity: 0.42 }
};

export const INK_SCENES = {
  1: { id: 'rongxi', title: '容膝斋图', artist: '倪瓒', mobileAnchor: 0.12, period: 32 },
  2: { id: 'qingyuan', title: '溪山清远', artist: '夏珪', mobileAnchor: 0.88, period: 36 },
  3: { id: 'fuchun', title: '富春山居图', artist: '黄公望', mobileAnchor: 0.36, period: 40 }
} as const;
export const INK_STEPS: readonly InkStep[] = [1, 2, 3];
export const INK_TRANSITION_MS = 800;
export const INK_RENDER_SCALES = [0.55, 0.7, 0.85] as const;
export const DEFAULT_QUALITY_TIER = 2;
export const QUALITY_SAMPLE_SIZE = 120;
export const inkAsset = (step: InkStep, kind: 'packed' | 'static') =>
  `/assets/ink/${INK_SCENES[step].id}-${kind}.webp`;

export type SceneWeights = [number, number, number];
export const sceneWeights = (step: InkStep): SceneWeights =>
  [step === 1 ? 1 : 0, step === 2 ? 1 : 0, step === 3 ? 1 : 0];

export function blendSceneWeights(from: SceneWeights, step: InkStep, progress: number): SceneWeights {
  const t = Math.min(1, Math.max(0, progress));
  const eased = t * t * (3 - 2 * t);
  const target = sceneWeights(step);
  return from.map((value, i) => value + (target[i] - value) * eased) as SceneWeights;
}

export type InkQuality = { tier: number; fps: 30 | 60; slowWindows: number; fastWindows: number };
export const initialInkQuality = (): InkQuality =>
  ({ tier: DEFAULT_QUALITY_TIER, fps: 60, slowWindows: 0, fastWindows: 0 });

// 2 slow windows to degrade; 5 healthy windows to recover. Do not mistake a
// stable 60 Hz display for a slow GPU, but do include genuinely missed frames.
export function adaptInkQuality(state: InkQuality, p95FrameMs: number): InkQuality {
  const slow = p95FrameMs > (state.fps === 60 ? 23 : 43);
  const fast = p95FrameMs < (state.fps === 60 ? 19 : 36);
  const next = { ...state, slowWindows: slow ? state.slowWindows + 1 : 0,
    fastWindows: fast ? state.fastWindows + 1 : 0 };
  if (next.slowWindows >= 2) {
    if (next.tier > 0) next.tier--;
    else next.fps = 30;
    next.slowWindows = next.fastWindows = 0;
  } else if (next.fastWindows >= 5) {
    if (next.fps === 30) next.fps = 60;
    else next.tier = Math.min(INK_RENDER_SCALES.length - 1, next.tier + 1);
    next.slowWindows = next.fastWindows = 0;
  }
  return next;
}

export type InkMotionPolicy = { animate: boolean; pointerReactive: boolean };
export function resolveInkMotionPolicy({ coarsePointer, reducedMotion }: {
  coarsePointer: boolean; reducedMotion: boolean;
}): InkMotionPolicy {
  return { animate: !reducedMotion, pointerReactive: !coarsePointer && !reducedMotion };
}
