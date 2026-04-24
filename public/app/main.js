import { APP_PATHS, STEPS } from './config/app-config.js';
import { initIndexPage } from './features/identity-step.js';
import { initQrcodePage } from './features/qrcode-step.js';
import { initTimePage } from './features/time-step.js';
import { initBackgroundTextLayer } from './layout/background-text-layer.js';
import { mountStepPage } from './layout/page-templates.js';
import { preloadAppAssets } from './shared/preload-assets.js';

const STEP_INITIALIZERS = Object.freeze({
  [STEPS.index]: initIndexPage,
  [STEPS.time]: initTimePage,
  [STEPS.qrcode]: initQrcodePage
});

const normalizeStep = (value) => {
  const step = Number.parseInt(String(value ?? ''), 10);
  if (step === STEPS.time || step === STEPS.qrcode) {
    return step;
  }
  return STEPS.index;
};

const getCurrentStep = () => {
  const url = new URL(window.location.href);
  return normalizeStep(url.searchParams.get('step'));
};

const syncCanonicalStepUrl = (step) => {
  const target = APP_PATHS.step(step);
  if (window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/')) {
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== target) {
      window.history.replaceState({}, '', target);
    }
  }
};

const mountBootLoader = () => {
  const root = document.getElementById('app');
  if (!root) {
    return;
  }

  root.innerHTML = `
    <section class="boot-loader" aria-label="正在加载">
      <div class="boot-loader__panel">
        <img src="assets/images/ccc-small.webp" alt="CCC" class="boot-loader__logo">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>准备中，马上就好</p>
      </div>
    </section>
  `;
};

document.addEventListener('DOMContentLoaded', async () => {
  const step = getCurrentStep();
  syncCanonicalStepUrl(step);
  mountBootLoader();
  await preloadAppAssets();
  mountStepPage(step);
  initBackgroundTextLayer();
  STEP_INITIALIZERS[step]();
});
