const IMAGE_ASSETS = Object.freeze([
  'assets/images/ccc-small.webp',
  'assets/images/ccc.webp'
]);

const FILE_ASSETS = Object.freeze([
  'assets/icons/favicon.svg',
  'assets/fonts/kami/SourceHanSansCN-Bold.otf',
  'assets/fonts/kami/SourceHanSansCN-Medium.otf',
  'assets/fonts/kami/SourceHanSansCN-Regular.otf',
  'assets/fonts/kami/TsangerJinKai02-W04.ttf',
  'assets/fonts/kami/TsangerJinKai02-W05.ttf',
  'assets/fonts/kami/JetBrainsMono.woff2'
]);

const FONT_ASSETS = Object.freeze([
  '400 1em "TsangerJinKai02"',
  '500 1em "TsangerJinKai02"',
  '400 1em "Source Han Sans CN"',
  '500 1em "Source Han Sans CN"',
  '400 1em "JetBrains Mono"'
]);

const MINIMUM_LOADER_DURATION = 420;

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

const loadFile = async (src) => {
  const response = await fetch(src, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Failed to preload asset: ${src}`);
  }
  await response.blob();
};

const loadFonts = async () => {
  if (!document.fonts) {
    return;
  }

  await Promise.all(FONT_ASSETS.map((font) => document.fonts.load(font)));
  await document.fonts.ready;
};

export const preloadAppAssets = async ({ onProgress } = {}) => {
  const startedAt = window.performance.now();
  const tasks = [
    ...IMAGE_ASSETS.map((src) => () => loadImage(src)),
    ...FILE_ASSETS.map((src) => () => loadFile(src)),
    loadFonts
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
