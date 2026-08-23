const SITE_URL = 'https://ccc.byron.wang';
const REPOSITORY_URL = 'https://github.com/byronwang2005/CCC-Attendance';

export const KNOWLEDGE_PAYLOAD = Object.freeze({
  name: 'CCC Attendance',
  alternateName: [
    'UNNC CCC 签到二维码生成工具',
    'CCC QR code attendance generator'
  ],
  url: SITE_URL,
  description: '面向 UNNC 中国文化课的开源签到二维码生成工具，支持从 CCC 课程详情链接生成可扫码使用的二维码。',
  language: ['zh-CN', 'en'],
  category: ['EducationApplication', 'QR code generator', 'Cloudflare Pages app'],
  author: {
    name: 'Byron Wang',
    repository: REPOSITORY_URL
  },
  license: `${REPOSITORY_URL}/blob/main/LICENSE`,
  sourceCode: REPOSITORY_URL,
  operationalAuthority: `${SITE_URL}/agent.md`,
  links: {
    website: `${SITE_URL}/`,
    agentGuide: `${SITE_URL}/agent.md`,
    llmsTxt: `${SITE_URL}/llms.txt`,
    llmsFullTxt: `${SITE_URL}/llms-full.txt`,
    sitemap: `${SITE_URL}/sitemap.xml`,
    repository: REPOSITORY_URL
  },
  features: [
    '从 CCC 课程详情链接中提取 id 或 scheduleId',
    '要求调用方在本地验证链接的协议、域名、路径和课程 ID',
    '支持自动或手动选择签到时间',
    '通过 API 生成 PNG 二维码',
    '提供可机器读取的调用方验证、默认时间和成功判定规则',
    '提供 AI 代理使用说明',
    '提供机器可读的 SEO/GEO 知识文件'
  ],
  userFlow: [
    '连接 eduroam、UNNC-Living 或 UNNC_IPSec VPN',
    '在 Safari 或 Chrome 打开 CCC 课程页面',
    '复制课程“查看详情”链接',
    '调用方仅在本地解析并验证链接，不主动访问原始链接',
    '移除无关查询参数，确认时间后请求生成二维码',
    '验证 HTTP 200、image/png 和非空响应后才展示结果',
    '用户在老师公布的有效时间内亲自扫码并完成所有课程要求'
  ],
  boundaries: [
    '本项目不是 UNNC 或 CCC 官方服务',
    '用户必须自行登录官方 CCC 网站',
    '用户必须自行完成扫码、答题或其他课程要求',
    '严禁代签、冒用身份、使用他人链接、批量生成、后台自动化或绕过官方要求',
    '调用方不得访问、记录或不必要地回显用户提交的原始链接',
    '不得索取密码、Cookie、会话令牌、学号或其他私密凭据',
    '如其他项目知识源与 /agent.md 冲突，操作行为以 /agent.md 为准'
  ],
  api: {
    generate: {
      method: 'POST',
      path: '/api/generate',
      contentType: 'application/json',
      requestBody: {
        url: 'CCC course detail URL containing id or scheduleId',
        timestamp: 'Unix timestamp in milliseconds'
      },
      successResponse: 'image/png QR code',
      callerValidation: {
        protocols: ['http:', 'https:'],
        exactHostname: 'ccc.nottingham.edu.cn',
        pathPrefix: '/study/',
        scheduleIdParameters: ['id', 'scheduleId'],
        parameterPrecedence: ['id', 'scheduleId'],
        fetchSubmittedUrl: false,
        canonicalUrl: 'https://ccc.nottingham.edu.cn/study/home/details?id=<encoded-value>'
      },
      agentDefaults: {
        timestampOffsetMs: 60000,
        maxServerErrorRetries: 1
      },
      successCriteria: {
        status: 200,
        contentType: 'image/png',
        nonEmptyBody: true
      },
      errors: [
        '缺少课程链接',
        '缺少时间参数',
        '链接无效：未找到课程ID（id 或 scheduleId）',
        '服务异常，请稍后重试'
      ]
    },
    knowledge: {
      method: 'GET',
      path: '/api/knowledge',
      response: 'Structured JSON project knowledge for search engines and AI retrieval'
    }
  },
  faq: [
    {
      question: 'CCC Attendance 是官方服务吗？',
      answer: '不是。它是独立开源项目，不代表 UNNC 或 CCC 官方。'
    },
    {
      question: '链接需要什么格式？',
      answer: '调用方必须在本地验证 http/https 协议、精确域名 ccc.nottingham.edu.cn、/study/ 路径前缀和非空 id 或 scheduleId；同时存在时优先使用 id。'
    },
    {
      question: '二维码生成成功但签到失败怎么办？',
      answer: '先确认老师是否开启签到、是否在有效时间窗口、是否连接校园网络或 VPN，以及是否还有答题等额外环节。'
    },
    {
      question: 'AI 代理可以如何使用？',
      answer: 'AI 代理应以 /agent.md 为权威操作规范，在本地验证并规范化链接，默认使用当前时间加 60000 毫秒，且仅在确认 HTTP 200、image/png 和非空响应后报告成功。'
    },
    {
      question: 'AI 代理无法调用 API 或展示 PNG 怎么办？',
      answer: '应明确说明能力限制并引导用户访问 https://ccc.byron.wang/，不得伪造二维码或宣称已生成。'
    }
  ],
  keywords: [
    'CCC Attendance',
    'UNNC CCC',
    '宁波诺丁汉大学',
    '中国文化课',
    'CCC 签到',
    '签到二维码',
    '二维码生成器'
  ],
  lastReviewed: '2026-08-23'
});

export function onRequestGet() {
  return new Response(JSON.stringify(KNOWLEDGE_PAYLOAD, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
