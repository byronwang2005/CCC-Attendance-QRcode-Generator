import { describe, expect, it } from 'vitest';
import { buildAttendanceUrl, extractScheduleId } from './attendance.js';

describe('attendance URL helpers', () => {
  it.each([
    ['https://ccc.nottingham.edu.cn/study/course?id=course-123', 'course-123'],
    ['https://ccc.nottingham.edu.cn/study/course?foo=bar&scheduleId=schedule-456#details', 'schedule-456']
  ])('extracts a schedule ID from %s', (url, expected) => {
    expect(extractScheduleId(url)).toBe(expected);
  });

  it.each([
    '',
    'https://ccc.nottingham.edu.cn/study/course',
    null,
    123
  ])('rejects an input without a schedule ID: %s', input => {
    expect(extractScheduleId(input)).toBeNull();
  });

  it('builds the existing CCC attendance URL shape', () => {
    expect(buildAttendanceUrl({ scheduleId: 'schedule-456', timestamp: 1_777_777_777_777 })).toBe(
      'https://ccc.nottingham.edu.cn/study/attendance?scheduleId=schedule-456&time=1777777777777'
    );
  });
});
