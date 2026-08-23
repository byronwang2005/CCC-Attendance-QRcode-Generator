import { STORAGE_KEY, TEXT, TIME_LIMITS } from '../config';
import type { Identity, ManualTime, TimeMode, WizardState } from '../types';

const SCHEDULE_ID_PATTERNS = [/[?&]id=([^&#]+)/, /[?&]scheduleId=([^&#]+)/];
const pad = (value: number | string) => String(value).padStart(2, '0');

export const formatDateValue = (date: Date) => [
  date.getFullYear(),
  pad(date.getMonth() + 1),
  pad(date.getDate())
].join('-');

export const createDefaultManualTime = (): ManualTime => {
  const now = new Date();
  if (now.getSeconds() > 0 || now.getMilliseconds() > 0) {
    now.setMinutes(now.getMinutes() + 1, 0, 0);
  }
  return {
    date: formatDateValue(now),
    hour: String(now.getHours()),
    minute: String(now.getMinutes())
  };
};

export const createDefaultState = (): WizardState => ({
  identity: '',
  url: '',
  timeMode: 'auto',
  manualTime: createDefaultManualTime()
});

const safeString = (value: unknown, fallback = '') => {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.trim() || fallback;
  return fallback;
};

const parseInteger = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return Number.NaN;
  return Number.parseInt(String(value), 10);
};

const normalizeManualDate = (manualTime: Record<string, unknown>, fallback: string) => {
  const directDate = safeString(manualTime.date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(directDate)) return directDate;

  const year = parseInteger(manualTime.year);
  const month = parseInteger(manualTime.month);
  const day = parseInteger(manualTime.day);
  if ([year, month, day].some(Number.isNaN)) return fallback;

  const migratedDate = new Date(year, month - 1, day);
  return migratedDate.getFullYear() === year
    && migratedDate.getMonth() === month - 1
    && migratedDate.getDate() === day
    ? formatDateValue(migratedDate)
    : fallback;
};

export const sanitizeState = (candidate: unknown): WizardState => {
  const defaults = createDefaultState();
  const source = candidate && typeof candidate === 'object' ? candidate as Record<string, unknown> : {};
  const manualTime = source.manualTime && typeof source.manualTime === 'object'
    ? source.manualTime as Record<string, unknown>
    : {};
  const identity: Identity = source.identity === 'human' || source.identity === 'agent' ? source.identity : '';
  const timeMode: TimeMode = source.timeMode === 'manual' ? 'manual' : 'auto';

  return {
    identity,
    url: safeString(source.url),
    timeMode,
    manualTime: {
      date: normalizeManualDate(manualTime, defaults.manualTime.date),
      hour: safeString(manualTime.hour, defaults.manualTime.hour),
      minute: safeString(manualTime.minute, defaults.manualTime.minute)
    }
  };
};

export const loadState = (): WizardState => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeState(JSON.parse(raw)) : createDefaultState();
  } catch {
    return createDefaultState();
  }
};

export const persistState = (state: WizardState) => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeState(state)));
  } catch {
    // Keep the in-memory workflow usable when storage is unavailable.
  }
};

export const clearState = () => {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures and continue.
  }
};

export const normalizeCourseUrl = (inputUrl: string) => {
  const value = safeString(inputUrl);
  if (!value) return '';
  return /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
};

export const extractScheduleId = (inputUrl: string) => {
  for (const pattern of SCHEDULE_ID_PATTERNS) {
    const match = inputUrl.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export const validateCourseUrl = (inputUrl: string) => {
  const value = normalizeCourseUrl(inputUrl);
  if (!value) {
    return { valid: false as const, messages: [TEXT.errors.pasteCourseUrlFirst], message: TEXT.errors.pasteCourseUrlFirst };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { valid: false as const, messages: [TEXT.errors.invalidCourseUrl], message: TEXT.errors.invalidCourseUrl };
  }

  const messages: string[] = [];
  if (!['http:', 'https:'].includes(parsed.protocol)) messages.push(TEXT.errors.unsupportedCourseUrlProtocol);
  if (parsed.hostname.toLowerCase() !== 'ccc.nottingham.edu.cn') messages.push(TEXT.errors.invalidCourseUrlDomain);
  if (!parsed.pathname.startsWith('/study/')) messages.push(TEXT.errors.invalidCourseUrlPath);
  const scheduleId = extractScheduleId(value);
  if (!scheduleId) messages.push(TEXT.errors.invalidScheduleId);

  if (messages.length) {
    return {
      valid: false as const,
      messages,
      message: messages.length === 1
        ? messages[0]
        : ['链接有这些问题：', ...messages.map((message, index) => `${index + 1}. ${message}`)].join('\n')
    };
  }

  return { valid: true as const, scheduleId: scheduleId!, normalizedUrl: value };
};

export const buildTimestamp = (state: WizardState) => {
  if (state.timeMode !== 'manual') return Date.now() + TIME_LIMITS.autoOffsetMs;

  const dateParts = state.manualTime.date.split('-').map(parseInteger);
  const hour = parseInteger(state.manualTime.hour);
  const minute = parseInteger(state.manualTime.minute);
  if (dateParts.length !== 3 || [...dateParts, hour, minute].some(Number.isNaN)) {
    throw new Error(TEXT.errors.completeManualTime);
  }

  const [year, month, day] = dateParts;
  const date = new Date(year, month - 1, day, hour, minute);
  const valid = date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && date.getHours() === hour
    && date.getMinutes() === minute;
  if (!valid) throw new Error(TEXT.errors.invalidManualTime);

  const timestamp = date.getTime();
  const now = Date.now();
  if (timestamp < now || timestamp > now + TIME_LIMITS.manualWindowMs) {
    throw new Error(TEXT.errors.manualTimeOutOfRange);
  }
  return timestamp;
};

export const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${formatDateValue(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatCurrentTime = (date: Date) => (
  `${formatDateValue(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
);

export const getIdentityLabel = (identity: Identity) => (
  identity === 'agent' ? '智能体' : (identity === 'human' ? '人类' : '未选择')
);

export const getReceiptIdentityLabel = (identity: Identity) => (
  identity === 'agent' ? 'Agent' : (identity === 'human' ? 'Human' : 'Not selected')
);

export const getTimeModeLabel = (state: WizardState) => {
  return state.timeMode === 'manual' ? '手动' : '自动';
};

export const getReceiptTimeModeLabel = (state: WizardState) => {
  return state.timeMode === 'manual' ? 'Manual' : 'Auto';
};

export const parseErrorMessage = (rawText: string) => {
  if (!rawText) return TEXT.errors.qrCodeGenerationFallback;
  try {
    const parsed = JSON.parse(rawText) as { error?: unknown };
    if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error.trim();
  } catch {
    // Fall through to the raw response.
  }
  const message = rawText.trim();
  return !message || message.startsWith('<!DOCTYPE html')
    ? TEXT.errors.qrCodeGenerationFallback
    : message;
};
