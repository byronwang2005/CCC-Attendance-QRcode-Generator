export const APP_PATHS = Object.freeze({
  index: 'index.html',
  time: 'index.html?step=2',
  qrcode: 'index.html?step=3',
  step: (step) => `index.html?step=${step}`,
  generateApi: '/api/generate'
});

export const STEPS = Object.freeze({
  index: 1,
  time: 2,
  qrcode: 3
});

export const STORAGE = Object.freeze({
  key: 'cccAttendanceWizard'
});

export const IDENTITIES = Object.freeze({
  agent: 'agent',
  human: 'human'
});

export const TIME_MODES = Object.freeze({
  auto: 'auto',
  manual: 'manual'
});

export const QR_CODE = Object.freeze({
  alt: 'Attendance QR Code'
});

export const TIME_LIMITS = Object.freeze({
  manualYearMin: 2025,
  manualYearMax: 2050,
  autoOffsetMs: 60 * 1000
});

export const UI_TIMING = Object.freeze({
  toastDurationMs: 3000,
  copyResetDelayMs: 1800
});

export const STEP_PATHS = Object.freeze({
  1: APP_PATHS.index,
  2: APP_PATHS.time,
  3: APP_PATHS.qrcode
});

export const MANUAL_TIME_FIELDS = Object.freeze([
  'year',
  'month',
  'day',
  'hour',
  'minute'
]);

export const NETWORK = Object.freeze({
  supportedProtocols: Object.freeze(['http:', 'https:'])
});

export const SCHEDULE_ID_PATTERNS = Object.freeze([
  /[?&]id=([^&#]+)/,
  /[?&]scheduleId=([^&#]+)/
]);

export const TEXT = Object.freeze({
  agentPrompt: 'Please read the instruction in "https://ccc.byron.wang/agent.md" and assist the user to generate the QR code.',
  errors: Object.freeze({
    chooseIdentityFirst: '请先选择身份（人类或AI代理）',
    pasteCourseUrlFirst: '请先粘贴课程详情链接',
    invalidCourseUrl: '链接格式不正确，请粘贴完整课程详情链接',
    invalidScheduleId: '链接无效：未找到课程ID（id 或 scheduleId）',
    completeCurrentStepFirst: '请先完成当前步骤',
    completeManualTime: '请完整填写手动时间',
    invalidManualTime: '手动时间格式错误，请检查年月日时分是否有效（含闰年）',
    noQrCodeToDownload: '当前还没有可下载的二维码',
    qrCodeGenerationFallback: '生成失败，请稍后重试',
    qrCodeGenerationFailed: '二维码生成失败，请检查链接或时间设置',
    networkError: '网络异常，请检查网络后重试',
    copyFailed: '复制失败，请手动复制'
  }),
  status: Object.freeze({
    copySuccess: '复制成功！',
    copied: '已复制!',
    qrCodeGenerated: '二维码已生成！如果有“答题”选项，请记得继续完成。',
    regenerate: '重新生成二维码',
    generate: '生成签到二维码'
  }),
  placeholders: Object.freeze({
    qrCode: '二维码将在这里生成',
    qrCodeLoading: '正在生成二维码...'
  }),
  redirects: Object.freeze({
    finishFirstStep: '请先完成第一步并粘贴课程链接',
    finishPreviousSteps: '请先完成前两步后再生成二维码'
  })
});
