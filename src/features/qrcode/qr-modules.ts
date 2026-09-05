/** The PNG contract in functions/api/generate.js: size 10, margin 2. */
export function extractQrModules(image: Pick<ImageData, 'width' | 'height' | 'data'>) {
  const { width, height, data } = image;
  const size = width / 10 - 4;
  if (width !== height || !Number.isInteger(size) || size < 21 || size > 177 || (size - 21) % 4 !== 0 || data.length !== width * height * 4) {
    throw new Error('Unsupported QR image dimensions');
  }
  const dark = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    if (data[i + 3] !== 255 || ![0, 255].includes(data[i]) || data[i] !== data[i + 1] || data[i] !== data[i + 2]) {
      throw new Error('Unsupported QR image pixels');
    }
    return data[i] === 0;
  };
  const modules: boolean[][] = [];
  // Validate uniform cells and the white border, not just their center samples.
  for (let row = 0; row < size + 4; row++) {
    const cells: boolean[] = [];
    for (let col = 0; col < size + 4; col++) {
      const value = dark(col * 10, row * 10);
      for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
        if (dark(col * 10 + x, row * 10 + y) !== value) throw new Error('Nonuniform QR module');
      }
      const border = row < 2 || col < 2 || row >= size + 2 || col >= size + 2;
      if (border && value) throw new Error('Invalid QR border');
      if (!border) cells.push(value);
    }
    if (cells.length) modules.push(cells);
  }
  for (const [left, top] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const expected = x === 0 || y === 0 || x === 6 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
      if (modules[top + y][left + x] !== expected) throw new Error('Invalid QR finder');
    }
  }
  return modules;
}

export async function loadQrModules(imageUrl: string, signal: AbortSignal) {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    const abort = () => { cleanup(); image.src = ''; reject(new DOMException('Aborted', 'AbortError')); };
    const cleanup = () => { image.onload = null; image.onerror = null; signal.removeEventListener('abort', abort); };
    image.onload = () => { cleanup(); resolve(); };
    image.onerror = () => { cleanup(); reject(new Error('QR image could not load')); };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) { abort(); cleanup(); return; }
    image.src = imageUrl;
  });
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas unavailable');
  context.drawImage(image, 0, 0);
  return extractQrModules(context.getImageData(0, 0, canvas.width, canvas.height));
}
