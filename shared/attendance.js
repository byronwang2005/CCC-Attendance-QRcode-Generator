export const ATTENDANCE_BASE_URL = 'https://ccc.nottingham.edu.cn/study/attendance';

export const SCHEDULE_ID_PATTERNS = Object.freeze([
  /[?&]id=([^&#]+)/,
  /[?&]scheduleId=([^&#]+)/
]);

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

export const buildAttendanceUrl = ({ scheduleId, timestamp }) => (
  `${ATTENDANCE_BASE_URL}?scheduleId=${scheduleId}&time=${timestamp}`
);
