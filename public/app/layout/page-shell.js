const FOOTER_HTML = `
  <footer class="site-footer">
    <img src="assets/images/ccc-small.webp" class="site-footer__logo" alt="CCC">
    <div class="site-footer__copy">
      <p>
        This software is open-sourced under the
        <a href="https://github.com/byronwang2005/CCC-Attendance/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT License</a>, with the source code available on
        <a href="https://github.com/byronwang2005/CCC-Attendance" target="_blank" rel="noopener noreferrer">GitHub Repository</a>.
      </p>
    </div>
  </footer>
`;

const renderStepCard = (step) => {
  const classes = ['step-card'];
  if (step.state === 'active') {
    classes.push('is-active');
  }
  if (step.state === 'done') {
    classes.push('is-done');
  }

  const ariaCurrent = step.state === 'active' ? ' aria-current="step"' : '';
  const stepLabel = String(step.number).padStart(2, '0');

  return `
    <article class="${classes.join(' ')}" data-step="${step.number}"${ariaCurrent}>
      <span class="step-number">${stepLabel}</span>
      <div>
        <strong>${step.title}</strong>
        <small>${step.description}</small>
      </div>
    </article>
  `;
};

const renderStepper = (steps) => `
  <section class="stepper" aria-label="步骤进度">
    ${steps.map(renderStepCard).join('')}
  </section>
`;

export const renderPageShell = ({ root, steps, content, actions = '', currentStep }) => {
  if (!root) {
    throw new Error('Missing app root for page shell rendering.');
  }

  root.innerHTML = `
    <div class="app-stage" data-step="${currentStep}">
      <div class="cursor-layer" aria-hidden="true" data-cursor-layer>
        <canvas class="cursor-layer__canvas" data-cursor-canvas></canvas>
      </div>
      <div class="page-shell">
        <header class="masthead" aria-label="站点抬头">
          <div class="masthead__copy">
            <h1 class="masthead__title">CCC Attendance</h1>
            <p class="masthead__summary">一个签到码，三步搞定</p>
          </div>
          ${renderStepper(steps)}
        </header>
        <main class="wizard-layout">
          ${content}
          ${actions}
        </main>
        ${FOOTER_HTML}
        <div id="toast" class="toast" role="alert" aria-live="polite"></div>
      </div>
    </div>
  `;
};
