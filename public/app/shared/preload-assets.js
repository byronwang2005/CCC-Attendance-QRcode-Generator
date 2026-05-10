const ASSET_LOADERS = Object.freeze([
  {
    type: 'font',
    url: '/assets/fonts/JetBrainsMono.woff2',
    bytes: 55672,
    family: 'JetBrains Mono',
    descriptors: {
      style: 'normal',
      weight: '400'
    },
    fallback: '400 1em "JetBrains Mono"'
  },
  {
    type: 'font',
    url: '/assets/fonts/TsangerJinKai02-subset.woff2',
    bytes: 91716,
    family: 'TsangerJinKai02',
    descriptors: {
      style: 'normal',
      weight: '400'
    },
    fallback: '400 1em "TsangerJinKai02"'
  },
  {
    type: 'image',
    url: 'assets/images/ccc-small.webp',
    bytes: 502822
  }
]);

const MINIMUM_LOADER_DURATION = 520;

const wait = (duration) => new Promise((resolve) => {
  window.setTimeout(resolve, duration);
});

const reportProgress = (onProgress, progress) => {
  if (typeof onProgress !== 'function') {
    return;
  }

  onProgress(progress);
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = async () => {
    try {
      await image.decode();
    } catch {
      // Decoding can fail on already-loaded images in some browsers; the asset is still available.
    }
    resolve();
  };
  image.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
  image.src = src;
});

const loadFont = async (font) => {
  if (!document.fonts) {
    return;
  }

  await document.fonts.load(font);
};

const parseContentLength = (response) => {
  const value = Number.parseInt(response.headers.get('content-length') ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const fetchAssetBytes = async (asset, onChunk) => {
  if (!window.ReadableStream) {
    const response = await fetch(asset.url);
    if (!response.ok) {
      throw new Error(`Failed to preload asset: ${asset.url}`);
    }

    const buffer = await response.arrayBuffer();
    onChunk(buffer.byteLength, buffer.byteLength);
    return buffer;
  }

  const response = await fetch(asset.url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to preload asset: ${asset.url}`);
  }

  const responseBytes = parseContentLength(response);
  const expectedBytes = responseBytes ?? asset.bytes;
  const reader = response.body.getReader();
  const chunks = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    chunks.push(value);
    receivedBytes += value.byteLength;
    onChunk(value.byteLength, expectedBytes);
  }

  const bytes = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes.buffer;
};

const decodeImageBuffer = async (asset, buffer) => {
  const blob = new Blob([buffer]);
  const objectUrl = URL.createObjectURL(blob);

  try {
    await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const loadFontBuffer = async (asset, buffer) => {
  if (!document.fonts || typeof FontFace !== 'function') {
    await loadFont(asset.fallback);
    return;
  }

  const fontFace = new FontFace(asset.family, buffer, asset.descriptors);
  const loadedFont = await fontFace.load();
  document.fonts.add(loadedFont);
};

const settleAsset = async (asset, buffer) => {
  if (asset.type === 'image') {
    await decodeImageBuffer(asset, buffer);
    return;
  }

  if (asset.type === 'font') {
    await loadFontBuffer(asset, buffer);
  }
};

export const preloadAppAssets = async ({ onProgress } = {}) => {
  const startedAt = window.performance.now();
  const total = ASSET_LOADERS.length;
  const fallbackTotalBytes = ASSET_LOADERS.reduce((sum, asset) => sum + asset.bytes, 0);
  const loadedBytesByAsset = new Map();
  const expectedBytesByAsset = new Map(ASSET_LOADERS.map((asset) => [asset.url, asset.bytes]));
  let completed = 0;
  let displayedPercent = 0;
  const failures = [];

  const getLoadedBytes = () => [...loadedBytesByAsset.values()].reduce((sum, bytes) => sum + bytes, 0);
  const getExpectedBytes = () => [...expectedBytesByAsset.values()].reduce((sum, bytes) => sum + bytes, 0) || fallbackTotalBytes;
  const emitProgress = () => {
    const loadedBytes = getLoadedBytes();
    const totalBytes = getExpectedBytes();
    const rawPercent = totalBytes > 0 ? (loadedBytes / totalBytes) * 100 : 100;
    displayedPercent = Math.max(displayedPercent, Math.min(100, Math.round(rawPercent)));
    reportProgress(onProgress, {
      completed,
      total,
      loadedBytes,
      totalBytes,
      percent: displayedPercent
    });
  };

  emitProgress();

  await Promise.all(ASSET_LOADERS.map(async (asset) => {
    try {
      let receivedBytes = 0;
      const buffer = await fetchAssetBytes(asset, (chunkBytes, expectedBytes) => {
        receivedBytes += chunkBytes;
        expectedBytesByAsset.set(asset.url, Math.max(expectedBytes, receivedBytes));
        loadedBytesByAsset.set(asset.url, receivedBytes);
        emitProgress();
      });

      expectedBytesByAsset.set(asset.url, Math.max(expectedBytesByAsset.get(asset.url) ?? asset.bytes, buffer.byteLength));
      loadedBytesByAsset.set(asset.url, buffer.byteLength);
      await settleAsset(asset, buffer);
    } catch (error) {
      failures.push(error);
      loadedBytesByAsset.set(asset.url, expectedBytesByAsset.get(asset.url) ?? asset.bytes);
    } finally {
      completed += 1;
      emitProgress();
    }
  }));

  const elapsed = window.performance.now() - startedAt;
  if (elapsed < MINIMUM_LOADER_DURATION) {
    await wait(MINIMUM_LOADER_DURATION - elapsed);
  }

  displayedPercent = 100;
  reportProgress(onProgress, {
    completed,
    total,
    loadedBytes: getExpectedBytes(),
    totalBytes: getExpectedBytes(),
    percent: displayedPercent
  });

  return {
    ok: failures.length === 0,
    failures
  };
};
