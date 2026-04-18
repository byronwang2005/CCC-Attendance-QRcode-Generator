import {
  IDENTITIES,
  MANUAL_TIME_FIELDS,
  NETWORK,
  SCHEDULE_ID_PATTERNS,
  STEP_PATHS,
  STORAGE,
  TEXT,
  TIME_LIMITS,
  TIME_MODES,
  UI_TIMING
} from './config.js';

export const AGENT_PROMPT = TEXT.agentPrompt;

const createDefaultManualTime = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const year = Math.max(TIME_LIMITS.manualYearMin, Math.min(TIME_LIMITS.manualYearMax, currentYear));
  return {
    year: String(year),
    month: String(now.getMonth() + 1),
    day: String(now.getDate()),
    hour: String(now.getHours()),
    minute: String(now.getMinutes())
  };
};

const createDefaultState = () => ({
  identity: '',
  url: '',
  timeMode: TIME_MODES.auto,
  manualTime: createDefaultManualTime()
});

const normalizeIdentity = (identity) => {
  if (identity === IDENTITIES.agent || identity === IDENTITIES.human) {
    return identity;
  }
  return '';
};
const normalizeTimeMode = (mode) => (mode === TIME_MODES.manual ? TIME_MODES.manual : TIME_MODES.auto);

const safeString = (value, fallback = '') => {
  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  return fallback;
};

const sanitizeState = (candidate) => {
  const defaults = createDefaultState();
  const manualTime = candidate && typeof candidate === 'object' && candidate.manualTime && typeof candidate.manualTime === 'object'
    ? candidate.manualTime
    : {};

  return {
    identity: normalizeIdentity(candidate && candidate.identity),
    url: safeString(candidate && candidate.url),
    timeMode: normalizeTimeMode(candidate && candidate.timeMode),
    manualTime: {
      year: safeString(manualTime.year, defaults.manualTime.year),
      month: safeString(manualTime.month, defaults.manualTime.month),
      day: safeString(manualTime.day, defaults.manualTime.day),
      hour: safeString(manualTime.hour, defaults.manualTime.hour),
      minute: safeString(manualTime.minute, defaults.manualTime.minute)
    }
  };
};

export const loadState = () => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE.key);
    if (!raw) {
      return createDefaultState();
    }

    return sanitizeState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
};

export const saveState = (patch = {}) => {
  const current = loadState();
  const next = sanitizeState({
    ...current,
    ...patch,
    manualTime: patch.manualTime ? { ...current.manualTime, ...patch.manualTime } : current.manualTime
  });

  try {
    window.sessionStorage.setItem(STORAGE.key, JSON.stringify(next));
  } catch {
    return next;
  }

  return next;
};

export const clearState = () => {
  try {
    window.sessionStorage.removeItem(STORAGE.key);
  } catch {
    // Ignore storage errors and continue to redirect.
  }
};

export const showToast = (message, type = 'success') => {
  const toast = document.getElementById('toast');
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  if (toast.dataset.timerId) {
    window.clearTimeout(Number(toast.dataset.timerId));
  }

  const timerId = window.setTimeout(() => {
    toast.classList.remove('show');
  }, UI_TIMING.toastDurationMs);

  toast.dataset.timerId = String(timerId);
};

export const readPageMessage = () => {
  const params = new URLSearchParams(window.location.search);
  const message = params.get('message');
  if (!message) {
    return;
  }

  const type = params.get('type') || 'error';
  showToast(message, type);
  params.delete('message');
  params.delete('type');

  const search = params.toString();
  const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
  window.history.replaceState({}, document.title, nextUrl);
};

const TYPEWRITER_MESSAGES = [
  '一个签到码，三步搞定',
  '一個簽到碼，三步搞定',
  'One check-in code, done in 3 steps.',
  '1つのチェックインコードで、3ステップ完了。',
  'Один код для отметки, и всё готово за три шага.',
  '하나의 출석 코드, 세 단계면 완료.',
  'رمز حضور واحد، وثلاث خطوات تكفي.'
];

const TYPEWRITER_TIMING = {
  typeMs: 72,
  deleteMs: 36,
  holdMs: 1380,
  nextDelayMs: 240
};

export const initHeaderTypewriter = () => {
  const target = document.querySelector('[data-typewriter]');
  if (!target) {
    return;
  }

  const [firstMessage, ...restMessages] = TYPEWRITER_MESSAGES;
  const shuffledMessages = [...restMessages];
  for (let index = shuffledMessages.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledMessages[index], shuffledMessages[swapIndex]] = [shuffledMessages[swapIndex], shuffledMessages[index]];
  }
  const playbackMessages = [firstMessage, ...shuffledMessages];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    target.textContent = firstMessage;
    return;
  }

  let messageIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let timerId = 0;

  const tick = () => {
    const current = playbackMessages[messageIndex];
    const isRtl = /[\u0600-\u06FF]/.test(current);
    target.dir = isRtl ? 'rtl' : 'ltr';

    if (!isDeleting) {
      charIndex += 1;
      target.textContent = current.slice(0, charIndex);

      if (charIndex >= current.length) {
        isDeleting = true;
        timerId = window.setTimeout(tick, TYPEWRITER_TIMING.holdMs);
        return;
      }

      timerId = window.setTimeout(tick, TYPEWRITER_TIMING.typeMs);
      return;
    }

    charIndex -= 1;
    target.textContent = current.slice(0, Math.max(charIndex, 0));

    if (charIndex <= 0) {
      isDeleting = false;
      messageIndex = (messageIndex + 1) % playbackMessages.length;
      timerId = window.setTimeout(tick, TYPEWRITER_TIMING.nextDelayMs);
      return;
    }

    timerId = window.setTimeout(tick, TYPEWRITER_TIMING.deleteMs);
  };

  target.textContent = '';
  tick();

  window.addEventListener('beforeunload', () => {
    window.clearTimeout(timerId);
  }, { once: true });
};

export const redirectTo = (path, message, type = 'error') => {
  const url = new URL(path, window.location.href);
  if (message) {
    url.searchParams.set('message', message);
    url.searchParams.set('type', type);
  }
  window.location.replace(url.toString());
};

export const initStepNavigation = (currentStep) => {
  const cards = Array.from(document.querySelectorAll('.step-card[data-step]'));
  if (!cards.length) {
    return;
  }

  const handleStepClick = (targetStep) => {
    if (targetStep < currentStep) {
      window.location.href = STEP_PATHS[targetStep];
      return;
    }

    if (targetStep > currentStep) {
      showToast(TEXT.errors.completeCurrentStepFirst, 'error');
    }
  };

  cards.forEach((card) => {
    const targetStep = Number.parseInt(card.dataset.step || '', 10);
    if (!Object.hasOwn(STEP_PATHS, targetStep)) {
      return;
    }

    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `跳转到第 ${targetStep} 步`);

    if (targetStep < currentStep) {
      card.classList.add('is-clickable-back');
    } else if (targetStep > currentStep) {
      card.classList.add('is-locked-step');
    }

    card.addEventListener('click', () => handleStepClick(targetStep));
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      handleStepClick(targetStep);
    });
  });
};

export const getIdentityLabel = (identity) => (
  identity === IDENTITIES.agent ? 'AI代理（Agent）' : (identity === IDENTITIES.human ? '人类（Human）' : '未选择')
);

export const extractScheduleId = (inputUrl) => {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return null;
  }

  for (const pattern of SCHEDULE_ID_PATTERNS) {
    const match = inputUrl.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

export const validateCourseUrl = (inputUrl) => {
  const value = safeString(inputUrl);
  if (!value) {
    return { valid: false, message: TEXT.errors.pasteCourseUrlFirst };
  }

  try {
    const parsed = new URL(value);
    if (!NETWORK.supportedProtocols.includes(parsed.protocol)) {
      return { valid: false, message: TEXT.errors.invalidCourseUrl };
    }
  } catch {
    return { valid: false, message: TEXT.errors.invalidCourseUrl };
  }

  const scheduleId = extractScheduleId(value);
  if (!scheduleId) {
    return { valid: false, message: TEXT.errors.invalidScheduleId };
  }

  return { valid: true, scheduleId };
};

const parseInteger = (value) => {
  if (value === '' || value === null || value === undefined) {
    return Number.NaN;
  }
  return Number.parseInt(String(value), 10);
};

export const buildTimestamp = (state) => {
  if (state.timeMode !== TIME_MODES.manual) {
    return Date.now() + TIME_LIMITS.autoOffsetMs;
  }

  const year = parseInteger(state.manualTime.year);
  const month = parseInteger(state.manualTime.month);
  const day = parseInteger(state.manualTime.day);
  const hour = parseInteger(state.manualTime.hour);
  const minute = parseInteger(state.manualTime.minute);

  if ([year, month, day, hour, minute].some(Number.isNaN)) {
    throw new Error(TEXT.errors.completeManualTime);
  }

  if (year < TIME_LIMITS.manualYearMin || year > TIME_LIMITS.manualYearMax) {
    throw new Error(`手动年份仅支持 ${TIME_LIMITS.manualYearMin}-${TIME_LIMITS.manualYearMax}`);
  }

  const date = new Date(year, month - 1, day, hour, minute);
  const isValid = date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && date.getHours() === hour
    && date.getMinutes() === minute;

  if (!isValid) {
    throw new Error(TEXT.errors.invalidManualTime);
  }

  return date.getTime();
};

export const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, '0');

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  ].join(' ');
};

export const getTimeModeLabel = (state) => {
  if (state.timeMode !== TIME_MODES.manual) {
    return '自动模式';
  }

  try {
    return `手动模式（${formatDateTime(buildTimestamp(state))}）`;
  } catch {
    return '手动模式';
  }
};

export const collectManualTime = () => Object.fromEntries(
  MANUAL_TIME_FIELDS.map((field) => {
    const element = document.getElementById(field);
    return [field, safeString(element ? element.value : '')];
  })
);

export const fillManualTimeInputs = (manualTime) => {
  MANUAL_TIME_FIELDS.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.value = safeString(manualTime[id]);
    }
  });
};

export const bindCopyButton = (button, text = AGENT_PROMPT) => {
  if (!button) {
    return;
  }

  button.addEventListener('click', async () => {
    const originalText = button.textContent;

    try {
      await navigator.clipboard.writeText(text);
      button.textContent = TEXT.status.copied;
      button.disabled = true;
      showToast(TEXT.status.copySuccess);

      window.setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, UI_TIMING.copyResetDelayMs);
    } catch {
      showToast(TEXT.errors.copyFailed, 'error');
    }
  });
};

export const downloadFile = (href, filename) => {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

export const parseErrorMessage = (rawText) => {
  if (!rawText) {
    return TEXT.errors.qrCodeGenerationFallback;
  }

  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {
    // Ignore JSON parse failures and fall back to raw text.
  }

  const message = rawText.trim();
  if (!message || message.startsWith('<!DOCTYPE html')) {
    return TEXT.errors.qrCodeGenerationFallback;
  }

  return message;
};
