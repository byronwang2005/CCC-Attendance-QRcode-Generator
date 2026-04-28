import {
  clearState,
  getIdentityLabel,
  getTimeModeLabel,
  initStepNavigation,
  loadState,
  readPageMessage,
  redirectTo,
  showToast,
  validateCourseUrl
} from '../shared/wizard.js';
import { APP_PATHS, QR_CODE, TEXT } from '../config/app-config.js';
import { createReceiptStage } from './qrcode/receipt-stage.js';

export const initQrcodePage = ({ qrcode } = {}) => {
  let receiptStage = null;
  let currentImageUrl = '';

  try {
    readPageMessage();

    const state = loadState();
    if (!state.url) {
      redirectTo(APP_PATHS.index, TEXT.redirects.finishPreviousSteps);
      return;
    }
    const urlValidation = validateCourseUrl(state.url);
    if (!urlValidation.valid) {
      redirectTo(APP_PATHS.index, urlValidation.message);
      return;
    }

    const summaryIdentity = document.getElementById('summaryIdentity');
    const summaryMode = document.getElementById('summaryMode');
    const summaryUrl = document.getElementById('summaryUrl');
    const qrcodeContainer = document.getElementById('qrcode');
    const backBtn = document.getElementById('backBtn');
    const restartBtn = document.getElementById('restartBtn');
    initStepNavigation(3);

    let currentReceiptMeta = null;

    if (summaryIdentity) {
      summaryIdentity.textContent = getIdentityLabel(state.identity);
    }
    if (summaryMode) {
      summaryMode.textContent = getTimeModeLabel(state);
    }
    if (summaryUrl) {
      summaryUrl.textContent = state.url;
    }

    const destroyReceiptStage = () => {
      if (!receiptStage) {
        return;
      }

      receiptStage.destroy();
      receiptStage = null;
    };

    const renderPlaceholder = (message = TEXT.placeholders.qrCode) => {
      destroyReceiptStage();
      qrcodeContainer.innerHTML = `
        <div class="qrcode-placeholder">
          <div>${message}</div>
        </div>
      `;
    };

    const renderImage = async (src, receiptMeta) => {
      destroyReceiptStage();

      try {
        receiptStage = await createReceiptStage(qrcodeContainer, {
          imageUrl: src,
          generatedTime: receiptMeta?.generatedTime ?? '',
          identityLabel: summaryIdentity?.textContent || getIdentityLabel(state.identity),
          modeLabel: summaryMode?.textContent || getTimeModeLabel(state),
          scheduleId: urlValidation.scheduleId ?? ''
        });
      } catch (error) {
        console.error('Failed to initialize receipt stage:', error);
        const image = new Image();
        image.src = src;
        image.alt = QR_CODE.alt;
        image.className = 'qrcode-image qrcode-image-fallback';
        qrcodeContainer.innerHTML = '';
        qrcodeContainer.appendChild(image);
      }
    };

    backBtn.addEventListener('click', () => {
      window.location.href = APP_PATHS.time;
    });

    restartBtn.addEventListener('click', () => {
      clearState();
      window.location.href = APP_PATHS.index;
    });

    window.addEventListener('beforeunload', () => {
      destroyReceiptStage();
      if (currentImageUrl) {
        URL.revokeObjectURL(currentImageUrl);
      }
    });

    if (qrcode?.redirectToTime) {
      redirectTo(APP_PATHS.time, qrcode.message || TEXT.errors.invalidManualTime);
      return;
    }

    if (qrcode?.imageUrl) {
      currentImageUrl = qrcode.imageUrl;
      currentReceiptMeta = qrcode.receiptMeta || null;
      void renderImage(currentImageUrl, currentReceiptMeta).then(() => {
        showToast(TEXT.status.qrCodeGenerated);
      });
      return;
    }

    renderPlaceholder(TEXT.errors.qrCodeGenerationFailed);
    if (qrcode?.message) {
      showToast(`二维码生成失败：${qrcode.message}`, 'error');
    }
  } catch (error) {
    console.error('Failed to initialize QR code page:', error);
    const qrcodeContainer = document.getElementById('qrcode');
    if (qrcodeContainer) {
      qrcodeContainer.innerHTML = `
        <div class="qrcode-placeholder">
          <div>${TEXT.errors.qrCodeGenerationFallback}</div>
        </div>
      `;
    }
  }
};
