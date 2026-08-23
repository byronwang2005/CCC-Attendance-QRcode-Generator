import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderQrCumulativeStatsSvg, renderQrStatsSvg } from './qr-stats.js';

describe('QR statistics SVG design', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the hourly chart with embedded project fonts and no logo', () => {
    const svg = renderQrStatsSvg({ configured: true, rows: [], hours: 24 });

    expect(svg).toContain("font-family: 'TsangerJinKai02'");
    expect(svg).toContain('data:font/woff2;base64,');
    expect(svg).toContain('url(#hourlyPaper)');
    expect(svg).toContain('width="600" height="168"');
    expect(svg).not.toMatch(/<line(?:\s|>)/);
    expect(svg.match(/<circle/g)).toHaveLength(1);
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('xlink');
  });

  it('renders the cumulative chart with the same paper design', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00.000Z'));

    const svg = renderQrCumulativeStatsSvg({
      configured: true,
      rows: [{ day: '2026-08-19', count: 3 }]
    });

    expect(svg).toContain("font-family: 'TsangerJinKai02'");
    expect(svg).toContain('data:font/woff2;base64,');
    expect(svg).toContain('url(#totalPaper)');
    expect(svg).toContain('width="600" height="168"');
    expect(svg).not.toMatch(/<line(?:\s|>)/);
    expect(svg.match(/<circle/g)).toHaveLength(1);
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('xlink');
  });

  it('renders endpoint markers for a multi-day cumulative chart', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-23T12:00:00.000Z'));

    const svg = renderQrCumulativeStatsSvg({
      configured: true,
      rows: [{ day: '2026-08-19', count: 3 }]
    });

    expect(svg.match(/<circle/g)).toHaveLength(2);
    expect(svg).toContain('<title>08-19：3 次</title>');
    expect(svg).toContain('<title>08-23：3 次</title>');
  });
});
