import { afterEach, describe, expect, it, vi } from 'vitest';
import { TEXT } from '../config';
import {
  buildTimestamp,
  createDefaultState,
  getIdentityLabel,
  getReceiptIdentityLabel,
  getReceiptTimeModeLabel,
  getTimeModeLabel,
  parseErrorMessage,
  sanitizeState,
  validateCourseUrl
} from './wizard';

afterEach(() => {
  vi.useRealTimers();
});

describe('wizard compatibility', () => {
  it('migrates the legacy manual date fields', () => {
    const state = sanitizeState({
      identity: 'human',
      url: 'https://ccc.nottingham.edu.cn/study/home/details?id=123',
      timeMode: 'manual',
      manualTime: { year: 2026, month: 7, day: 24, hour: 18, minute: 5 }
    });

    expect(state).toMatchObject({
      identity: 'human',
      timeMode: 'manual',
      manualTime: { date: '2026-07-24', hour: '18', minute: '5' }
    });
  });

  it('accepts existing id and scheduleId course links', () => {
    expect(validateCourseUrl('ccc.nottingham.edu.cn/study/home/details?id=abc')).toMatchObject({
      valid: true,
      scheduleId: 'abc'
    });
    expect(validateCourseUrl('https://ccc.nottingham.edu.cn/study/home/details?scheduleId=xyz')).toMatchObject({
      valid: true,
      scheduleId: 'xyz'
    });
  });

  it('keeps the existing validation messages', () => {
    expect(validateCourseUrl('').message).toBe(TEXT.errors.pasteCourseUrlFirst);
    expect(validateCourseUrl('https://example.com/study/home/details?id=1').message)
      .toBe(TEXT.errors.invalidCourseUrlDomain);
  });

  it('uses Chinese-only identity labels', () => {
    expect(getIdentityLabel('human')).toBe('人类');
    expect(getIdentityLabel('agent')).toBe('智能体');
  });

  it('uses concise time mode labels', () => {
    const automatic = createDefaultState();
    expect(getTimeModeLabel(automatic)).toBe('自动');
    expect(getTimeModeLabel({ ...automatic, timeMode: 'manual' })).toBe('手动');
  });

  it('uses English-only receipt labels', () => {
    const automatic = createDefaultState();
    expect(getReceiptIdentityLabel('human')).toBe('Human');
    expect(getReceiptIdentityLabel('agent')).toBe('Agent');
    expect(getReceiptTimeModeLabel(automatic)).toBe('Auto');
    expect(getReceiptTimeModeLabel({ ...automatic, timeMode: 'manual' })).toBe('Manual');
  });

  it('builds auto and manual timestamps with the original limits', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T10:00:00'));
    const auto = createDefaultState();
    expect(buildTimestamp(auto)).toBe(new Date('2026-07-24T10:01:00').getTime());

    const manual = {
      ...auto,
      timeMode: 'manual' as const,
      manualTime: { date: '2026-07-24', hour: '10', minute: '30' }
    };
    expect(buildTimestamp(manual)).toBe(new Date('2026-07-24T10:30:00').getTime());
  });

  it('parses API error payloads without changing fallback copy', () => {
    expect(parseErrorMessage('{"error":"课程不存在"}')).toBe('课程不存在');
    expect(parseErrorMessage('<!DOCTYPE html>')).toBe(TEXT.errors.qrCodeGenerationFallback);
  });
});
