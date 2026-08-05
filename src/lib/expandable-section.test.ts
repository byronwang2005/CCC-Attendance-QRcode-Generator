import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COLLAPSE_DURATION,
  EXPAND_DURATION,
  FADE_EASING,
  IOS_SPRING_EASING,
  transitionExpandableSection
} from './expandable-section';

type AnimationStub = Animation & {
  cancel: ReturnType<typeof vi.fn>;
};

const setReducedMotion = (matches: boolean) => {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: query === '(prefers-reduced-motion: reduce)' && matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
};

const createAnimation = (finished: Promise<unknown> = Promise.resolve()): AnimationStub => ({
  cancel: vi.fn(),
  finished
}) as unknown as AnimationStub;

const createSection = ({
  hidden,
  height,
  scrollHeight
}: {
  hidden: boolean;
  height: number;
  scrollHeight: number;
}) => {
  const element = document.createElement('div');
  element.hidden = hidden;
  element.classList.toggle('is-expanded', !hidden);
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: scrollHeight });
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ height } as DOMRect);
  return element;
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('transitionExpandableSection', () => {
  it('restores the iOS expand curve, duration, and overshoot keyframes', async () => {
    setReducedMotion(false);
    const element = createSection({ hidden: true, height: 0, scrollHeight: 240 });
    const animations = [createAnimation(), createAnimation()];
    const animate = vi.fn()
      .mockReturnValueOnce(animations[0])
      .mockReturnValueOnce(animations[1]);
    Object.defineProperty(element, 'animate', { configurable: true, value: animate });

    await transitionExpandableSection(element, true);

    expect(animate).toHaveBeenNthCalledWith(1, [
      { height: '0px' },
      { height: '240px' }
    ], {
      duration: EXPAND_DURATION,
      easing: IOS_SPRING_EASING,
      fill: 'forwards'
    });
    expect(animate).toHaveBeenNthCalledWith(2, [
      { opacity: 0, transform: 'translateY(-10px)' },
      { opacity: 1, transform: 'translateY(2px)', offset: 0.72 },
      { opacity: 1, transform: 'translateY(0)' }
    ], {
      duration: EXPAND_DURATION,
      easing: IOS_SPRING_EASING,
      fill: 'forwards'
    });
    expect(element).not.toHaveAttribute('hidden');
    expect(element).toHaveClass('is-expanded');
    expect(element.style.height).toBe('');
  });

  it('uses the original collapse timing and separate fade curve', async () => {
    setReducedMotion(false);
    const element = createSection({ hidden: false, height: 180, scrollHeight: 180 });
    const animate = vi.fn()
      .mockReturnValueOnce(createAnimation())
      .mockReturnValueOnce(createAnimation());
    Object.defineProperty(element, 'animate', { configurable: true, value: animate });

    await transitionExpandableSection(element, false);

    expect(animate).toHaveBeenNthCalledWith(1, [
      { height: '180px' },
      { height: '0px' }
    ], {
      duration: COLLAPSE_DURATION,
      easing: IOS_SPRING_EASING,
      fill: 'forwards'
    });
    expect(animate).toHaveBeenNthCalledWith(2, [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-6px)' }
    ], {
      duration: COLLAPSE_DURATION * 0.78,
      easing: FADE_EASING,
      fill: 'forwards'
    });
    expect(element).toHaveAttribute('hidden');
    expect(element).not.toHaveClass('is-expanded');
  });

  it('forces a stalled expansion to settle after the animation deadline', async () => {
    vi.useFakeTimers();
    setReducedMotion(false);
    const element = createSection({ hidden: true, height: 0, scrollHeight: 240 });
    const stalled = new Promise<void>(() => {});
    const animate = vi.fn(() => createAnimation(stalled));
    Object.defineProperty(element, 'animate', { configurable: true, value: animate });

    let settled = false;
    const transition = transitionExpandableSection(element, true).then(() => {
      settled = true;
    });

    expect(element).not.toHaveAttribute('hidden');
    expect(element.style.height).toBe('0px');
    expect(element.style.overflow).toBe('clip');
    await vi.advanceTimersByTimeAsync(EXPAND_DURATION + 99);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
    await transition;
    expect(element).toHaveClass('is-expanded');
    expect(element.style.height).toBe('');
    expect(element.style.opacity).toBe('');
    expect(element.style.transform).toBe('');
    expect(element.style.overflow).toBe('');
    expect(animate.mock.results.every(({ value }) => value.cancel.mock.calls.length === 1)).toBe(true);
  });

  it('forces a stalled collapse to settle after the animation deadline', async () => {
    vi.useFakeTimers();
    setReducedMotion(false);
    const element = createSection({ hidden: false, height: 180, scrollHeight: 180 });
    const stalled = new Promise<void>(() => {});
    const animate = vi.fn(() => createAnimation(stalled));
    Object.defineProperty(element, 'animate', { configurable: true, value: animate });

    let settled = false;
    const transition = transitionExpandableSection(element, false).then(() => {
      settled = true;
    });

    expect(element).not.toHaveAttribute('hidden');
    expect(element.style.height).toBe('180px');
    expect(element.style.overflow).toBe('clip');
    await vi.advanceTimersByTimeAsync(COLLAPSE_DURATION + 99);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
    await transition;
    expect(element).toHaveAttribute('hidden');
    expect(element).not.toHaveClass('is-expanded');
    expect(element.style.height).toBe('');
    expect(element.style.opacity).toBe('');
    expect(element.style.transform).toBe('');
    expect(element.style.overflow).toBe('');
    expect(animate.mock.results.every(({ value }) => value.cancel.mock.calls.length === 1)).toBe(true);
  });

  it('clears the stalled transition deadline when a new state interrupts it', async () => {
    vi.useFakeTimers();
    setReducedMotion(false);
    const element = createSection({ hidden: true, height: 84, scrollHeight: 240 });
    const stalled = new Promise<void>(() => {});
    const firstAnimations = [createAnimation(stalled), createAnimation(stalled)];
    const reverseAnimations = [createAnimation(), createAnimation()];
    const animate = vi.fn()
      .mockReturnValueOnce(firstAnimations[0])
      .mockReturnValueOnce(firstAnimations[1])
      .mockReturnValueOnce(reverseAnimations[0])
      .mockReturnValueOnce(reverseAnimations[1]);
    Object.defineProperty(element, 'animate', { configurable: true, value: animate });

    const expanding = transitionExpandableSection(element, true);
    expect(vi.getTimerCount()).toBe(1);

    const collapsing = transitionExpandableSection(element, false);
    expect(firstAnimations[0].cancel).toHaveBeenCalledOnce();
    expect(firstAnimations[1].cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(1);

    await Promise.all([expanding, collapsing]);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(EXPAND_DURATION + 100);
    expect(element).toHaveAttribute('hidden');
    expect(element).not.toHaveClass('is-expanded');
  });

  it('cancels an interrupted transition and continues from the visual snapshot', async () => {
    setReducedMotion(false);
    const element = createSection({ hidden: true, height: 84, scrollHeight: 240 });
    let resolveFirstAnimations = () => {};
    const firstFinished = new Promise<void>((resolve) => {
      resolveFirstAnimations = resolve;
    });
    const firstAnimations = [
      createAnimation(firstFinished),
      createAnimation(firstFinished)
    ];
    const reverseAnimations = [createAnimation(), createAnimation()];
    const animate = vi.fn()
      .mockReturnValueOnce(firstAnimations[0])
      .mockReturnValueOnce(firstAnimations[1])
      .mockReturnValueOnce(reverseAnimations[0])
      .mockReturnValueOnce(reverseAnimations[1]);
    Object.defineProperty(element, 'animate', { configurable: true, value: animate });
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      height: '84px',
      opacity: '0.4',
      transform: 'matrix(1, 0, 0, 1, 0, -4)'
    } as CSSStyleDeclaration);

    const expanding = transitionExpandableSection(element, true);
    const collapsing = transitionExpandableSection(element, false);
    await collapsing;
    resolveFirstAnimations();
    await expanding;

    expect(firstAnimations[0].cancel).toHaveBeenCalledOnce();
    expect(firstAnimations[1].cancel).toHaveBeenCalledOnce();
    expect(animate).toHaveBeenNthCalledWith(3, [
      { height: '84px' },
      { height: '0px' }
    ], expect.objectContaining({
      duration: COLLAPSE_DURATION,
      easing: IOS_SPRING_EASING
    }));
    expect(animate).toHaveBeenNthCalledWith(4, [
      { opacity: '0.4', transform: 'matrix(1, 0, 0, 1, 0, -4)' },
      { opacity: 0, transform: 'translateY(-6px)' }
    ], expect.objectContaining({
      easing: FADE_EASING
    }));
  });

  it('finishes immediately when reduced motion is requested', async () => {
    setReducedMotion(true);
    const element = createSection({ hidden: true, height: 0, scrollHeight: 240 });
    const animate = vi.fn();
    Object.defineProperty(element, 'animate', { configurable: true, value: animate });

    await transitionExpandableSection(element, true);

    expect(animate).not.toHaveBeenCalled();
    expect(element).not.toHaveAttribute('hidden');
    expect(element).toHaveClass('is-expanded');
  });
});
