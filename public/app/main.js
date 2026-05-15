import { APP_PATHS, STEPS, TEXT } from './config/app-config.js';
import { mountStepPage } from './layout/page-templates.js';
import { preloadAppAssets } from './shared/preload-assets.js';
import {
  buildTimestamp,
  formatDateTime,
  loadState,
  parseErrorMessage,
  validateCourseUrl
} from './shared/wizard.js';

const STEP_INITIALIZER_LOADERS = Object.freeze({
  [STEPS.index]: async () => {
    const module = await import('./features/identity-step.js');
    return module.initIndexPage;
  },
  [STEPS.time]: async () => {
    const module = await import('./features/time-step.js');
    return module.initTimePage;
  },
  [STEPS.qrcode]: async () => {
    const module = await import('./features/qrcode-step.js');
    return module.initQrcodePage;
  }
});

const MOBILE_BACKGROUND_QUERY = '(max-width: 720px), (pointer: coarse)';
const QR_PRELOAD_PROGRESS_CAP = 72;
const QR_GENERATING_PROGRESS = 84;
const COMPLETION_HOLD_DURATION = 260;

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

const wait = (duration) => new Promise((resolve) => {
  window.setTimeout(resolve, duration);
});

const updateBootLoaderProgress = ({ percent = 0 } = {}) => {
  const progressBar = document.querySelector('[data-boot-progress-bar]');
  const progressText = document.querySelector('[data-boot-progress-text]');
  const normalizedPercent = Math.max(0, Math.min(100, percent));

  if (progressBar) {
    progressBar.style.width = `${normalizedPercent}%`;
    progressBar.parentElement?.setAttribute('aria-valuenow', String(normalizedPercent));
  }

  if (progressText) {
    progressText.textContent = `${normalizedPercent}%`;
  }
};

const mountBootLoader = () => {
  const root = document.getElementById('app');
  if (!root) {
    return;
  }

  if (root.querySelector('.boot-loader')) {
    return;
  }

  root.innerHTML = `
    <section class="boot-loader" aria-label="正在加载">
      <div class="boot-loader__panel">
        <img src="assets/images/ccc-small.webp" alt="CCC" class="boot-loader__logo">
        <p>正在准备</p>
        <div class="boot-loader__progress" role="progressbar" aria-label="加载进度" aria-valuemin="0" aria-valuemax="100">
          <span data-boot-progress-bar></span>
        </div>
        <strong class="boot-loader__percent" data-boot-progress-text>0%</strong>
      </div>
    </section>
  `;
};

const initCursorLayer = async () => {
  if (window.matchMedia(MOBILE_BACKGROUND_QUERY).matches) {
    return;
  }

  try {
    const module = await import('./layout/cursor-layer.js');
    module.initCursorLayer();
  } catch (error) {
    console.warn('Failed to initialize cursor layer:', error);
  }
};

const prepareQrcodeStep = async (onProgress) => {
  const state = loadState();
  const validation = validateCourseUrl(state.url);

  if (!state.url || !validation.valid) {
    onProgress({ percent: 100 });
    return null;
  }

  let timestamp;
  try {
    timestamp = buildTimestamp(state);
  } catch (error) {
    onProgress({ percent: 100 });
    return {
      qrcode: {
        redirectToTime: true,
        message: error instanceof Error ? error.message : TEXT.errors.invalidManualTime
      }
    };
  }

  onProgress({ percent: QR_GENERATING_PROGRESS });

  try {
    const response = await fetch(APP_PATHS.generateApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: validation.normalizedUrl ?? state.url,
        timestamp
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorMessage(errorText));
    }

    const blob = await response.blob();
    onProgress({ percent: 100 });

    return {
      qrcode: {
        imageUrl: URL.createObjectURL(blob),
        receiptMeta: {
          generatedTime: formatDateTime(timestamp)
        }
      }
    };
  } catch (error) {
    onProgress({ percent: 100 });
    return {
      qrcode: {
        message: error instanceof Error && error.message === 'Failed to fetch'
          ? TEXT.errors.networkError
          : (error instanceof Error ? error.message : TEXT.errors.qrCodeGenerationFallback)
      }
    };
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const step = getCurrentStep();
  syncCanonicalStepUrl(step);
  mountBootLoader();
  const isQrcodeStep = step === STEPS.qrcode;
  const loadStepInitializer = STEP_INITIALIZER_LOADERS[step] ?? STEP_INITIALIZER_LOADERS[STEPS.index];
  const stepInitializerPromise = loadStepInitializer();
  const preloadResult = await preloadAppAssets({
    onProgress: (progress) => {
      updateBootLoaderProgress({
        percent: isQrcodeStep ? Math.round(progress.percent * (QR_PRELOAD_PROGRESS_CAP / 100)) : progress.percent
      });
    }
  });
  if (!preloadResult.ok) {
    console.warn('Some assets failed to preload:', preloadResult.failures);
  }
  const stepData = isQrcodeStep
    ? await prepareQrcodeStep(updateBootLoaderProgress)
    : null;
  const initStep = await stepInitializerPromise;
  updateBootLoaderProgress({ percent: 100 });
  await wait(COMPLETION_HOLD_DURATION);
  mountStepPage(step);
  void initCursorLayer();
  initStep(stepData || undefined);
});
