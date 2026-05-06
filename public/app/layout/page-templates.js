import { STEPS } from '../config/app-config.js';
import { renderPageShell } from './page-shell.js';

const STEP_TITLES = Object.freeze([
  '',
  '粘贴链接',
  '确认时间',
  '生成二维码'
]);

const createSteps = (currentStep) => ([
  {
    number: 1,
    title: STEP_TITLES[1],
    description: currentStep > 1 ? '已完成' : '选择身份，并粘贴课程链接',
    state: currentStep === 1 ? 'active' : (currentStep > 1 ? 'done' : 'idle')
  },
  {
    number: 2,
    title: STEP_TITLES[2],
    description: currentStep > 2 ? '已完成' : '选择模式，并确认时间',
    state: currentStep === 2 ? 'active' : (currentStep > 2 ? 'done' : 'idle')
  },
  {
    number: 3,
    title: STEP_TITLES[3],
    description: '查看结果',
    state: currentStep === 3 ? 'active' : (currentStep > 3 ? 'done' : 'idle')
  }
]);

const getRoot = () => document.getElementById('app');

const INDEX_CONTENT = `
      <section class="panel panel-split">
        <div class="panel-header identity-header">
          <h3>先告诉我，您是？</h3>

          <div class="identity-buttons" role="tablist" aria-label="身份选择">
            <button type="button" class="identity-btn" data-identity="human">人类</button>
            <button type="button" class="identity-btn" id="agentBtn" data-identity="agent">AI代理</button>
          </div>
        </div>

        <div class="identity-content expandable-section" id="humanContent" hidden>
          <div class="guide-list" role="list" aria-label="人工签到指引">
            <article class="guide-card" role="listitem">
              <div class="guide-card-index">01</div>
              <div class="guide-card-body">
                <h3>卡准时间</h3>
                <p>最佳签到时间窗口是课程结束前10分钟到课程结束时刻，例如20:00下课时，可优先考虑19:50到20:00。</p>
              </div>
            </article>

            <article class="guide-card" role="listitem">
              <div class="guide-card-index">02</div>
              <div class="guide-card-body">
                <h3>连接网络</h3>
                <p>网络环境需处于<code>eduroam</code>、<code>UNNC-Living</code>或<code>UNNC_IPSec VPN</code>等校园网络之一。</p>
              </div>
            </article>

            <article class="guide-card" role="listitem">
              <div class="guide-card-index">03</div>
              <div class="guide-card-body">
                <h3>复制链接</h3>
                <p>用手机浏览器（如Safari）打开<a href="https://ccc.nottingham.edu.cn/study/" target="_blank" rel="noopener noreferrer">CCC课程页面</a>，不要用微信内置浏览器。</p>
                <p>找到要签到的课程，长按“查看详情”，选择“复制链接”，再把完整链接粘贴到下方输入框。</p>
              </div>
            </article>
          </div>
        </div>

        <div class="identity-content expandable-section" id="agentContent" hidden>
          <div class="agent-command">
            <span class="agent-text">Please read the instruction in "https://ccc.byron.wang/agent.md" and assist the user to generate the QR code.</span>
            <button type="button" class="copy-btn" id="copyAgentText">复制</button>
          </div>
          <p class="agent-hint">把这句话粘贴到AI代理，TA会引导您在本地完成后续步骤。</p>
        </div>

        <div class="course-link-section expandable-section" id="courseLinkSection" hidden>
          <div class="course-link-header">
            <h3>然后粘贴在这里！</h3>
            <p>链接格式类似 <code>https://ccc.nottingham.edu.cn/study/home/details?id=xxxx</code>。</p>
          </div>

          <div class="course-link-input-wrap">
            <input
              id="urlInput"
              type="text"
              inputmode="url"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              placeholder="https://ccc.nottingham.edu.cn/study/home/details?id="
              aria-label="课程详情链接输入框"
            />
          </div>
        </div>
      </section>
    `;

const INDEX_ACTIONS = `
  <div class="actions actions-end actions-major">
    <button type="button" id="nextBtn" class="button-primary">下一步</button>
  </div>
`;

const TIME_CONTENT = `
      <section class="panel">
        <div class="panel-header">
          <h2>选择时间模式</h2>
        </div>

        <div class="radio-grid" role="radiogroup" aria-label="时间模式选择">
          <label class="choice-card">
            <input type="radio" name="mode" value="auto" />
            <div>
              <strong>自动（推荐）</strong>
              <small>适合绝大多数情况。</small>
            </div>
          </label>
          <label class="choice-card">
            <input type="radio" name="mode" value="manual" />
            <div>
              <strong>手动</strong>
              <small>自定义签到时间，通常用于提前准备二维码。</small>
            </div>
          </label>
        </div>

        <div id="manualTime" class="time-grid expandable-section" hidden>
          <div>
            <label for="year">年</label>
            <select id="year"></select>
          </div>
          <div>
            <label for="month">月</label>
            <select id="month"></select>
          </div>
          <div>
            <label for="day">日</label>
            <select id="day"></select>
          </div>
          <div>
            <label for="hour">时</label>
            <select id="hour"></select>
          </div>
          <div>
            <label for="minute">分</label>
            <select id="minute"></select>
          </div>
        </div>
      </section>
    `;

const TIME_ACTIONS = `
  <div class="actions">
    <button type="button" id="backBtn" class="button-secondary">返回上一步</button>
    <button type="button" id="nextBtn" class="button-primary">下一步</button>
  </div>
`;

const QRCODE_CONTENT = `
      <section class="receipt-panel panel">
        <div id="qrcode" class="qrcode-stage" aria-label="二维码，就位">
          <div class="qrcode-placeholder">
            <div>二维码将在这里生成</div>
          </div>
        </div>
      </section>
    `;

const QRCODE_ACTIONS = `
  <div class="actions">
    <button type="button" id="backBtn" class="button-secondary">返回上一步</button>
    <button type="button" id="restartBtn" class="button-secondary">生成更多</button>
  </div>
`;

const PAGE_DEFINITIONS = Object.freeze({
  [STEPS.index]: Object.freeze({
    content: INDEX_CONTENT,
    actions: INDEX_ACTIONS
  }),
  [STEPS.time]: Object.freeze({
    content: TIME_CONTENT,
    actions: TIME_ACTIONS
  }),
  [STEPS.qrcode]: Object.freeze({
    content: QRCODE_CONTENT,
    actions: QRCODE_ACTIONS
  })
});

export const mountStepPage = (step) => {
  const page = PAGE_DEFINITIONS[step] ?? PAGE_DEFINITIONS[STEPS.index];

  renderPageShell({
    root: getRoot(),
    steps: createSteps(step),
    content: page.content,
    actions: page.actions,
    currentStep: step
  });
};
