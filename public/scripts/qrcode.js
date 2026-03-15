import {
  buildTimestamp,
  clearState,
  downloadFile,
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

document.addEventListener('DOMContentLoaded', () => {
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
  const generatedTimeWrap = document.getElementById('generatedTimeWrap');
  const generatedTime = document.getElementById('generatedTime');
  const qrcodeContainer = document.getElementById('qrcode');
  const generateBtn = document.getElementById('generateBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const backBtn = document.getElementById('backBtn');
  const restartBtn = document.getElementById('restartBtn');
  initStepNavigation(3);

  let currentImageUrl = '';

  summaryIdentity.textContent = getIdentityLabel(state.identity);
  summaryMode.textContent = getTimeModeLabel(state);
  summaryUrl.textContent = state.url;

  const renderPlaceholder = (message = TEXT.placeholders.qrCode) => {
    qrcodeContainer.innerHTML = `
      <div class="qrcode-placeholder">
        <div>${message}</div>
        <small>${TEXT.placeholders.qrCodeAutoDownloadHint}</small>
      </div>
    `;
  };

  const renderLoading = () => {
    qrcodeContainer.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <div>${TEXT.placeholders.qrCodeLoading}</div>
      </div>
    `;
  };

  const renderImage = (src) => {
    const image = new Image();
    image.src = src;
    image.alt = QR_CODE.alt;
    image.className = 'qrcode-image';
    qrcodeContainer.innerHTML = '';
    qrcodeContainer.appendChild(image);
  };

  const generateQRCode = async () => {
    let timestamp;
    const previousImageUrl = currentImageUrl;
    const previousGeneratedTime = generatedTime.textContent;

    try {
      timestamp = buildTimestamp(state);
    } catch (error) {
      redirectTo(APP_PATHS.time, error instanceof Error ? error.message : TEXT.errors.invalidManualTime);
      return;
    }

    renderLoading();
    generateBtn.disabled = true;
    generateBtn.textContent = TEXT.status.generating;

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
      renderImage(currentImageUrl);

      generatedTime.textContent = formatDateTime(timestamp);
      generatedTimeWrap.hidden = false;
      downloadBtn.hidden = false;

      if (previousImageUrl) {
        URL.revokeObjectURL(previousImageUrl);
      }

      downloadFile(currentImageUrl, QR_CODE.filename);
      showToast(TEXT.status.qrCodeGenerated);
    } catch (error) {
      const message = error instanceof Error && error.message === 'Failed to fetch'
        ? TEXT.errors.networkError
        : (error instanceof Error ? error.message : TEXT.errors.qrCodeGenerationFallback);
      if (previousImageUrl) {
        currentImageUrl = previousImageUrl;
        renderImage(previousImageUrl);
        generatedTime.textContent = previousGeneratedTime;
        generatedTimeWrap.hidden = false;
        downloadBtn.hidden = false;
      } else {
        renderPlaceholder(TEXT.errors.qrCodeGenerationFailed);
        generatedTime.textContent = '';
        generatedTimeWrap.hidden = true;
        downloadBtn.hidden = true;
      }
      showToast(`二维码生成失败：${message}`, 'error');
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = currentImageUrl ? TEXT.status.regenerate : TEXT.status.generate;
    }
  };

  downloadBtn.addEventListener('click', () => {
    if (!currentImageUrl) {
      showToast(TEXT.errors.noQrCodeToDownload, 'error');
      return;
    }

    downloadFile(currentImageUrl, QR_CODE.filename);
  });

  backBtn.addEventListener('click', () => {
    window.location.href = APP_PATHS.time;
  });

  restartBtn.addEventListener('click', () => {
    clearState();
    window.location.href = APP_PATHS.index;
  });

  generateBtn.addEventListener('click', () => {
    generateQRCode();
  });

  window.addEventListener('beforeunload', () => {
    if (currentImageUrl) {
      URL.revokeObjectURL(currentImageUrl);
    }
  });

  renderPlaceholder();
  generateQRCode();
});
