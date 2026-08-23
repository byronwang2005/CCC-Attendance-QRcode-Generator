import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SegmentedGlassControl } from './SegmentedGlassControl';

const { stop, animateGlassValue } = vi.hoisted(() => {
  const stopMock = vi.fn();
  return {
    stop: stopMock,
    animateGlassValue: vi.fn(() => ({ stop: stopMock }))
  };
});

vi.mock('@samasante/liquid-glass', () => ({
  Glass: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid={className?.includes('rail-surface') ? 'live-control-rail' : 'live-segment-lens'} className={className}>
      {children}
    </div>
  ),
  GlassDiv: ({ children, x: _x, ...props }: { children: React.ReactNode; x: unknown }) => <div {...props}>{children}</div>,
  glassValue: (initial: number) => {
    let value = initial;
    return {
      get: () => value,
      set: (next: number) => { value = next; },
      on: () => () => undefined
    };
  },
  animateGlassValue,
  glassEase: (value: number) => value
}));

const mockEnvironment = ({ reduced = false, safari = false }: { reduced?: boolean; safari?: boolean } = {}) => {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: safari
      ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15'
      : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36'
  });
  Object.defineProperty(window.navigator, 'userAgentData', {
    configurable: true,
    value: undefined
  });
  vi.stubGlobal('CSS', { supports: vi.fn(() => true) });
};

describe('SegmentedGlassControl', () => {
  afterEach(() => {
    cleanup();
    animateGlassValue.mockClear();
    stop.mockClear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders a native glass rail and one shared live lens, then animates between segments', async () => {
    mockEnvironment();
    const { rerender } = render(
      <SegmentedGlassControl selectedIndex={0} count={2} ariaLabel="身份选择">
        <button>人类</button>
        <button>智能体</button>
      </SegmentedGlassControl>
    );

    expect(await screen.findByTestId('live-segment-lens')).toBeInTheDocument();
    expect(screen.getAllByTestId('live-segment-lens')).toHaveLength(1);
    expect(document.querySelector('[data-glass-engine="native"].segmented-glass__rail-surface')).toBeInTheDocument();
    rerender(
      <SegmentedGlassControl selectedIndex={1} count={2} ariaLabel="身份选择">
        <button>人类</button>
        <button>智能体</button>
      </SegmentedGlassControl>
    );
    expect(animateGlassValue).toHaveBeenCalledWith(expect.anything(), 0, expect.objectContaining({ duration: 0.32 }));
  });

  it('uses a pearl selection surface on Safari while preserving motion', async () => {
    mockEnvironment({ safari: true });
    const { container, rerender } = render(
      <SegmentedGlassControl selectedIndex={0} count={2}>
        <button>自动</button>
        <button>手动</button>
      </SegmentedGlassControl>
    );
    expect(container.querySelector('.segmented-glass__lens--pearl')).toBeInTheDocument();
    expect(container.querySelector('.segmented-glass__rail-surface.is-pearl')).toBeInTheDocument();
    rerender(
      <SegmentedGlassControl selectedIndex={1} count={2}>
        <button>自动</button>
        <button>手动</button>
      </SegmentedGlassControl>
    );
    expect(animateGlassValue).toHaveBeenCalled();
  });

  it('moves the pearl selection immediately when motion is reduced', () => {
    mockEnvironment({ reduced: true, safari: true });
    const { container } = render(
      <SegmentedGlassControl selectedIndex={0} count={2}>
        <button>自动</button>
        <button>手动</button>
      </SegmentedGlassControl>
    );
    expect(container.querySelector('.segmented-glass__lens--pearl')).toBeInTheDocument();
    expect(container.querySelector('.segmented-glass')).toHaveClass('reduces-motion');
    expect(animateGlassValue).not.toHaveBeenCalled();
    expect(screen.queryByTestId('live-segment-lens')).not.toBeInTheDocument();
    expect(screen.queryByTestId('live-control-rail')).not.toBeInTheDocument();
  });

  it('does not render a selected lens before a choice is made', () => {
    mockEnvironment();
    const { container } = render(
      <SegmentedGlassControl selectedIndex={-1} count={2}>
        <button>人类</button>
        <button>智能体</button>
      </SegmentedGlassControl>
    );
    expect(container.querySelector('.segmented-glass__lens-track')).not.toBeInTheDocument();
  });
});
