export type InkStep = 1 | 2 | 3;

export type InkPalette = {
  accent: readonly [number, number, number];
  accentHex: string;
  accentOpacity: number;
  ink: readonly [number, number, number];
  inkOpacity: number;
};

export const INK_PALETTES: Record<InkStep, InkPalette> = {
  1: {
    accent: [0.09, 0.25, 0.53],
    accentHex: '#174087',
    accentOpacity: 0.105,
    ink: [0.22, 0.22, 0.2],
    inkOpacity: 0.155
  },
  2: {
    accent: [0.66, 0.45, 0.08],
    accentHex: '#a87314',
    accentOpacity: 0.095,
    ink: [0.23, 0.22, 0.19],
    inkOpacity: 0.15
  },
  3: {
    accent: [0.57, 0.16, 0.11],
    accentHex: '#92291c',
    accentOpacity: 0.1,
    ink: [0.23, 0.21, 0.19],
    inkOpacity: 0.155
  }
};

export const INK_RENDER_SCALES = [0.7, 0.8, 0.9] as const;
export const DEFAULT_QUALITY_TIER = 1;
export const QUALITY_SAMPLE_SIZE = 120;

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

export function shouldRenderStaticInk({
  coarsePointer,
  reducedMotion
}: {
  coarsePointer: boolean;
  reducedMotion: boolean;
  step: InkStep;
}) {
  return coarsePointer || reducedMotion;
}
