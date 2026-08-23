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

  it('keeps the 404 stylesheet colocated with the 404 assets', () => {
    const notFoundPage = readFileSync('public/404.html', 'utf8');
    const headers = readFileSync('public/_headers', 'utf8');

    expect(existsSync('public/404/styles.css')).toBe(true);
    expect(notFoundPage).toContain('href="/404/styles.css"');
    expect(headers).toContain('/*\n  Cache-Control: public, max-age=0, must-revalidate');
    expect(headers).not.toContain('\n/404/styles.css\n');
    expect(headers).not.toContain('\n/styles.css\n');
  });
});
