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
  Glass: ({ children }: { children: React.ReactNode }) => <div data-testid="live-segment-lens">{children}</div>,
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

const mockMotion = (reduced: boolean) => {
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

  it('renders one shared live lens and animates it between segments', async () => {
    mockMotion(false);
    const { rerender } = render(
      <SegmentedGlassControl selectedIndex={0} count={2} ariaLabel="身份选择">
        <button>人类</button>
        <button>智能体</button>
      </SegmentedGlassControl>
    );

    expect(await screen.findByTestId('live-segment-lens')).toBeInTheDocument();
    expect(screen.getAllByTestId('live-segment-lens')).toHaveLength(1);
    rerender(
      <SegmentedGlassControl selectedIndex={1} count={2} ariaLabel="身份选择">
        <button>人类</button>
        <button>智能体</button>
      </SegmentedGlassControl>
    );
    expect(animateGlassValue).toHaveBeenCalledWith(expect.anything(), 0, expect.objectContaining({ duration: 0.32 }));
  });

  it('uses a static selection surface when motion is reduced', () => {
    mockMotion(true);
    const { container } = render(
      <SegmentedGlassControl selectedIndex={0} count={2}>
        <button>自动</button>
        <button>手动</button>
      </SegmentedGlassControl>
    );
    expect(container.querySelector('.segmented-glass__lens--static')).toBeInTheDocument();
    expect(screen.queryByTestId('live-segment-lens')).not.toBeInTheDocument();
  });

  it('does not render a selected lens before a choice is made', () => {
    mockMotion(false);
    const { container } = render(
      <SegmentedGlassControl selectedIndex={-1} count={2}>
        <button>人类</button>
        <button>智能体</button>
      </SegmentedGlassControl>
    );
    expect(container.querySelector('.segmented-glass__lens-track')).not.toBeInTheDocument();
  });
});
