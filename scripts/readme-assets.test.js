import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readChunks = buffer => {
  const chunks = [];
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    chunks.push({ type, data: buffer.subarray(dataStart, dataStart + size) });
    offset = dataStart + size + (size % 2);
  }
  return chunks;
};

describe('README visual assets', () => {
  it('keeps the animated hero compact and looping', () => {
    const buffer = readFileSync('public/assets/images/readme-hero.webp');
    const chunks = readChunks(buffer);
    const canvas = chunks.find(chunk => chunk.type === 'VP8X')?.data;
    const animationFrames = chunks.filter(chunk => chunk.type === 'ANMF');

    expect(canvas).toBeDefined();
    expect(canvas?.readUIntLE(4, 3) + 1).toBe(1200);
    expect(canvas?.readUIntLE(7, 3) + 1).toBe(220);
    expect(animationFrames).toHaveLength(90);
    expect(animationFrames.reduce((total, frame) => total + frame.data.readUIntLE(12, 3), 0)).toBe(4500);
    expect(buffer.byteLength).toBeLessThanOrEqual(300 * 1024);
  });

  it('uses responsive chart widths and the project badge palette', () => {
    const readme = readFileSync('README.md', 'utf8');

    expect(readme).toContain('readme-hero.webp" alt="CCC Attendance — 一个签到码，三步搞定" width="100%"');
    expect(readme.match(/api\/stats(?:-total)?\.svg[^>]+width="50%"/g)).toHaveLength(2);
    expect(readme).toContain('width="50%" /><img src="https://ccc.byron.wang/api/stats-total.svg"');
    expect(readme.match(/labelColor=504E49&color=1B365D/g)).toHaveLength(2);
    expect(readme).toContain('img.shields.io/badge/license-MIT-1B365D?style=flat-square&labelColor=504E49');
  });
});
