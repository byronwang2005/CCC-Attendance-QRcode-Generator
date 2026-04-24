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

export const preloadAppAssets = async () => {
  const startedAt = window.performance.now();

  await Promise.all([
    ...IMAGE_ASSETS.map(loadImage),
    ...FILE_ASSETS.map(loadFile),
    loadFonts()
  ]);

  const elapsed = window.performance.now() - startedAt;
  if (elapsed < MINIMUM_LOADER_DURATION) {
    await wait(MINIMUM_LOADER_DURATION - elapsed);
  }
};
