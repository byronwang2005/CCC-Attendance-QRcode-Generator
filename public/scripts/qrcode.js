import {
  buildTimestamp,
  clearState,
  formatDateTime,
  getIdentityLabel,
  getTimeModeLabel,
  initStepNavigation,
  loadState,
  parseErrorMessage,
  readPageMessage,
  redirectTo,
  showToast,
  validateCourseUrl
} from './wizard.js';
import { APP_PATHS, QR_CODE, TEXT } from './config.js';
import { createReceiptStage } from './receipt-stage.js';

document.addEventListener('DOMContentLoaded', () => {
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

    summaryIdentity.textContent = getIdentityLabel(state.identity);
    summaryMode.textContent = getTimeModeLabel(state);
    summaryUrl.textContent = state.url;

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

    const renderLoading = () => {
      destroyReceiptStage();
      qrcodeContainer.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
        </div>
      `;
    };

    const renderImage = async (src, receiptMeta) => {
      destroyReceiptStage();

      try {
        receiptStage = await createReceiptStage(qrcodeContainer, {
          imageUrl: src,
          generatedTime: receiptMeta?.generatedTime ?? '',
          identityLabel: summaryIdentity.textContent,
          modeLabel: summaryMode.textContent,
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

    const generateQRCode = async () => {
      let timestamp;
      const previousImageUrl = currentImageUrl;
      const previousReceiptMeta = currentReceiptMeta ? { ...currentReceiptMeta } : null;

      try {
        timestamp = buildTimestamp(state);
      } catch (error) {
        redirectTo(APP_PATHS.time, error instanceof Error ? error.message : TEXT.errors.invalidManualTime);
        return;
      }

      renderLoading();

      try {
        const response = await fetch(APP_PATHS.generateApi, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: state.url,
            timestamp
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(parseErrorMessage(errorText));
        }

        const blob = await response.blob();
        const nextImageUrl = URL.createObjectURL(blob);
        currentImageUrl = nextImageUrl;
        currentReceiptMeta = {
          generatedTime: formatDateTime(timestamp)
        };
        await renderImage(currentImageUrl, currentReceiptMeta);

        if (previousImageUrl) {
          URL.revokeObjectURL(previousImageUrl);
        }

        showToast(TEXT.status.qrCodeGenerated);
      } catch (error) {
        const message = error instanceof Error && error.message === 'Failed to fetch'
          ? TEXT.errors.networkError
          : (error instanceof Error ? error.message : TEXT.errors.qrCodeGenerationFallback);
        if (previousImageUrl) {
          currentImageUrl = previousImageUrl;
          currentReceiptMeta = previousReceiptMeta;
          await renderImage(previousImageUrl, previousReceiptMeta);
        } else {
          currentReceiptMeta = null;
          renderPlaceholder(TEXT.errors.qrCodeGenerationFailed);
        }
        showToast(`二维码生成失败：${message}`, 'error');
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

    renderLoading();
    void generateQRCode();
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
});
