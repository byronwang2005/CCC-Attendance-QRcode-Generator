import {
  buildTimestamp,
  collectManualTime,
  fillManualTimeInputs,
  getIdentityLabel,
  initStepNavigation,
  loadState,
  readPageMessage,
  redirectTo,
  saveState,
  showToast,
  validateCourseUrl
} from '../shared/wizard.js';
import { APP_PATHS, MANUAL_TIME_FIELDS, TEXT, TIME_LIMITS, TIME_MODES } from '../config/app-config.js';

const parseInteger = (value) => {
  if (value === '' || value === null || value === undefined) {
    return Number.NaN;
  }
  return Number.parseInt(String(value), 10);
};

const pad = (value) => String(value).padStart(2, '0');

const formatDateValue = (date) => [
  date.getFullYear(),
  pad(date.getMonth() + 1),
  pad(date.getDate())
].join('-');

const populateSelect = (element, start, end, padToTwoDigits = false) => {
  if (!element) {
    return;
  }

  element.innerHTML = '';
  for (let value = start; value <= end; value += 1) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = padToTwoDigits ? String(value).padStart(2, '0') : String(value);
    element.appendChild(option);
  }
};

const populateDateOptions = (dateElement, windowStart, windowEnd) => {
  if (!dateElement) {
    return;
  }

  const previousDate = dateElement.value;
  const endDateValue = formatDateValue(windowEnd);
  const options = [];
  const cursor = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate());

  while (formatDateValue(cursor) <= endDateValue) {
    const value = formatDateValue(cursor);
    let label = value;
    if (value === formatDateValue(windowStart)) {
      label = `${value} 今天`;
    } else {
      const tomorrow = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate() + 1);
      if (value === formatDateValue(tomorrow)) {
        label = `${value} 明天`;
      }
    }
    options.push({ value, label });
    cursor.setDate(cursor.getDate() + 1);
  }

  dateElement.innerHTML = '';
  options.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    dateElement.appendChild(option);
  });

  dateElement.value = options.some((item) => item.value === previousDate)
    ? previousDate
    : options[0]?.value ?? '';
};

const getDateBounds = (dateValue, windowStart, windowEnd) => {
  const dayStart = new Date(`${dateValue}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  return {
    min: new Date(Math.max(dayStart.getTime(), windowStart.getTime())),
    max: new Date(Math.min(dayEnd.getTime(), windowEnd.getTime()))
  };
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createSelectableWindow = () => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + TIME_LIMITS.manualWindowMs);
  const windowStart = new Date(now);

  if (windowStart.getSeconds() > 0 || windowStart.getMilliseconds() > 0) {
    windowStart.setMinutes(windowStart.getMinutes() + 1, 0, 0);
  }
  windowEnd.setSeconds(0, 0);

  return { windowStart, windowEnd };
};

const syncTimeOptions = (dateElement, hourElement, minuteElement, windowStart, windowEnd) => {
  if (!dateElement || !hourElement || !minuteElement || !dateElement.value) {
    return;
  }

  const previousHour = parseInteger(hourElement.value);
  const previousMinute = parseInteger(minuteElement.value);
  const { min, max } = getDateBounds(dateElement.value, windowStart, windowEnd);
  const minHour = min.getHours();
  const maxHour = max.getHours();
  const nextHour = clamp(Number.isNaN(previousHour) ? minHour : previousHour, minHour, maxHour);

  populateSelect(hourElement, minHour, maxHour, true);
  hourElement.value = String(nextHour);

  const minMinute = nextHour === minHour ? min.getMinutes() : 0;
  const maxMinute = nextHour === maxHour ? max.getMinutes() : 59;
  const nextMinute = clamp(Number.isNaN(previousMinute) ? minMinute : previousMinute, minMinute, maxMinute);

  populateSelect(minuteElement, minMinute, maxMinute, true);
  minuteElement.value = String(nextMinute);
};

export const initTimePage = () => {
  readPageMessage();

  const state = loadState();
  if (!state.url) {
    redirectTo(APP_PATHS.index, TEXT.redirects.finishFirstStep);
    return;
  }
  const urlValidation = validateCourseUrl(state.url);
  if (!urlValidation.valid) {
    redirectTo(APP_PATHS.index, urlValidation.message);
    return;
  }
  const courseUrl = urlValidation.normalizedUrl ?? state.url;
  if (courseUrl !== state.url) {
    saveState({ url: courseUrl });
  }

  const linkPreview = document.getElementById('linkPreview');
  const identityPreview = document.getElementById('identityPreview');
  const manualTime = document.getElementById('manualTime');
  const modeInputs = Array.from(document.querySelectorAll('input[name="mode"]'));
  const modeCards = Array.from(document.querySelectorAll('.choice-card'));
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const dateElement = document.getElementById('date');
  const hourElement = document.getElementById('hour');
  const minuteElement = document.getElementById('minute');
  const { windowStart: manualWindowStart, windowEnd: manualWindowEnd } = createSelectableWindow();
  initStepNavigation(2);
  let modeTransitionId = 0;
  let modeScrollY = null;

  if (linkPreview) {
    linkPreview.textContent = courseUrl;
  }
  if (identityPreview) {
    identityPreview.textContent = getIdentityLabel(state.identity);
  }
  populateDateOptions(dateElement, manualWindowStart, manualWindowEnd);
  fillManualTimeInputs(state.manualTime);
  if (dateElement && !dateElement.value) {
    dateElement.value = formatDateValue(manualWindowStart);
  }
  syncTimeOptions(dateElement, hourElement, minuteElement, manualWindowStart, manualWindowEnd);

  const transitionSection = (element, shouldShow, { animate = true } = {}) => {
    if (!element) {
      return Promise.resolve();
    }

    if (!animate) {
      element.hidden = !shouldShow;
      element.classList.toggle('is-expanded', shouldShow);
      element.style.height = '';
      return Promise.resolve();
    }

    if (shouldShow) {
      if (!element.hidden && element.classList.contains('is-expanded')) {
        element.style.height = '';
        return Promise.resolve();
      }

      element.hidden = false;
      element.style.height = '0px';
      element.classList.remove('is-expanded');

      return new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            element.classList.add('is-expanded');
            element.style.height = '';
            const targetHeight = element.getBoundingClientRect().height;
            element.style.height = '0px';
            void element.offsetHeight;
            element.style.height = `${targetHeight}px`;
          });

          const handleExpandEnd = (event) => {
            if (event.propertyName !== 'height') {
              return;
            }

            element.style.height = '';
            element.removeEventListener('transitionend', handleExpandEnd);
            resolve();
          };

          element.addEventListener('transitionend', handleExpandEnd);
        });
      });
    }

    if (element.hidden) {
      return Promise.resolve();
    }

    element.style.height = `${element.scrollHeight}px`;
    element.classList.add('is-expanded');

    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          element.style.height = '0px';
          element.classList.remove('is-expanded');
        });
      });

      const handleCollapseEnd = (event) => {
        if (event.propertyName !== 'height') {
          return;
        }

        element.hidden = true;
        element.classList.remove('is-expanded');
        element.style.height = '';
        element.removeEventListener('transitionend', handleCollapseEnd);
        resolve();
      };

      element.addEventListener('transitionend', handleCollapseEnd);
    });
  };

  const syncModeCards = (mode) => {
    modeCards.forEach((card) => {
      const input = card.querySelector('input[name="mode"]');
      if (input) {
        input.checked = input.value === mode;
      }
      card.classList.toggle('is-selected', input?.value === mode);
    });
  };

  const restoreScrollPosition = (scrollY) => {
    if (!Number.isFinite(scrollY)) {
      return;
    }

    window.scrollTo(window.scrollX, scrollY);
  };

  const applyMode = async (mode, { animate = true, preserveScrollY = null } = {}) => {
    const nextMode = mode === TIME_MODES.manual ? TIME_MODES.manual : TIME_MODES.auto;
    const transitionId = modeTransitionId + 1;
    modeTransitionId = transitionId;
    syncModeCards(nextMode);
    restoreScrollPosition(preserveScrollY);
    await transitionSection(manualTime, nextMode === TIME_MODES.manual, { animate });
    restoreScrollPosition(preserveScrollY);
    if (modeTransitionId !== transitionId) {
      return;
    }
  };

  const collectState = () => ({
    timeMode: document.querySelector('input[name="mode"]:checked').value,
    manualTime: collectManualTime()
  });

  const initialMode = state.timeMode === TIME_MODES.manual ? TIME_MODES.manual : TIME_MODES.auto;

  modeInputs.forEach((input) => {
    input.checked = input.value === initialMode;
    input.addEventListener('change', () => {
      const preserveScrollY = modeScrollY ?? window.scrollY;
      modeScrollY = null;
      void applyMode(input.value, { preserveScrollY });
      saveState(collectState());
    });
  });

  modeCards.forEach((card) => {
    card.addEventListener('click', (event) => {
      const input = card.querySelector('input[name="mode"]');
      if (!input) {
        return;
      }

      event.preventDefault();
      const preserveScrollY = modeScrollY ?? window.scrollY;
      modeScrollY = null;
      void applyMode(input.value, { preserveScrollY });
      saveState(collectState());
    });

    card.addEventListener('pointerdown', () => {
      modeScrollY = window.scrollY;
    }, { passive: true });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        modeScrollY = window.scrollY;
      }
    });
  });

  void applyMode(initialMode, { animate: false });

  MANUAL_TIME_FIELDS.map((field) => document.getElementById(field)).forEach((element) => {
    if (!element) {
      return;
    }

    element.addEventListener('change', () => {
      if (element.id === 'date' || element.id === 'hour') {
        syncTimeOptions(dateElement, hourElement, minuteElement, manualWindowStart, manualWindowEnd);
      }
      saveState(collectState());
    });
  });

  backBtn.addEventListener('click', () => {
    saveState(collectState());
    window.location.href = APP_PATHS.index;
  });

  nextBtn.addEventListener('click', () => {
    const nextState = saveState(collectState());

    try {
      buildTimestamp(nextState);
    } catch (error) {
      showToast(error instanceof Error ? error.message : TEXT.errors.invalidManualTime, 'error');
      if (nextState.timeMode === TIME_MODES.manual) {
        const firstManualInput = document.getElementById('date');
        if (firstManualInput) {
          firstManualInput.focus();
        }
      }
      return;
    }

    window.location.href = APP_PATHS.qrcode;
  });
};
