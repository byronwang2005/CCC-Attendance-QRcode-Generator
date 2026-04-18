import { APP_PATHS, STEPS } from './config/app-config.js';
import { initIndexPage } from './features/identity-step.js';
import { initQrcodePage } from './features/qrcode-step.js';
import { initTimePage } from './features/time-step.js';
import { mountStepPage } from './layout/page-templates.js';

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

document.addEventListener('DOMContentLoaded', () => {
  const step = getCurrentStep();
  syncCanonicalStepUrl(step);
  mountStepPage(step);
  STEP_INITIALIZERS[step]();
});
