import {
  AGENT_PROMPT,
  bindCopyButton,
  initHeaderTypewriter,
  initStepNavigation,
  loadState,
  readPageMessage,
  saveState,
  showToast,
  validateCourseUrl
} from './wizard.js';
import { APP_PATHS, IDENTITIES, TEXT } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  initHeaderTypewriter();
  readPageMessage();

  const state = loadState();
  const identityButtons = Array.from(document.querySelectorAll('.identity-btn'));
  const humanContent = document.getElementById('humanContent');
  const agentContent = document.getElementById('agentContent');
  const courseLinkSection = document.getElementById('courseLinkSection');
  const urlInput = document.getElementById('urlInput');
  const nextBtn = document.getElementById('nextBtn');
  initStepNavigation(1);
  let selectedIdentity = '';
  let identityTransitionId = 0;

  const transitionSection = (element, shouldShow, { animate = true } = {}) => {
    if (!element) {
      return Promise.resolve();
    }

    if (!animate) {
      element.hidden = !shouldShow;
      element.classList.toggle('is-expanded', shouldShow);
      element.style.height = '';
      return Promise.resolve();
    }

    if (shouldShow) {
      if (!element.hidden && element.classList.contains('is-expanded')) {
        element.style.height = '';
        return Promise.resolve();
      }

      element.hidden = false;
      element.style.height = '0px';
      element.classList.remove('is-expanded');

      return new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          const targetHeight = element.scrollHeight;
          element.style.height = `${targetHeight}px`;
          element.classList.add('is-expanded');

          const handleExpandEnd = (event) => {
            if (event.propertyName !== 'height') {
              return;
            }

            element.style.height = '';
            element.removeEventListener('transitionend', handleExpandEnd);
            resolve();
          };

          element.addEventListener('transitionend', handleExpandEnd);
        });
      });
    }

    if (element.hidden) {
      return Promise.resolve();
    }

    element.style.height = `${element.scrollHeight}px`;
    element.classList.add('is-expanded');

    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        element.style.height = '0px';
        element.classList.remove('is-expanded');
      });

      const handleCollapseEnd = (event) => {
        if (event.propertyName !== 'height') {
          return;
        }

        element.hidden = true;
        element.classList.remove('is-expanded');
        element.style.height = '';
        element.removeEventListener('transitionend', handleCollapseEnd);
        resolve();
      };

      element.addEventListener('transitionend', handleCollapseEnd);
    });
  };

  const getVisibleSections = () => [humanContent, agentContent, courseLinkSection].filter((section) => section && !section.hidden);

  const getTargetSections = (identity) => {
    if (identity === IDENTITIES.human) {
      return [humanContent, courseLinkSection];
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
        transitionSection(humanContent, targetSections.includes(humanContent), { animate: false }),
        transitionSection(agentContent, targetSections.includes(agentContent), { animate: false }),
        transitionSection(courseLinkSection, targetSections.includes(courseLinkSection), { animate: false })
      ]);
      return;
    }

    await Promise.all(
      visibleSections
        .filter((section) => !targetSections.includes(section))
        .map((section) => transitionSection(section, false, { animate: true }))
    );

    if (identityTransitionId !== transitionId) {
      return;
    }

    for (const section of targetSections) {
      if (identityTransitionId !== transitionId) {
        return;
      }

      await transitionSection(section, true, { animate: true });
    }
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

    saveState({ url, identity: selectedIdentity });
    window.location.href = APP_PATHS.time;
  });
});
