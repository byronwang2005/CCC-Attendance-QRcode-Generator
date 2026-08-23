import { Glass, type GlassOptics } from '@samasante/liquid-glass';
import { type ReactNode, useEffect, useState } from 'react';

export type GlassVariant = 'static' | 'interactive' | 'content';
export type GlassShape = 'capsule' | 'panel';
export type GlassMaterial = 'refractive' | 'pearl' | 'solid';
export type GlassOpticsPreset = 'surface' | 'action' | 'micro' | 'close' | 'controlRail' | 'selectionLens';

export interface GlassCapabilities {
  material: GlassMaterial;
  motion: boolean;
}

export const LIVE_GLASS_OPTICS: Partial<GlassOptics> = {
  strength: 0.05,
  depth: 0.5,
  curvature: 0.3,
  bend: 0.45,
  bendWidth: 0.16,
  dispersion: 0.22,
  frost: 5,
  saturate: 1.08,
  sheen: 0.3,
  sheenWidth: 2.5,
  glow: 0.08,
  specular: 0.9,
  mapSize: 256,
  brightness: 0
};

export const ACTION_GLASS_OPTICS: Partial<GlassOptics> = {
  ...LIVE_GLASS_OPTICS,
  strength: 0.11,
  depth: 0.72,
  curvature: 0.58,
  bend: 0.72,
  bendWidth: 0.22,
  dispersion: 0.36,
  frost: 1.5,
  saturate: 1.12,
  sheen: 0.42,
  sheenWidth: 2,
  glow: 0.12,
  specular: 1.05,
  mapSize: 384
};

export const MICRO_GLASS_OPTICS: Partial<GlassOptics> = {
  ...ACTION_GLASS_OPTICS,
  strength: 0.09,
  depth: 0.75,
  curvature: 0.58,
  bendWidth: 0.24,
  dispersion: 0.3,
  frost: 1.25
};

export const CLOSE_GLASS_OPTICS: Partial<GlassOptics> = {
  ...MICRO_GLASS_OPTICS,
  strength: 0.008,
  depth: 0.3,
  curvature: 0.32,
  bend: 0.14,
  bendWidth: 0.08,
  dispersion: 0.04,
  frost: 2,
  sheen: 0.3,
  glow: 0.08,
  specular: 0.9
};

export const CONTROL_RAIL_GLASS_OPTICS: Partial<GlassOptics> = {
  ...LIVE_GLASS_OPTICS,
  strength: 0.018,
  depth: 0.38,
  curvature: 0.3,
  bend: 0.28,
  bendWidth: 0.12,
  dispersion: 0.14,
  frost: 4,
  saturate: 1.08,
  sheen: 0.24,
  glow: 0.06,
  specular: 0.84,
  mapSize: 384
};

export const SELECTION_LENS_GLASS_OPTICS: Partial<GlassOptics> = {
  ...ACTION_GLASS_OPTICS,
  strength: 0.095,
  depth: 0.72,
  curvature: 0.6,
  bend: 0.68,
  dispersion: 0.32,
  frost: 1.25
};

const GLASS_OPTICS_PRESETS: Record<GlassOpticsPreset, Partial<GlassOptics>> = {
  surface: LIVE_GLASS_OPTICS,
  action: ACTION_GLASS_OPTICS,
  micro: MICRO_GLASS_OPTICS,
  close: CLOSE_GLASS_OPTICS,
  controlRail: CONTROL_RAIL_GLASS_OPTICS,
  selectionLens: SELECTION_LENS_GLASS_OPTICS
};

function resolveGlassOptics(preset: GlassOpticsPreset, optics?: Partial<GlassOptics>) {
  return optics ?? GLASS_OPTICS_PRESETS[preset];
}

export function GlassSurfaceLayer({
  material,
  opticsPreset = 'surface',
  optics,
  className = ''
}: {
  material: GlassMaterial;
  opticsPreset?: GlassOpticsPreset;
  optics?: Partial<GlassOptics>;
  className?: string;
}) {
  const classes = `glass-surface-layer is-${material} ${className}`.trim();
  const usesLiquidLens = opticsPreset === 'action'
    || opticsPreset === 'micro'
    || opticsPreset === 'close'
    || opticsPreset === 'selectionLens';

  if (material === 'refractive' && usesLiquidLens) {
    // filterResolution must remain unset. The library treats any explicit value
    // as DOM/in-place mode and refracts children instead of the backdrop.
    return (
      <Glass
        aria-hidden="true"
        className={classes}
        data-glass-surface="refractive"
        optics={resolveGlassOptics(opticsPreset, optics)}
      >
        <span className="glass-surface-layer__fill" />
      </Glass>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={classes}
      data-glass-engine={material === 'refractive' ? 'native' : undefined}
      data-glass-surface={material}
    >
      <span className="glass-surface-layer__fill" />
    </span>
  );
}

export function LayeredGlassIsland({
  shape,
  className = '',
  opticsPreset = 'surface',
  optics,
  children
}: {
  shape: GlassShape;
  className?: string;
  opticsPreset?: GlassOpticsPreset;
  optics?: Partial<GlassOptics>;
  children: ReactNode;
}) {
  const capabilities = useGlassCapabilities();
  const classes = [
    'layered-glass-island',
    `glass-island--${shape}`,
    `is-${capabilities.material}`,
    capabilities.motion ? 'allows-motion' : 'reduces-motion',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} data-glass-material={capabilities.material}>
      <GlassSurfaceLayer
        material={capabilities.material}
        opticsPreset={opticsPreset}
        optics={optics}
        className="layered-glass-island__surface"
      />
      <div className="layered-glass-island__content">{children}</div>
    </div>
  );
}

type NavigatorWithUAData = Navigator & {
  userAgentData?: {
    brands?: Array<{ brand: string }>;
    mobile?: boolean;
  };
};

function isDesktopChromium(navigatorValue: NavigatorWithUAData) {
  const ua = navigatorValue.userAgent;
  const brands = navigatorValue.userAgentData?.brands ?? [];
  const chromiumBrand = brands.some(({ brand }) => /Chromium|Google Chrome|Microsoft Edge/i.test(brand));
  const chromiumUA = /\b(?:Chrome|Chromium|Edg)\//.test(ua)
    && !/\b(?:CriOS|EdgiOS|FxiOS|OPiOS)\b/.test(ua);
  const mobile = navigatorValue.userAgentData?.mobile
    ?? /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return (chromiumBrand || chromiumUA) && !mobile;
}

export function detectGlassCapabilities(): GlassCapabilities {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { material: 'solid', motion: false };
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reducedTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
  const forcedColors = window.matchMedia('(forced-colors: active)').matches;
  const supportsBackdrop = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    && (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'));

  if (!supportsBackdrop || reducedTransparency || forcedColors) {
    return { material: 'solid', motion: !reducedMotion };
  }

  return {
    material: isDesktopChromium(window.navigator as NavigatorWithUAData) ? 'refractive' : 'pearl',
    motion: !reducedMotion
  };
}

export function useGlassCapabilities() {
  const [capabilities, setCapabilities] = useState<GlassCapabilities>(detectGlassCapabilities);

  useEffect(() => {
    const queries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-reduced-transparency: reduce)'),
      window.matchMedia('(forced-colors: active)')
    ];
    const refresh = () => setCapabilities(detectGlassCapabilities());
    refresh();
    queries.forEach((query) => query.addEventListener('change', refresh));
    return () => queries.forEach((query) => query.removeEventListener('change', refresh));
  }, []);

  return capabilities;
}

export function GlassIsland({
  variant,
  shape,
  disabled = false,
  opticsPreset = 'surface',
  className = '',
  children
}: {
  variant: GlassVariant;
  shape: GlassShape;
  disabled?: boolean;
  opticsPreset?: GlassOpticsPreset;
  className?: string;
  children: ReactNode;
}) {
  const capabilities = useGlassCapabilities();
  const directRefractive = variant === 'interactive' && capabilities.material === 'refractive';
  const material = capabilities.material;
  const classes = [
    'glass-island',
    `glass-island--${variant}`,
    `glass-island--${shape}`,
    `is-${material}`,
    disabled ? 'is-disabled' : '',
    capabilities.motion ? 'allows-motion' : 'reduces-motion',
    className
  ].filter(Boolean).join(' ');

  if (!directRefractive) {
    return (
      <div className={classes} data-glass-material={material}>
        <GlassSurfaceLayer
          material={material}
          opticsPreset={opticsPreset}
          className="glass-island__surface"
        />
        <div className="glass-island__content">{children}</div>
      </div>
    );
  }

  return (
    <Glass
      className={classes}
      data-glass-material="refractive"
      optics={resolveGlassOptics(opticsPreset)}
    >
      <div className="glass-island__content">{children}</div>
    </Glass>
  );
}
