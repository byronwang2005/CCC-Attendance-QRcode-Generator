import { describe, expect, it } from 'vitest';
import { renderQrCumulativeStatsSvg, renderQrStatsSvg } from './qr-stats.js';

describe('QR statistics SVG design', () => {
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
});
