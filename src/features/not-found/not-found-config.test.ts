import { describe, expect, it } from 'vitest';
import { NOT_FOUND_INK_PALETTE } from './not-found-config';

describe('404 ink palette', () => {
  it('uses a muted Pantone-inspired lipstick red without increasing opacity', () => {
    expect(NOT_FOUND_INK_PALETTE).toMatchObject({
      accent: [0.482, 0.208, 0.278],
      accentHex: '#7b3547',
      accentOpacity: 0.095,
      backgroundHex: '#f5f0f1',
      ink: [0.545, 0.396, 0.424],
      inkHex: '#8b656c',
      inkOpacity: 0.15
    });
  });
});
