import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { inkAsset, INK_PALETTES, INK_SCENES, INK_STEPS, resolveInkMotionPolicy,
  type InkPalette, type InkStep } from './ink-flow-config';
import { InkFlowRenderer } from './ink-renderer';

export function InkFlowBackground({ step, palette: paletteOverride }: { step: InkStep; palette?: InkPalette }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<InkFlowRenderer | null>(null);
  const [ready, setReady] = useState(false);
  const [visited, setVisited] = useState<InkStep[]>([step]);
  const palette = paletteOverride ?? INK_PALETTES[step];
  const latest = useRef({ step, palette });
  latest.current = { step, palette };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = matchMedia('(hover: none), (pointer: coarse)');
    let disposed = false;
    const start = () => {
      rendererRef.current?.destroy(); rendererRef.current = null;
      setReady(false);
      try {
        const motion = resolveInkMotionPolicy({ coarsePointer: coarse.matches, reducedMotion: reduced.matches });
        rendererRef.current = new InkFlowRenderer(canvas, latest.current.step, latest.current.palette,
          motion, value => { if (!disposed) setReady(value); });
      } catch (error) {
        if (import.meta.env.DEV) console.warn('Ink background uses static artwork', error);
      }
    };
    const pointer = (event: PointerEvent) => rendererRef.current?.setPointer(event.clientX, event.clientY);
    const resetPointer = () => rendererRef.current?.resetPointer();
    const visibility = () => { if (document.hidden) rendererRef.current?.pause(); else rendererRef.current?.resume(); };
    const lost = (event: Event) => { event.preventDefault(); rendererRef.current?.pause(); setReady(false); };
    start();
    window.addEventListener('pointermove', pointer, { passive: true });
    window.addEventListener('blur', resetPointer);
    document.documentElement.addEventListener('pointerleave', resetPointer);
    document.addEventListener('visibilitychange', visibility);
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', start);
    reduced.addEventListener('change', start); coarse.addEventListener('change', start);
    return () => {
      disposed = true;
      window.removeEventListener('pointermove', pointer); window.removeEventListener('blur', resetPointer);
      document.documentElement.removeEventListener('pointerleave', resetPointer);
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', start);
      reduced.removeEventListener('change', start); coarse.removeEventListener('change', start);
      rendererRef.current?.destroy(); rendererRef.current = null;
    };
  }, []);

  useEffect(() => { rendererRef.current?.setScene(step, palette); }, [step, palette]);
  useEffect(() => { setVisited(previous => previous.includes(step) ? previous : [...previous, step]); }, [step]);

  return (
    <div className="cursor-layer ink-flow-layer" aria-hidden="true" data-ready={ready} data-scene={INK_SCENES[step].id}>
      <div className="ink-flow-layer__fallback">
        {INK_STEPS.filter(s => visited.includes(s) || s === step).map(s => (
          <div key={s} className="ink-flow-layer__still" style={{
            '--ink-mask': `url("${inkAsset(s, 'static')}")`,
            '--ink-anchor': `${INK_SCENES[s].mobileAnchor * 100}%`,
            backgroundColor: s === step ? palette.inkHex : INK_PALETTES[s].inkHex,
            opacity: s === step ? palette.inkOpacity : 0
          } as CSSProperties} />
        ))}
      </div>
      <canvas ref={canvasRef} className="cursor-layer__canvas ink-flow-layer__canvas" />
    </div>
  );
}
