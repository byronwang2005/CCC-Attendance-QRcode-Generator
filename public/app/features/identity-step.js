import {
  AGENT_PROMPT,
  bindCopyButton,
  initStepNavigation,
  loadState,
  readPageMessage,
  saveState,
  showToast,
  validateCourseUrl
} from '../shared/wizard.js';
import { APP_PATHS, IDENTITIES, TEXT } from '../config/app-config.js';
import { transitionExpandableSection } from '../shared/expandable-section.js';

export const initIndexPage = () => {
  readPageMessage();

  const state = loadState();
  const identityButtons = Array.from(document.querySelectorAll('.identity-btn'));
  const humanContent = document.getElementById('humanContent');
  const agentContent = document.getElementById('agentContent');
  const urlInput = document.getElementById('urlInput');
  const nextBtn = document.getElementById('nextBtn');
  initStepNavigation(1);
  let selectedIdentity = '';
  let identityTransitionId = 0;

  const getVisibleSections = () => [humanContent, agentContent].filter((section) => section && !section.hidden);

  const getTargetSections = (identity) => {
    if (identity === IDENTITIES.human) {
      return [humanContent];
    }

    if (identity === IDENTITIES.agent) {
      return [agentContent];
    }

    return [];
  };

  const applyIdentity = async (identity, { persist = true, animate = true } = {}) => {
    const nextIdentity = identity === IDENTITIES.agent || identity === IDENTITIES.human ? identity : '';
    const transitionId = identityTransitionId + 1;
    identityTransitionId = transitionId;
    selectedIdentity = nextIdentity;
    identityButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.identity === nextIdentity);
    });
    if (persist) {
      saveState({ identity: nextIdentity });
    }
    syncNextButtonState();

    const visibleSections = getVisibleSections();
    const targetSections = getTargetSections(nextIdentity);

    if (!animate) {
      await Promise.all([
        transitionExpandableSection(humanContent, targetSections.includes(humanContent), { animate: false }),
        transitionExpandableSection(agentContent, targetSections.includes(agentContent), { animate: false })
      ]);
      return;
    }

    await Promise.all(
      visibleSections
        .filter((section) => !targetSections.includes(section))
        .map((section) => transitionExpandableSection(section, false, { animate: true }))
    );

    if (identityTransitionId !== transitionId) {
      return;
    }

    if (identityTransitionId !== transitionId) {
      return;
    }

    await Promise.all(targetSections.map((section) => transitionExpandableSection(section, true, { animate: true })));
  };

  const setNextButtonDisabled = (isDisabled) => {
    nextBtn.disabled = isDisabled;
    nextBtn.classList.toggle('is-disabled', isDisabled);
    nextBtn.setAttribute('aria-disabled', String(isDisabled));
  };

  const syncNextButtonState = () => {
    const needsCourseLink = selectedIdentity === IDENTITIES.human;
    setNextButtonDisabled(!needsCourseLink || !urlInput.value.trim());
  };

  urlInput.value = state.url;
  applyIdentity(state.identity, { persist: false, animate: false });
  syncNextButtonState();

  identityButtons.forEach((button) => {
    button.addEventListener('click', () => applyIdentity(button.dataset.identity));
  });

  document.querySelectorAll('.agent-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      applyIdentity('agent');
    });
  });

  bindCopyButton(document.getElementById('copyAgentText'), AGENT_PROMPT);

  urlInput.addEventListener('input', () => {
    saveState({ url: urlInput.value.trim() });
    syncNextButtonState();
  });

  nextBtn.addEventListener('click', () => {
    if (!selectedIdentity) {
      showToast(TEXT.errors.chooseIdentityFirst, 'error');
      return;
    }

    if (selectedIdentity !== IDENTITIES.human) {
      return;
    }

    const url = urlInput.value.trim();
    const validation = validateCourseUrl(url);
    if (!validation.valid) {
      showToast(validation.message, 'error');
      urlInput.focus();
      return;
    }

    saveState({ url: validation.normalizedUrl, identity: selectedIdentity });
    window.location.href = APP_PATHS.time;
  });
};
