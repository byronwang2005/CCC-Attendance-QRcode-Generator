const IMAGE_ASSETS = Object.freeze([
  'assets/images/ccc-small.webp'
]);

const FONT_ASSETS = Object.freeze([
  '400 1em "TsangerJinKai02"',
  '500 1em "TsangerJinKai02"',
  '400 1em "JetBrains Mono"'
]);

const INITIAL_PROGRESS = 0;
const IDLE_PROGRESS_CAP = 78;
const IDLE_PROGRESS_DURATION = 1600;
const PROGRESS_TICK_INTERVAL = 80;
const MINIMUM_LOADER_DURATION = 520;

const wait = (duration) => new Promise((resolve) => {
  window.setTimeout(resolve, duration);
});

const reportProgress = (onProgress, completed, total, percent) => {
  if (typeof onProgress !== 'function') {
    return;
  }

  onProgress({
    completed,
    total,
    percent
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

export const preloadAppAssets = async ({ onProgress } = {}) => {
  const startedAt = window.performance.now();
  const tasks = [
    ...IMAGE_ASSETS.map((src) => () => loadImage(src)),
    ...FONT_ASSETS.map((font) => () => loadFont(font))
  ];
  const total = tasks.length;
  let completed = 0;
  let displayedPercent = 0;
  const failures = [];
  const emitProgress = (nextPercent) => {
    displayedPercent = Math.max(displayedPercent, Math.round(nextPercent));
    reportProgress(onProgress, completed, total, displayedPercent);
  };
  const progressTimer = window.setInterval(() => {
    if (completed >= total) {
      return;
    }

    const elapsed = window.performance.now() - startedAt;
    const progress = Math.min(elapsed / IDLE_PROGRESS_DURATION, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    emitProgress(INITIAL_PROGRESS + (IDLE_PROGRESS_CAP - INITIAL_PROGRESS) * eased);
  }, PROGRESS_TICK_INTERVAL);

  emitProgress(total > 0 ? INITIAL_PROGRESS : 100);

  await Promise.all(tasks.map(async (task) => {
    try {
      await task();
    } catch (error) {
      failures.push(error);
    } finally {
      completed += 1;
      emitProgress(total > 0 ? INITIAL_PROGRESS + ((completed / total) * (100 - INITIAL_PROGRESS)) : 100);
    }
  }));

  window.clearInterval(progressTimer);

  const elapsed = window.performance.now() - startedAt;
  if (elapsed < MINIMUM_LOADER_DURATION) {
    await wait(MINIMUM_LOADER_DURATION - elapsed);
  }

  emitProgress(100);

  return {
    ok: failures.length === 0,
    failures
  };
};
