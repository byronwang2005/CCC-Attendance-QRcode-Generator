export type InkStep = 1 | 2 | 3;

export type InkPalette = {
  accent: readonly [number, number, number];
  accentHex: string;
  accentOpacity: number;
  ink: readonly [number, number, number];
  inkHex: string;
  inkOpacity: number;
};

export const INK_PALETTES: Record<InkStep, InkPalette> = {
  1: {
    accent: [0.192, 0.361, 0.451],
    accentHex: '#315c73',
    accentOpacity: 0.105,
    ink: [0.353, 0.455, 0.533],
    inkHex: '#5a7488',
    inkOpacity: 0.155
  },
  2: {
    accent: [0.208, 0.404, 0.365],
    accentHex: '#35675d',
    accentOpacity: 0.095,
    ink: [0.353, 0.482, 0.451],
    inkHex: '#5a7b73',
    inkOpacity: 0.15
  },
  3: {
    accent: [0.431, 0.376, 0.259],
    accentHex: '#6e6042',
    accentOpacity: 0.1,
    ink: [0.537, 0.482, 0.376],
    inkHex: '#897b60',
    inkOpacity: 0.155
  }
};

export const INK_RENDER_SCALES = [0.7, 0.8, 0.9] as const;
export const DEFAULT_QUALITY_TIER = 1;
export const QUALITY_SAMPLE_SIZE = 120;
export const INK_AUTONOMOUS_MOTION = {
  timeScale: 0.1,
  warpStrength: 0.92
} as const;

export type InkMacroDrift = {
  xAmplitude: number;
  xPeriodSeconds: number;
  xPhase: number;
  yAmplitude: number;
  yPeriodSeconds: number;
  yPhase: number;
};

export const INK_MACRO_DRIFT = {
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
} as const satisfies Record<'left' | 'upper' | 'right', InkMacroDrift>;
export const INK_MACRO_DRIFT_SPEED = 1.6;

export function chooseQualityTier(
  currentTier: number,
  averageFrameMs: number,
  fastestFrameMs: number
) {
  const safeTier = Math.min(INK_RENDER_SCALES.length - 1, Math.max(0, currentTier));

  // A display whose fastest samples are slower than ~90Hz is refresh-rate bound,
  // not renderer bound. Keep the balanced tier instead of degrading a stable 60Hz UI.
  if (fastestFrameMs > 11.5) return Math.max(DEFAULT_QUALITY_TIER, safeTier);
  if (averageFrameMs > 9.2) return Math.max(0, safeTier - 1);
  if (averageFrameMs < 7.4) return Math.min(INK_RENDER_SCALES.length - 1, safeTier + 1);
  return safeTier;
}

export type InkMotionPolicy = {
  animate: boolean;
  pointerReactive: boolean;
};

export function resolveInkMotionPolicy({
  coarsePointer,
  reducedMotion
}: {
  coarsePointer: boolean;
  reducedMotion: boolean;
}): InkMotionPolicy {
  return {
    animate: !reducedMotion,
    pointerReactive: !coarsePointer && !reducedMotion
  };
}
