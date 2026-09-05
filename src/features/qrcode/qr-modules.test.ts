import { describe, expect, it } from 'vitest';
import qr from 'qr-image';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { extractQrModules } from './qr-modules';

const makeImage = (value: string) => {
  const buffer = qr.imageSync(value, { type: 'png', margin: 2, size: 10 });
  if (typeof buffer === 'string') throw new Error('Expected PNG buffer');
  const png = PNG.sync.read(buffer);
  return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
};

describe('QR PNG module contract', () => {
  it.each(['https://example.com/', 'https://ccc.nottingham.edu.cn/attendance?courseId=1234&timestamp=1788597000000', 'x'.repeat(500)])('preserves encoded content: %s', value => {
    const image = makeImage(value);
    const modules = extractQrModules(image);
    const scale = 6, width = (modules.length + 8) * scale;
    const pixels = new Uint8ClampedArray(width * width * 4);
    // Independently decode the final dark brown / warm white palette and quiet zone.
    for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
      const dark = modules[Math.floor(y / scale) - 4]?.[Math.floor(x / scale) - 4];
      pixels.set(dark ? [56, 39, 25, 255] : [246, 241, 231, 255], (y * width + x) * 4);
    }
    expect(jsQR(image.data, image.width, image.height)?.data).toBe(value);
    expect(jsQR(pixels, width, width)?.data).toBe(value);
  });
  it('rejects malformed dimensions, borders, nonuniform pixels and invalid finders', () => {
    const image = makeImage('test');
    expect(() => extractQrModules({ ...image, height: 1 })).toThrow();
    for (const [x, y] of [[0, 0], [25, 25]]) {
      const corrupt = { ...image, data: image.data.slice() };
      const offset = (y * image.width + x) * 4;
      const opposite = corrupt.data[offset] ? 0 : 255;
      corrupt.data.set([opposite, opposite, opposite, 255], offset);
      expect(() => extractQrModules(corrupt)).toThrow();
    }
    const blank = { ...image, data: new Uint8ClampedArray(image.data.length).fill(255) };
    expect(() => extractQrModules(blank)).toThrow('finder');
  });
});
