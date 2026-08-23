import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACTION_GLASS_OPTICS,
  detectGlassCapabilities,
  GlassIsland,
  LIVE_GLASS_OPTICS
} from './GlassIsland';

vi.mock('@samasante/liquid-glass', () => ({
  Glass: ({ children, optics, ...props }: { children: React.ReactNode; optics: unknown }) => (
    <div data-testid="liquid-glass" data-optics={JSON.stringify(optics)} {...props}>{children}</div>
  )
}));

const CHROME_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36';
const SAFARI_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15';
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36';

const mockEnvironment = ({
  userAgent = CHROME_DESKTOP,
  supportsBackdrop = true,
  reducedMotion = false,
  reducedTransparency = false,
  forcedColors = false,
  mobile
}: {
  userAgent?: string;
  supportsBackdrop?: boolean;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
  forcedColors?: boolean;
  mobile?: boolean;
} = {}) => {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: query.includes('prefers-reduced-motion')
      ? reducedMotion
      : query.includes('prefers-reduced-transparency')
        ? reducedTransparency
        : query.includes('forced-colors') ? forcedColors : false,
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
    value: userAgent
  });
  Object.defineProperty(window.navigator, 'userAgentData', {
    configurable: true,
    value: mobile === undefined ? undefined : {
      brands: [{ brand: 'Chromium' }],
      mobile
    }
  });
  vi.stubGlobal('CSS', { supports: vi.fn(() => supportsBackdrop) });
};

describe('GlassIsland', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses the live lens with calibrated optics on desktop Chromium', async () => {
    mockEnvironment();
    render(<GlassIsland variant="interactive" shape="capsule"><button>继续</button></GlassIsland>);
    expect(await screen.findByTestId('liquid-glass')).toHaveAttribute('data-optics', JSON.stringify(LIVE_GLASS_OPTICS));
    expect(screen.getByText('继续').closest('[data-glass-material]')).toHaveAttribute('data-glass-material', 'refractive');
  });

  it('uses the stronger action preset for action islands', async () => {
    mockEnvironment();
    render(
      <GlassIsland variant="interactive" shape="capsule" className="action-island">
        <button>下一步</button>
      </GlassIsland>
    );
    expect(await screen.findByTestId('liquid-glass')).toHaveAttribute('data-optics', JSON.stringify(ACTION_GLASS_OPTICS));
  });

  it.each([
    ['macOS Safari', SAFARI_DESKTOP],
    ['Android Chrome', CHROME_ANDROID],
    ['iOS Chrome', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/140.0.0.0 Mobile/15E148 Safari/604.1'],
    ['Firefox', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0']
  ])('uses pearl material on %s', (_name, userAgent) => {
    mockEnvironment({ userAgent });
    expect(detectGlassCapabilities()).toEqual({ material: 'pearl', motion: true });
    const { container } = render(<GlassIsland variant="interactive" shape="capsule"><button>继续</button></GlassIsland>);
    expect(container.querySelector('[data-glass-material="pearl"]')).toBeInTheDocument();
    expect(screen.queryByTestId('liquid-glass')).not.toBeInTheDocument();
  });

  it('keeps the refractive material while disabling motion', async () => {
    mockEnvironment({ reducedMotion: true });
    expect(detectGlassCapabilities()).toEqual({ material: 'refractive', motion: false });
    render(<GlassIsland variant="interactive" shape="capsule"><button>继续</button></GlassIsland>);
    expect(await screen.findByTestId('liquid-glass')).toHaveClass('reduces-motion');
  });

  it.each([
    ['missing backdrop filters', { supportsBackdrop: false }],
    ['reduced transparency', { reducedTransparency: true }],
    ['forced colors', { forcedColors: true }]
  ])('uses solid material for %s', (_name, environment) => {
    mockEnvironment(environment);
    expect(detectGlassCapabilities().material).toBe('solid');
    const { container } = render(<GlassIsland variant="interactive" shape="capsule"><button>继续</button></GlassIsland>);
    expect(container.querySelector('[data-glass-material="solid"]')).toBeInTheDocument();
  });

  it('keeps disabled and content islands on the pearl surface in desktop Chromium', () => {
    mockEnvironment();
    const { container } = render(
      <>
        <GlassIsland variant="interactive" shape="capsule" disabled><button>停用</button></GlassIsland>
        <GlassIsland variant="content" shape="panel"><section>正文</section></GlassIsland>
      </>
    );
    expect(container.querySelectorAll('[data-glass-material="pearl"]')).toHaveLength(2);
    expect(screen.queryByTestId('liquid-glass')).not.toBeInTheDocument();
  });
});
