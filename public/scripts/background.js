const root = document.documentElement;

const applyBackground = () => {
  if (document.querySelector('.background-orbs')) {
    return;
  }

  const layer = document.createElement('div');
  layer.className = 'background-orbs';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `
    <span class="background-aura"></span>
    <span class="background-core"></span>
  `;
  document.body.prepend(layer);
};

const bindPointerTracking = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  let currentX = 0.5;
  let currentY = 0.5;
  let targetX = 0.5;
  let targetY = 0.5;
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let currentPointerX = pointerX;
  let currentPointerY = pointerY;
  let lastMoveTime = performance.now();
  let lastEventX = pointerX;
  let lastEventY = pointerY;
  let movementEnergy = 0;
  let currentExpanded = 0;
  let currentEnergy = 0;
  let frameId = 0;

  const syncVars = () => {
    const idleMs = performance.now() - lastMoveTime;
    const expanded = currentExpanded;
    const driftPhase = idleMs / 520;
    const auraShiftX = Math.sin(driftPhase) * 36 * expanded;
    const auraShiftY = Math.cos(driftPhase * 0.82) * 28 * expanded;
    const coreScale = 1.02 - expanded * 0.44;
    const auraScale = 0.82 + expanded * 1.5;
    const coreBlur = 8 + expanded * 14;
    const auraBlur = 24 + expanded * 52;
    const coreOpacity = 0.46 - expanded * 0.34 + currentEnergy * 0.07;
    const auraOpacity = 0.1 + expanded * 0.24;

    root.style.setProperty('--mouse-x', currentX.toFixed(4));
    root.style.setProperty('--mouse-y', currentY.toFixed(4));
    root.style.setProperty('--pointer-x', `${currentPointerX.toFixed(1)}px`);
    root.style.setProperty('--pointer-y', `${currentPointerY.toFixed(1)}px`);
    root.style.setProperty('--pointer-offset-x', `${(currentPointerX - window.innerWidth / 2).toFixed(1)}px`);
    root.style.setProperty('--pointer-offset-y', `${(currentPointerY - window.innerHeight / 2).toFixed(1)}px`);
    root.style.setProperty('--core-scale', coreScale.toFixed(3));
    root.style.setProperty('--core-blur', `${coreBlur.toFixed(1)}px`);
    root.style.setProperty('--core-opacity', Math.max(0.03, Math.min(coreOpacity, 0.52)).toFixed(3));
    root.style.setProperty('--aura-scale', auraScale.toFixed(3));
    root.style.setProperty('--aura-blur', `${auraBlur.toFixed(1)}px`);
    root.style.setProperty('--aura-opacity', auraOpacity.toFixed(3));
    root.style.setProperty('--aura-shift-x', `${auraShiftX.toFixed(1)}px`);
    root.style.setProperty('--aura-shift-y', `${auraShiftY.toFixed(1)}px`);
  };

  const render = () => {
    const idleMs = performance.now() - lastMoveTime;
    const pointerEase = idleMs < 120 ? 0.34 : idleMs < 260 ? 0.2 : 0.075;
    const targetExpanded = Math.min(Math.max((idleMs - 40) / 520, 0), 1);

    currentX += (targetX - currentX) * 0.18;
    currentY += (targetY - currentY) * 0.18;
    currentPointerX += (pointerX - currentPointerX) * pointerEase;
    currentPointerY += (pointerY - currentPointerY) * pointerEase;
    movementEnergy *= 0.96;
    currentEnergy += (movementEnergy - currentEnergy) * 0.08;
    currentExpanded += (targetExpanded - currentExpanded) * 0.07;
    syncVars();

    if (
      Math.abs(targetX - currentX) > 0.0002 ||
      Math.abs(targetY - currentY) > 0.0002 ||
      Math.abs(pointerX - currentPointerX) > 0.12 ||
      Math.abs(pointerY - currentPointerY) > 0.12 ||
      Math.abs(targetExpanded - currentExpanded) > 0.002 ||
      currentEnergy > 0.01 ||
      performance.now() - lastMoveTime < 980
    ) {
      frameId = window.requestAnimationFrame(render);
      return;
    }

    frameId = 0;
  };

  const updateTarget = (clientX, clientY) => {
    targetX = clientX / window.innerWidth;
    targetY = clientY / window.innerHeight;
    pointerX = clientX;
    pointerY = clientY;
    if (!frameId) {
      frameId = window.requestAnimationFrame(render);
    }
  };

  window.addEventListener('pointermove', (event) => {
    const deltaX = event.clientX - lastEventX;
    const deltaY = event.clientY - lastEventY;
    movementEnergy = Math.min(Math.hypot(deltaX, deltaY) / 36, 1);
    lastEventX = event.clientX;
    lastEventY = event.clientY;
    lastMoveTime = performance.now();
    updateTarget(event.clientX, event.clientY);
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    movementEnergy = 0;
  }, { passive: true });

  window.addEventListener('resize', () => {
    currentPointerX = Math.min(currentPointerX, window.innerWidth);
    currentPointerY = Math.min(currentPointerY, window.innerHeight);
    pointerX = currentPointerX;
    pointerY = currentPointerY;
    targetX = pointerX / window.innerWidth;
    targetY = pointerY / window.innerHeight;
    syncVars();
  }, { passive: true });

  syncVars();
};

document.addEventListener('DOMContentLoaded', () => {
  applyBackground();
  bindPointerTracking();
});
