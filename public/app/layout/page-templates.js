import { STEPS } from '../config/app-config.js';
import { renderPageShell } from './page-shell.js';

const STEP_TITLES = Object.freeze([
  '',
  '身份与链接',
  '时间模式',
  '二维码'
]);

const createSteps = (currentStep) => ([
  {
    number: 1,
    title: STEP_TITLES[1],
    description: currentStep > 1 ? '已完成' : '选择Human/Agent，并粘贴课程链接',
    state: currentStep === 1 ? 'active' : (currentStep > 1 ? 'done' : 'idle')
  },
  {
    number: 2,
    title: STEP_TITLES[2],
    description: currentStep > 2 ? '已完成' : '选择自动或手动签到时间',
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
      <section class="panel hero-panel">
        <div class="panel-header">
          <p class="panel-kicker">Step 1</p>
          <h2>先告诉我，您是？</h2>
        </div>

        <div class="identity-buttons" role="tablist" aria-label="身份选择">
          <button type="button" class="identity-btn" data-identity="human">人类（Human）</button>
          <button type="button" class="identity-btn" id="agentBtn" data-identity="agent">AI代理（Agent）</button>
        </div>

        <div class="identity-content expandable-section" id="humanContent" hidden>
          <div class="guide-list" role="list" aria-label="人工签到指引">
            <article class="guide-card" role="listitem">
              <div class="guide-card-index">01</div>
              <div class="guide-card-body">
                <div class="guide-card-meta">准备条件</div>
                <h3>先卡准签到时间</h3>
                <p>最佳签到时间窗口是课程结束前10分钟到课程结束时刻，例如20:00下课时，可优先考虑19:50到20:00。</p>
              </div>
            </article>

            <article class="guide-card" role="listitem">
              <div class="guide-card-index">02</div>
              <div class="guide-card-body">
                <div class="guide-card-meta">网络检查</div>
                <h3>确认连接到校园网络</h3>
                <p>网络环境需处于 <code>eduroam</code>、<code>UNNC-Living</code> 或 <code>UNNC_IPSec VPN</code> 之一。</p>
              </div>
            </article>

            <article class="guide-card" role="listitem">
              <div class="guide-card-index">03</div>
              <div class="guide-card-body">
                <div class="guide-card-meta">操作步骤</div>
                <h3>在手机浏览器里复制课程详情链接</h3>
                <p>用手机浏览器（如 Safari）打开 <a href="https://ccc.nottingham.edu.cn/study/" target="_blank" rel="noopener noreferrer">CCC课程页面</a>，不要用微信内置浏览器。</p>
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
          <p class="agent-hint">把这句话粘贴给你的Agent，TA会引导您在本地完成后续步骤。</p>
        </div>

        <div class="course-link-section expandable-section" id="courseLinkSection" hidden>
          <div class="course-link-header">
            <h3>粘贴「课程详情」链接</h3>
            <p>链接格式类似 <code>https://ccc.nottingham.edu.cn/study/home/details?id=xxxx</code>。</p>
          </div>

          <div class="course-link-input-wrap">
            <textarea id="urlInput" placeholder="https://ccc.nottingham.edu.cn/study/home/details?id=xxxx" aria-label="课程详情链接输入框"></textarea>
            <button type="button" class="button-secondary paste-btn" id="pasteUrlBtn">粘贴</button>
          </div>
          <p class="input-help">请直接粘贴完整链接，不要手动修改参数。</p>
        </div>
      </section>
    `;

const INDEX_ACTIONS = `
  <div class="actions actions-end">
    <button type="button" id="nextBtn" class="button-primary">下一步：时间模式</button>
  </div>
`;

const TIME_CONTENT = `
      <section class="panel panel-slim" hidden aria-hidden="true">
        <div class="summary-grid">
          <article class="summary-card">
            <span>当前身份</span>
            <strong id="identityPreview"></strong>
          </article>
          <article class="summary-card">
            <span>课程链接</span>
            <strong id="linkPreview" class="summary-break"></strong>
          </article>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <p class="panel-kicker">Step 2</p>
          <h2>选择时间模式</h2>
        </div>

        <div class="radio-grid" role="radiogroup" aria-label="时间模式选择">
          <label class="choice-card">
            <input type="radio" name="mode" value="auto" />
            <div>
              <strong>自动（推荐）</strong>
              <small>适合绝大多数情况，生成时自动带入当前时间。</small>
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

        <div id="manualTime" class="time-grid" hidden>
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
    <button type="button" id="nextBtn" class="button-primary">下一步：生成二维码</button>
  </div>
`;

const QRCODE_CONTENT = `
      <section class="panel panel-slim" hidden aria-hidden="true">
        <div class="summary-grid summary-grid-wide">
          <article class="summary-card">
            <span>当前身份</span>
            <strong id="summaryIdentity"></strong>
          </article>
          <article class="summary-card">
            <span>时间模式</span>
            <strong id="summaryMode"></strong>
          </article>
          <article class="summary-card">
            <span>课程链接</span>
            <strong id="summaryUrl" class="summary-break"></strong>
          </article>
        </div>
      </section>

      <div id="qrcode" class="qrcode-stage" aria-label="生成的二维码热敏小票">
        <div class="qrcode-placeholder">
          <div>二维码将在这里生成</div>
        </div>
      </div>
    `;

const QRCODE_ACTIONS = `
  <div class="actions">
    <button type="button" id="backBtn" class="button-secondary">返回上一步</button>
    <button type="button" id="restartBtn" class="button-secondary">重新开始</button>
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
    actions: page.actions
  });
};
