const IMAGE_ASSETS = Object.freeze([
  'assets/images/ccc-small.webp'
]);

const FONT_ASSETS = Object.freeze([
  '400 1em "TsangerJinKai02"',
  '500 1em "TsangerJinKai02"',
  '400 1em "JetBrains Mono"'
]);

const MODULE_ASSETS = Object.freeze([
  'https://cdn.jsdelivr.net/npm/@chenglou/pretext@0.0.5/dist/layout.js'
]);

const MINIMUM_LOADER_DURATION = 180;
const MOBILE_BACKGROUND_QUERY = '(max-width: 720px), (pointer: coarse)';

const shouldPreloadTextLayout = () => !window.matchMedia(MOBILE_BACKGROUND_QUERY).matches;

const wait = (duration) => new Promise((resolve) => {
  window.setTimeout(resolve, duration);
});

const reportProgress = (onProgress, completed, total) => {
  if (typeof onProgress !== 'function') {
    return;
  }

  onProgress({
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 100
  });
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

const loadModule = async (src) => {
  await import(src);
};

export const preloadAppAssets = async ({ onProgress } = {}) => {
  const startedAt = window.performance.now();
  const moduleAssets = shouldPreloadTextLayout() ? MODULE_ASSETS : [];
  const tasks = [
    ...IMAGE_ASSETS.map((src) => () => loadImage(src)),
    ...FONT_ASSETS.map((font) => () => loadFont(font)),
    ...moduleAssets.map((src) => () => loadModule(src))
  ];
  const total = tasks.length;
  let completed = 0;
  const failures = [];

  reportProgress(onProgress, completed, total);

  await Promise.all(tasks.map(async (task) => {
    try {
      await task();
    } catch (error) {
      failures.push(error);
    } finally {
      completed += 1;
      reportProgress(onProgress, completed, total);
    }
  }));

  const elapsed = window.performance.now() - startedAt;
  if (elapsed < MINIMUM_LOADER_DURATION) {
    await wait(MINIMUM_LOADER_DURATION - elapsed);
  }

  reportProgress(onProgress, total, total);

  return {
    ok: failures.length === 0,
    failures
  };
};
