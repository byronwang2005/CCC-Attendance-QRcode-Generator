import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SOURCE_FONT_DIR = 'assets-src/fonts';
const PUBLIC_FONT_DIR = 'public/assets/fonts';

describe('asset directory boundaries', () => {
  it('keeps source fonts outside the public directory', () => {
    expect(existsSync(`${SOURCE_FONT_DIR}/TsangerJinKai02-W04.ttf`)).toBe(true);
    expect(existsSync(`${SOURCE_FONT_DIR}/TsangerJinKai02-W05.ttf`)).toBe(true);
    expect(readdirSync(PUBLIC_FONT_DIR).filter(file => file.endsWith('.ttf'))).toEqual([]);
  });

  it('builds the 404 page as an isolated application entry', () => {
    const notFoundPage = readFileSync('404.html', 'utf8');
    const headers = readFileSync('public/_headers', 'utf8');

    expect(existsSync('src/404.css')).toBe(true);
    expect(existsSync('src/404.tsx')).toBe(true);
    expect(existsSync('public/404.html')).toBe(false);
    expect(notFoundPage).toContain('id="not-found-root"');
    expect(notFoundPage).toContain('src="/src/404.tsx"');
    expect(notFoundPage).toContain('href="#main-content"');
    expect(headers).toContain('/*\n  Cache-Control: public, max-age=0, must-revalidate');
  });
});
