import { Glass, type GlassOptics } from '@samasante/liquid-glass';
import { type ReactNode, useEffect, useState } from 'react';

export type GlassVariant = 'static' | 'interactive' | 'content';
export type GlassShape = 'capsule' | 'panel';

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

export function supportsInteractiveGlass() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsBackdrop = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    && (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'));
  return !reducedMotion && supportsBackdrop;
}

export function useInteractiveGlass() {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const refresh = () => setSupported(supportsInteractiveGlass());
    refresh();
    reducedMotion.addEventListener('change', refresh);
    return () => reducedMotion.removeEventListener('change', refresh);
  }, []);

  return supported;
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
  const canAnimate = useInteractiveGlass();
  const dynamic = variant === 'interactive' && !disabled && canAnimate;
  const classes = [
    'glass-island',
    `glass-island--${variant}`,
    `glass-island--${shape}`,
    dynamic ? 'is-dynamic' : 'is-static',
    className
  ].filter(Boolean).join(' ');

  if (!dynamic) {
    return (
      <div className={classes} data-glass-mode="static">
        <div className="glass-island__content">{children}</div>
      </div>
    );
  }

  return (
    <Glass
      className={classes}
      data-glass-mode="interactive"
      optics={className.includes('action-island') ? ACTION_GLASS_OPTICS : LIVE_GLASS_OPTICS}
    >
      <div className="glass-island__content">{children}</div>
    </Glass>
  );
}
