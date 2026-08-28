import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotFoundPage } from './NotFoundPage';

vi.mock('@samasante/liquid-glass', () => ({
  Glass: ({ children, optics, ...props }: { children: React.ReactNode; optics: unknown }) => (
    <div data-testid="liquid-glass" data-optics={JSON.stringify(optics)} {...props}>{children}</div>
  )
}));

const CHROME_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36';
const SAFARI_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15';

function mockEnvironment(userAgent: string) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: false,
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
    value: undefined
  });
  vi.stubGlobal('CSS', { supports: vi.fn(() => true) });
}

describe('NotFoundPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders only the error message and navigation action', () => {
    mockEnvironment(CHROME_DESKTOP);
    render(<NotFoundPage />);

    expect(screen.getByRole('heading', { name: '这个页面没有找到' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '/');
    expect(screen.queryByText('CCC Attendance')).not.toBeInTheDocument();
    expect(screen.queryByText('04 / OFF COURSE')).not.toBeInTheDocument();
    expect(screen.queryByText(/MIT License/)).not.toBeInTheDocument();
  });

  it('uses a native backdrop panel and a true refractive action on desktop Chromium', async () => {
    mockEnvironment(CHROME_DESKTOP);
    render(<NotFoundPage />);

    const glassSurfaces = await screen.findAllByTestId('liquid-glass');
    expect(glassSurfaces).toHaveLength(1);
    const action = screen.getByRole('link', { name: '返回首页' }).closest<HTMLElement>('[data-glass-material]');
    const panel = screen.getByRole('heading', { name: '这个页面没有找到' }).closest<HTMLElement>('[data-glass-material]');
    const panelSurface = panel?.querySelector<HTMLElement>('[data-glass-surface="refractive"]');
    expect(action).toHaveAttribute('data-glass-material', 'refractive');
    expect(panel).toHaveAttribute('data-glass-material', 'refractive');
    expect(panel).toHaveClass('static-glass-island', 'glass-island--content');
    expect(panelSurface).toBeInTheDocument();
    expect(panelSurface).toHaveAttribute('data-glass-engine', 'native');
    expect(panelSurface).not.toContainElement(action);
    expect(action?.parentElement?.closest('[data-glass-surface]')).toBeNull();
  });

  it('keeps the pearl fallback on Safari', () => {
    mockEnvironment(SAFARI_DESKTOP);
    const { container } = render(<NotFoundPage />);

    expect(container.querySelectorAll('[data-glass-material="pearl"]')).toHaveLength(2);
    expect(screen.queryByTestId('liquid-glass')).not.toBeInTheDocument();
  });
});
