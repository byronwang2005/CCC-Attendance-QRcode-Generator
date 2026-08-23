import { describe, expect, it } from 'vitest';
import {
  fitReceiptCamera,
  RECEIPT_HEIGHT,
  RECEIPT_VERTICAL_FOV
} from './receipt-stage-config';

const projectedReceiptHeight = (distance: number, viewportHeight: number) => {
  const verticalTangent = Math.tan((RECEIPT_VERTICAL_FOV * Math.PI / 180) / 2);
  return RECEIPT_HEIGHT / (2 * distance * verticalTangent) * viewportHeight;
};

describe('receipt stage configuration', () => {
  it.each([
    ['1280×720 viewport', 526, 500],
    ['980×800 viewport', 700, 510],
    ['390×844 viewport', 350, 430]
  ])('keeps the receipt prominent without clipping in the %s stage', (_viewport, width, height) => {
    const fit = fitReceiptCamera(width, height, 2);
    const projectedHeight = projectedReceiptHeight(fit.distance, height);

    expect(projectedHeight).toBeGreaterThanOrEqual(height * 0.7);
    expect(projectedHeight).toBeLessThanOrEqual(height * 0.87 + 1);
    expect(fit.pixelRatio).toBeLessThanOrEqual(1.5);
  });
});
