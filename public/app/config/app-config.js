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
  manualWindowMs: 7 * 24 * 60 * 60 * 1000,
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
  'date',
  'hour',
  'minute'
]);

export const NETWORK = Object.freeze({
  supportedProtocols: Object.freeze(['http:', 'https:']),
  expectedCourseHosts: Object.freeze(['ccc.nottingham.edu.cn'])
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
    invalidCourseUrl: '链接格式不正确，请检查是否复制了完整的课程详情链接',
    unsupportedCourseUrlProtocol: '链接协议不支持，请使用http或https开头的链接',
    invalidCourseUrlDomain: '这看起来不是 CCC 课程链接，请从 ccc.nottingham.edu.cn 的课程详情页复制',
    invalidCourseUrlPath: '这不是课程学习页面链接，请复制 CCC 课程页里“查看详情”的链接',
    invalidScheduleId: '链接里缺少课程ID。正确链接通常包含 ?id=xxxx 或 ?scheduleId=xxxx',
    completeCurrentStepFirst: '请先完成当前步骤',
    completeManualTime: '请完整填写手动时间',
    invalidManualTime: '手动时间格式错误，请检查日期和时间是否有效',
    manualTimeOutOfRange: '手动时间只能选择当前时间到未来 7 天内',
    noQrCodeToDownload: '当前还没有可下载的二维码',
    qrCodeGenerationFallback: '生成失败，请稍后重试',
    qrCodeGenerationFailed: '二维码生成失败，请检查链接或时间设置',
    networkError: '网络异常，请检查网络后重试',
    copyFailed: '复制失败，请手动复制'
  }),
  status: Object.freeze({
    copySuccess: '已复制',
    copied: '已复制!',
    qrCodeGenerated: '二维码已生成。如有“答题”选项，请继续完成。',
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
