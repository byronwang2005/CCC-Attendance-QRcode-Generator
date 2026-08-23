import { Glass, type GlassOptics } from '@samasante/liquid-glass';
import { type ReactNode, useEffect, useState } from 'react';

export type GlassVariant = 'static' | 'interactive' | 'content';
export type GlassShape = 'capsule' | 'panel';
export type GlassMaterial = 'refractive' | 'pearl' | 'solid';

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
  strength: 0.055,
  depth: 0.55,
  curvature: 0.34,
  bend: 0.48,
  dispersion: 0.24,
  specular: 1
};

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
  className = '',
  children
}: {
  variant: GlassVariant;
  shape: GlassShape;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const capabilities = useGlassCapabilities();
  const refractive = variant === 'interactive' && !disabled && capabilities.material === 'refractive';
  const material: GlassMaterial = refractive
    ? 'refractive'
    : capabilities.material === 'solid' ? 'solid' : 'pearl';
  const classes = [
    'glass-island',
    `glass-island--${variant}`,
    `glass-island--${shape}`,
    `is-${material}`,
    capabilities.motion ? 'allows-motion' : 'reduces-motion',
    className
  ].filter(Boolean).join(' ');

  if (!refractive) {
    return (
      <div className={classes} data-glass-material={material}>
        <div className="glass-island__content">{children}</div>
      </div>
    );
  }

  return (
    <Glass
      className={classes}
      data-glass-material="refractive"
      optics={className.includes('action-island') ? ACTION_GLASS_OPTICS : LIVE_GLASS_OPTICS}
    >
      <div className="glass-island__content">{children}</div>
    </Glass>
  );
}
