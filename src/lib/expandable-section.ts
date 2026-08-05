export const EXPAND_DURATION = 520;
export const COLLAPSE_DURATION = 420;
export const IOS_SPRING_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const FADE_EASING = 'cubic-bezier(0.2, 0, 0, 1)';
const TRANSITION_SETTLE_GRACE_MS = 100;

type ActiveTransition = {
  cancel: () => void;
};

type InterruptedState = {
  height: string;
  opacity: string;
  transform: string;
};

const activeTransitions = new WeakMap<HTMLElement, ActiveTransition>();

const shouldReduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const supportsWebAnimations = (element: HTMLElement) => typeof element.animate === 'function';

const getContentHeight = (element: HTMLElement) => element.scrollHeight;

const getCurrentHeight = (element: HTMLElement) => element.getBoundingClientRect().height;

const finishInstantly = (element: HTMLElement, shouldShow: boolean) => {
  activeTransitions.get(element)?.cancel();
  activeTransitions.delete(element);
  element.hidden = !shouldShow;
  element.classList.toggle('is-expanded', shouldShow);
  element.style.height = '';
  element.style.opacity = '';
  element.style.transform = '';
  element.style.overflow = '';
};

const cancelActiveTransition = (element: HTMLElement): InterruptedState | null => {
  const transition = activeTransitions.get(element);
  if (!transition) return null;

  const styles = window.getComputedStyle(element);
  const snapshot = {
    height: styles.height,
    opacity: styles.opacity,
    transform: styles.transform === 'none' ? '' : styles.transform
  };
  transition.cancel();
  activeTransitions.delete(element);
  element.style.height = snapshot.height;
  element.style.opacity = snapshot.opacity;
  element.style.transform = snapshot.transform;
  return snapshot;
};

const createTransition = (
  element: HTMLElement,
  animations: Animation[],
  duration: number,
  onFinish: () => void
) => {
  let isSettled = false;
  let resolveTransition = () => {};

  const settle = () => {
    if (isSettled) return;

    isSettled = true;
    window.clearTimeout(settleTimer);
    animations.forEach((animation) => animation.cancel());
    activeTransitions.delete(element);
    onFinish();
    resolveTransition();
  };

  const transition: ActiveTransition = {
    cancel() {
      if (isSettled) return;

      isSettled = true;
      window.clearTimeout(settleTimer);
      animations.forEach((animation) => animation.cancel());
      resolveTransition();
    }
  };

  activeTransitions.set(element, transition);
  const settleTimer = window.setTimeout(() => {
    if (activeTransitions.get(element) === transition) settle();
  }, duration + TRANSITION_SETTLE_GRACE_MS);

  const finished = Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  finished.then(() => {
    if (activeTransitions.get(element) === transition) settle();
  });

  return new Promise<void>((resolve) => {
    resolveTransition = resolve;
  });
};

export const transitionExpandableSection = (
  element: HTMLElement | null,
  shouldShow: boolean,
  { animate = true }: { animate?: boolean } = {}
) => {
  if (!element) return Promise.resolve();

  const interruptedState = cancelActiveTransition(element);

  if (!animate || shouldReduceMotion() || !supportsWebAnimations(element)) {
    finishInstantly(element, shouldShow);
    return Promise.resolve();
  }

  if (!interruptedState && shouldShow && !element.hidden && element.classList.contains('is-expanded')) {
    element.style.height = '';
    element.style.opacity = '';
    element.style.transform = '';
    element.style.overflow = '';
    return Promise.resolve();
  }

  if (!shouldShow && element.hidden) return Promise.resolve();

  if (shouldShow) {
    element.hidden = false;
    element.style.overflow = 'clip';
    const startHeight = interruptedState ? getCurrentHeight(element) : 0;
    const startOpacity = interruptedState?.opacity ?? 0;
    const startTransform = interruptedState?.transform || 'translateY(-10px)';
    element.style.height = 'auto';
    const targetHeight = getContentHeight(element);
    element.style.height = `${startHeight}px`;
    element.classList.remove('is-expanded');

    const heightAnimation = element.animate([
      { height: `${startHeight}px` },
      { height: `${targetHeight}px` }
    ], {
      duration: EXPAND_DURATION,
      easing: IOS_SPRING_EASING,
      fill: 'forwards'
    });

    const presenceAnimation = element.animate([
      { opacity: startOpacity, transform: startTransform },
      { opacity: 1, transform: 'translateY(2px)', offset: 0.72 },
      { opacity: 1, transform: 'translateY(0)' }
    ], {
      duration: EXPAND_DURATION,
      easing: IOS_SPRING_EASING,
      fill: 'forwards'
    });

    return createTransition(element, [heightAnimation, presenceAnimation], EXPAND_DURATION, () => {
      element.classList.add('is-expanded');
      element.style.height = '';
      element.style.opacity = '';
      element.style.transform = '';
      element.style.overflow = '';
    });
  }

  const startHeight = getCurrentHeight(element) || getContentHeight(element);
  const startOpacity = interruptedState?.opacity ?? 1;
  const startTransform = interruptedState?.transform || 'translateY(0)';
  element.style.overflow = 'clip';
  element.style.height = `${startHeight}px`;
  element.classList.add('is-expanded');

  const heightAnimation = element.animate([
    { height: `${startHeight}px` },
    { height: '0px' }
  ], {
    duration: COLLAPSE_DURATION,
    easing: IOS_SPRING_EASING,
    fill: 'forwards'
  });

  const presenceAnimation = element.animate([
    { opacity: startOpacity, transform: startTransform },
    { opacity: 0, transform: 'translateY(-6px)' }
  ], {
    duration: COLLAPSE_DURATION * 0.78,
    easing: FADE_EASING,
    fill: 'forwards'
  });

  return createTransition(element, [heightAnimation, presenceAnimation], COLLAPSE_DURATION, () => {
    element.hidden = true;
    element.classList.remove('is-expanded');
    element.style.height = '';
    element.style.opacity = '';
    element.style.transform = '';
    element.style.overflow = '';
  });
};
