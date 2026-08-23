import {
  Glass,
  GlassDiv,
  animateGlassValue,
  glassEase,
  glassValue,
  type GlassAnimation
} from '@samasante/liquid-glass';
import {
  type CSSProperties,
  type AriaRole,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { LIVE_GLASS_OPTICS, useGlassCapabilities } from './GlassIsland';

interface SegmentMetrics {
  width: number;
  height: number;
  stride: number;
  inset: number;
}

export function SegmentedGlassControl({
  selectedIndex,
  count,
  className = '',
  role,
  ariaLabel,
  children
}: {
  selectedIndex: number;
  count: number;
  className?: string;
  role?: AriaRole;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<GlassAnimation | null>(null);
  const selectedIndexRef = useRef(selectedIndex);
  const position = useMemo(() => glassValue(0), []);
  const [metrics, setMetrics] = useState<SegmentMetrics | null>(null);
  const capabilities = useGlassCapabilities();
  const canAnimate = capabilities.motion;
  const canRefract = capabilities.material === 'refractive';
  const lensMaterial = canRefract ? 'refractive' : capabilities.material;

  selectedIndexRef.current = selectedIndex;

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => {
      const styles = window.getComputedStyle(rail);
      const inset = Number.parseFloat(styles.paddingLeft) || 0;
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
      const innerWidth = rail.clientWidth - inset * 2;
      const width = Math.max(0, (innerWidth - gap * (count - 1)) / count);
      const height = Math.max(0, rail.clientHeight - inset * 2);
      const stride = width + gap;
      setMetrics((current) => (
        current
        && Math.abs(current.width - width) < 0.5
        && Math.abs(current.height - height) < 0.5
        && Math.abs(current.stride - stride) < 0.5
          ? current
          : { width, height, stride, inset }
      ));
      position.set(Math.max(0, selectedIndexRef.current) * stride);
    };

    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure, { passive: true });
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [count, position]);

  useEffect(() => {
    if (!metrics || selectedIndex < 0) return;
    animationRef.current?.stop();
    if (!canAnimate) {
      position.set(selectedIndex * metrics.stride);
      return;
    }
    animationRef.current = animateGlassValue(position, selectedIndex * metrics.stride, {
      duration: 0.32,
      ease: glassEase
    });
    return () => animationRef.current?.stop();
  }, [canAnimate, metrics, position, selectedIndex]);

  return (
    <div
      ref={railRef}
      className={`segmented-glass is-${lensMaterial} ${canAnimate ? 'allows-motion' : 'reduces-motion'} ${className}`.trim()}
      data-glass-material={lensMaterial}
      role={role}
      aria-label={ariaLabel}
      style={{ '--segment-count': count } as CSSProperties}
    >
      {metrics && selectedIndex >= 0 && (
        <GlassDiv
          aria-hidden="true"
          className="segmented-glass__lens-track"
          x={position}
          style={{
            left: metrics.inset,
            top: metrics.inset,
            width: metrics.width,
            height: metrics.height
          }}
        >
          {canRefract ? (
            <Glass className="segmented-glass__lens" optics={LIVE_GLASS_OPTICS}>
              <span className="segmented-glass__lens-fill" />
            </Glass>
          ) : (
            <span className={`segmented-glass__lens segmented-glass__lens--${lensMaterial}`}>
              <span className="segmented-glass__lens-fill" />
            </span>
          )}
        </GlassDiv>
      )}
      <div className="segmented-glass__options">{children}</div>
    </div>
  );
}
