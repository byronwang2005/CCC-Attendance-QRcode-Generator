import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlassIsland, supportsInteractiveGlass } from './GlassIsland';

vi.mock('liquid-glass-react', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="liquid-glass">{children}</div>
}));

const mockMedia = (reduced: boolean, fine: boolean) => {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : fine,
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
    value: 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36'
  });
  vi.stubGlobal('CSS', { supports: vi.fn(() => true) });
};

describe('GlassIsland', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses the live lens on supported fine-pointer devices', async () => {
    mockMedia(false, true);
    render(<GlassIsland variant="interactive" shape="capsule"><button>继续</button></GlassIsland>);
    expect(await screen.findByTestId('liquid-glass')).toBeInTheDocument();
    expect(screen.getByText('继续').closest('[data-glass-mode]')).toHaveAttribute('data-glass-mode', 'interactive');
  });

  it('falls back to static glass when motion is reduced', () => {
    mockMedia(true, true);
    expect(supportsInteractiveGlass()).toBe(false);
    const { container } = render(<GlassIsland variant="interactive" shape="capsule"><button>继续</button></GlassIsland>);
    expect(container.querySelector('[data-glass-mode="static"]')).toBeInTheDocument();
    expect(screen.queryByTestId('liquid-glass')).not.toBeInTheDocument();
  });

  it('keeps disabled and content islands static', () => {
    mockMedia(false, true);
    const { container } = render(
      <>
        <GlassIsland variant="interactive" shape="capsule" disabled><button>停用</button></GlassIsland>
        <GlassIsland variant="content" shape="panel"><section>正文</section></GlassIsland>
      </>
    );
    expect(container.querySelectorAll('[data-glass-mode="static"]')).toHaveLength(2);
    expect(screen.queryByTestId('liquid-glass')).not.toBeInTheDocument();
  });
});
