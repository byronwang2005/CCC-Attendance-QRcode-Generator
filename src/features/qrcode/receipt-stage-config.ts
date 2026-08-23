export interface ReceiptStageTheme {
  accentColor: string;
  ambientColor: string;
}

export interface ReceiptCameraFit {
  distance: number;
  lookAtY: number;
  pixelRatio: number;
}

export const RECEIPT_WIDTH = 1.18;
export const RECEIPT_HEIGHT = 1.68;
export const RECEIPT_TEXTURE_WIDTH = 1024;
export const RECEIPT_TEXTURE_HEIGHT = 1456;
export const RECEIPT_VERTICAL_FOV = 34;

const degreesToRadians = (degrees: number) => degrees * Math.PI / 180;

export function fitReceiptCamera(width: number, height: number, devicePixelRatio = 1): ReceiptCameraFit {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const aspect = safeWidth / safeHeight;
  const verticalTangent = Math.tan(degreesToRadians(RECEIPT_VERTICAL_FOV) / 2);
  const horizontalTangent = verticalTangent * aspect;
  const widthFill = aspect < 0.9 ? 0.84 : aspect > 1.35 ? 0.7 : 0.76;
  const heightFill = aspect < 0.9 ? 0.86 : 0.8;
  const widthDistance = RECEIPT_WIDTH / (2 * horizontalTangent * widthFill);
  const heightDistance = RECEIPT_HEIGHT / (2 * verticalTangent * heightFill);

  return {
    distance: Math.max(widthDistance, heightDistance),
    lookAtY: aspect < 0.82 ? 0.08 : 0.04,
    pixelRatio: Math.min(Math.max(1, devicePixelRatio || 1), safeWidth >= 900 ? 1.5 : 1.35)
  };
}
