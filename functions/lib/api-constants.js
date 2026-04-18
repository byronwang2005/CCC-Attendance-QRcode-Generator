export const RESPONSE_HEADERS = Object.freeze({
  json: { 'Content-Type': 'application/json' },
  png: {
    'Content-Type': 'image/png',
    'Content-Disposition': 'attachment; filename="qrcode.png"'
  }
});

export const ERROR_MESSAGES = Object.freeze({
  missingCourseUrl: '缺少课程链接',
  missingTimestamp: '缺少时间参数',
  invalidScheduleId: '链接无效：未找到课程ID（id 或 scheduleId）',
  serverError: '服务异常，请稍后重试'
});
