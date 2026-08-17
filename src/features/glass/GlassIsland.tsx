import LiquidGlass from 'liquid-glass-react';
import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';

export type GlassVariant = 'static' | 'interactive' | 'content';
export type GlassShape = 'capsule' | 'panel';

const GlassStageContext = createContext<RefObject<HTMLElement | null> | null>(null);

export function GlassStageProvider({
  stageRef,
  children
}: {
  stageRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return <GlassStageContext.Provider value={stageRef}>{children}</GlassStageContext.Provider>;
}

export function supportsInteractiveGlass() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const chromium = /(?:Chrome|Chromium|Edg)\//.test(window.navigator.userAgent);
  const supportsBackdrop = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    && (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'));
  return !reducedMotion && finePointer && chromium && supportsBackdrop;
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
  const mouseContainer = useContext(GlassStageContext);
  const [canAnimate, setCanAnimate] = useState(false);
  const islandRef = useRef<HTMLDivElement>(null);
  const [cornerRadius, setCornerRadius] = useState(shape === 'capsule' ? 999 : 32);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(pointer: fine)');
    const refresh = () => setCanAnimate(supportsInteractiveGlass());
    refresh();
    reducedMotion.addEventListener('change', refresh);
    finePointer.addEventListener('change', refresh);
    return () => {
      reducedMotion.removeEventListener('change', refresh);
      finePointer.removeEventListener('change', refresh);
    };
  }, []);

  useEffect(() => {
    if (shape === 'capsule') return;
    const refreshRadius = () => {
      const island = islandRef.current;
      if (!island) return;
      const resolvedRadius = Number.parseFloat(window.getComputedStyle(island).borderTopLeftRadius);
      if (Number.isFinite(resolvedRadius)) setCornerRadius(resolvedRadius);
    };
    refreshRadius();
    window.addEventListener('resize', refreshRadius, { passive: true });
    return () => window.removeEventListener('resize', refreshRadius);
  }, [shape]);

  const dynamic = variant === 'interactive' && !disabled && canAnimate;
  const primaryOptics = variant === 'interactive';
  const displacementScale = primaryOptics
    ? (shape === 'capsule' ? 24 : 18)
    : variant === 'content' ? 10 : shape === 'capsule' ? 14 : 12;
  const classes = [
    'glass-island',
    `glass-island--${variant}`,
    `glass-island--${shape}`,
    dynamic ? 'is-dynamic' : 'is-static',
    className
  ].filter(Boolean).join(' ');

  if (!dynamic) {
    return (
      <div ref={islandRef} className={classes} data-glass-mode="static">
        <div className="glass-island__content">{children}</div>
      </div>
    );
  }

  return (
    <div ref={islandRef} className={classes} data-glass-mode="interactive">
      <LiquidGlass
        className="glass-island__lens"
        mouseContainer={mouseContainer}
        displacementScale={displacementScale}
        blurAmount={primaryOptics ? 0.055 : 0.04}
        saturation={112}
        aberrationIntensity={primaryOptics ? 0.45 : 0.18}
        elasticity={primaryOptics ? 0.035 : 0.02}
        cornerRadius={cornerRadius}
        padding="0"
        overLight
        mode="standard"
      >
        <span className="glass-island__optics" aria-hidden="true" />
      </LiquidGlass>
      <div className="glass-island__content">{children}</div>
    </div>
  );
}
