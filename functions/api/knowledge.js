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
    '支持自动或手动选择签到时间',
    '通过 API 生成 PNG 二维码',
    '提供 AI 代理使用说明',
    '提供机器可读的 SEO/GEO 知识文件'
  ],
  userFlow: [
    '连接 eduroam、UNNC-Living 或 UNNC_IPSec VPN',
    '在 Safari 或 Chrome 打开 CCC 课程页面',
    '复制课程“查看详情”链接',
    '粘贴链接并确认时间',
    '生成二维码并按课程要求扫码'
  ],
  boundaries: [
    '本项目不是 UNNC 或 CCC 官方服务',
    '用户必须自行登录官方 CCC 网站',
    '用户必须自行完成扫码、答题或其他课程要求',
    '严禁用于未经授权的代签或学术不诚信行为'
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
      answer: '链接需要包含 id 或 scheduleId 参数，例如 https://ccc.nottingham.edu.cn/study/home/details?id=xxxx。'
    },
    {
      question: '二维码生成成功但签到失败怎么办？',
      answer: '先确认老师是否开启签到、是否在有效时间窗口、是否连接校园网络或 VPN，以及是否还有答题等额外环节。'
    },
    {
      question: 'AI 代理可以如何使用？',
      answer: 'AI 代理应先读取 /agent.md，帮助用户理解步骤、规范链接并调用 API，但不能代替用户完成登录、扫码或答题。'
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
  lastReviewed: '2026-05-03'
});

export function onRequestGet() {
  return new Response(JSON.stringify(KNOWLEDGE_PAYLOAD, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
