import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { STORAGE_KEY } from './config';
import { EXPAND_DURATION } from './lib/expandable-section';

const originalAnimate = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate');
const originalStartViewTransition = Object.getOwnPropertyDescriptor(document, 'startViewTransition');

const installViewTransitionMock = () => {
  const transitions: Array<{
    resolve: () => void;
    skipTransition: ReturnType<typeof vi.fn>;
  }> = [];
  const startViewTransition = vi.fn((update: ViewTransitionUpdateCallback) => {
    let resolve = () => {};
    const finished = new Promise<void>((done) => {
      resolve = done;
    });
    update();
    const skipTransition = vi.fn(() => resolve());
    transitions.push({ resolve, skipTransition });
    return {
      finished,
      ready: Promise.resolve(),
      skipTransition,
      updateCallbackDone: Promise.resolve()
    } as unknown as ViewTransition;
  });
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: startViewTransition
  });
  return { startViewTransition, transitions };
};

const validWizardState = {
  identity: 'human',
  url: 'https://ccc.nottingham.edu.cn/study/home/details?id=1234',
  timeMode: 'auto'
};

const expectSingleArtwork = async (caption: string, alt: string, src: string) => {
  expect(await screen.findByRole('figure', { name: caption }, { timeout: 2000 })).toBeVisible();
  expect(screen.getByRole('img', { name: alt })).toHaveAttribute('src', src);
  expect(document.querySelectorAll('.step-artwork')).toHaveLength(1);
};

describe('CCC Attendance first step', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalAnimate) {
      Object.defineProperty(HTMLElement.prototype, 'animate', originalAnimate);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'animate');
    }
    if (originalStartViewTransition) {
      Object.defineProperty(document, 'startViewTransition', originalStartViewTransition);
    } else {
      Reflect.deleteProperty(document, 'startViewTransition');
    }
    document.documentElement.removeAttribute('data-step-direction');
    document.documentElement.removeAttribute('data-step-transition');
  });

  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/index.html?step=1');
  });

  it('renders the global boot loader without glass material', () => {
    render(<App />);

    const loader = screen.getByLabelText('正在加载');
    expect(loader.querySelector('.boot-loader__panel')).not.toBeNull();
    expect(loader.querySelector('.glass-island')).toBeNull();
  });

  it('places the open-source metadata in the workflow with safe external links', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'CCC Attendance' }, { timeout: 2000 })).toBeVisible();

    const footer = screen.getByRole('contentinfo');
    const workflow = document.querySelector('.workflow-frame');
    const licenseLink = screen.getByRole('link', { name: 'MIT License' });
    const repositoryLink = screen.getByRole('link', { name: 'GitHub Repository' });

    expect(workflow).toContainElement(footer);
    expect(footer.querySelector('.glass-island')).toBeNull();
    expect(licenseLink).toHaveAttribute('href', 'https://github.com/byronwang2005/CCC-Attendance/blob/main/LICENSE');
    expect(repositoryLink).toHaveAttribute('href', 'https://github.com/byronwang2005/CCC-Attendance');
    for (const link of [licenseLink, repositoryLink]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('preserves the identity flow and enables the next action for a course link', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'CCC Attendance' }, { timeout: 2000 })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '人类' }));

    const input = screen.getByRole('textbox', { name: '课程详情链接输入框' });
    await user.type(input, 'https://ccc.nottingham.edu.cn/study/home/details?id=1234');

    expect(screen.getByRole('button', { name: '下一步' })).toBeEnabled();
    expect(screen.getByRole('heading', { name: '卡准时间' })).toBeVisible();
  });

  it('switches steps without remounting the global loader', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'CCC Attendance' }, { timeout: 2000 })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '人类' }));
    await user.type(
      screen.getByRole('textbox', { name: '课程详情链接输入框' }),
      'https://ccc.nottingham.edu.cn/study/home/details?id=1234'
    );
    await user.click(screen.getByRole('button', { name: '下一步' }));

    expect(await screen.findByRole('heading', { name: '选择时间模式' })).toBeVisible();
    expect(window.location.search).toBe('?step=2');
    expect(screen.queryByLabelText('正在加载')).not.toBeInTheDocument();
  });

  it('coordinates forward and backward navigation with one native view transition at a time', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validWizardState));
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    const { startViewTransition, transitions } = installViewTransitionMock();
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'CCC Attendance' }, { timeout: 2000 })).toBeVisible();
    expect(document.querySelector('.stepper')).toHaveAttribute('data-current-step', '1');
    expect(document.querySelectorAll('.stepper-active-indicator')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(await screen.findByRole('heading', { name: '选择时间模式' })).toBeVisible();
    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(document.documentElement).toHaveAttribute('data-step-direction', 'forward');
    expect(document.documentElement).toHaveAttribute('data-step-transition', 'native');
    expect(document.querySelector('.stepper')).toHaveAttribute('data-current-step', '2');

    await user.click(screen.getByRole('button', { name: '返回上一步' }));
    expect(await screen.findByRole('heading', { name: '先告诉我，您是？' })).toBeVisible();
    expect(startViewTransition).toHaveBeenCalledTimes(2);
    expect(transitions[0].skipTransition).toHaveBeenCalledOnce();
    expect(document.documentElement).toHaveAttribute('data-step-direction', 'backward');
    expect(document.querySelector('.stepper')).toHaveAttribute('data-current-step', '1');

    await act(async () => transitions[1].resolve());
    await waitFor(() => {
      expect(document.documentElement).not.toHaveAttribute('data-step-direction');
      expect(document.documentElement).not.toHaveAttribute('data-step-transition');
    });
  });

  it('uses the same directional transition for browser history navigation', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validWizardState));
    window.history.replaceState({}, '', '/index.html?step=2');
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    const { startViewTransition, transitions } = installViewTransitionMock();
    render(<App />);

    expect(await screen.findByRole('heading', { name: '选择时间模式' }, { timeout: 2000 })).toBeVisible();
    window.history.pushState({}, '', '/index.html?step=1');
    fireEvent(window, new PopStateEvent('popstate'));

    expect(await screen.findByRole('heading', { name: '先告诉我，您是？' })).toBeVisible();
    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(document.documentElement).toHaveAttribute('data-step-direction', 'backward');
    await act(async () => transitions[0].resolve());
  });

  it('changes steps immediately when reduced motion is enabled', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validWizardState));
    const { startViewTransition } = installViewTransitionMock();
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'CCC Attendance' }, { timeout: 2000 })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(await screen.findByRole('heading', { name: '选择时间模式' })).toBeVisible();
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement).not.toHaveAttribute('data-step-direction');
    expect(document.documentElement).not.toHaveAttribute('data-step-transition');
  });

  it('does not restart QR generation when the native step transition settles', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validWizardState));
    window.history.replaceState({}, '', '/index.html?step=2');
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));
    const { transitions } = installViewTransitionMock();
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: '选择时间模式' }, { timeout: 2000 })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '下一步' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await act(async () => transitions[0].resolve());
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('starts over from the QR step without showing a missing-prerequisite error', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validWizardState));
    window.history.replaceState({}, '', '/index.html?step=3');
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));
    let commitTransition = () => {};
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: vi.fn((update: ViewTransitionUpdateCallback) => {
        commitTransition = update;
        return {
          finished: Promise.resolve(),
          ready: Promise.resolve(),
          skipTransition: vi.fn(),
          updateCallbackDone: Promise.resolve()
        } as unknown as ViewTransition;
      })
    });
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('button', { name: '生成更多' }, { timeout: 2000 })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '生成更多' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await act(async () => commitTransition());

    expect(await screen.findByRole('heading', { name: '先告诉我，您是？' })).toBeVisible();
    expect(window.location.search).toBe('?step=1');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下一步' })).toBeDisabled();
  });

  it('preserves the agent prompt and keeps the next action unavailable', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'CCC Attendance' }, { timeout: 2000 })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '智能体' }));

    expect(await screen.findByText(/Please read the instruction/)).toBeVisible();
    expect(screen.getByRole('button', { name: '下一步' })).toBeDisabled();
  });

  it('keeps an error toast mounted until its exit animation completes', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'CCC Attendance' }, { timeout: 2000 })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '跳转到第 2 步' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).not.toHaveClass('is-exiting');

    await user.click(screen.getByRole('button', { name: '关闭提示' }));
    expect(dialog).toHaveClass('is-exiting');
    expect(dialog).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('keeps both identity sections mounted while switching their expandable state', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'CCC Attendance' }, { timeout: 2000 })).toBeVisible();
    const humanGuide = screen.getByRole('heading', { name: '卡准时间', hidden: true });
    const agentPrompt = screen.getByText(/Please read the instruction/);
    expect(humanGuide).not.toBeVisible();
    expect(agentPrompt).not.toBeVisible();

    await user.click(screen.getByRole('button', { name: '人类' }));
    expect(humanGuide).toBeVisible();
    expect(agentPrompt).not.toBeVisible();

    await user.click(screen.getByRole('button', { name: '智能体' }));
    expect(humanGuide).not.toBeVisible();
    expect(agentPrompt).toBeVisible();

    await user.click(screen.getByRole('button', { name: '人类' }));
    expect(humanGuide).toBeVisible();
    expect(agentPrompt).not.toBeVisible();
  });

  it('settles on the latest identity when a switch interrupts an active expansion', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    const pendingAnimations: Array<{
      animation: Animation & { cancel: ReturnType<typeof vi.fn> };
      resolve: () => void;
    }> = [];
    const animate = vi.fn(() => {
      let resolve = () => {};
      const finished = new Promise<void>((finish) => {
        resolve = finish;
      });
      const animation = {
        cancel: vi.fn(),
        finished
      } as unknown as Animation & { cancel: ReturnType<typeof vi.fn> };
      pendingAnimations.push({ animation, resolve });
      return animation;
    });
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      value: animate
    });

    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'CCC Attendance' }, { timeout: 2000 })).toBeVisible();

    await user.click(screen.getByRole('button', { name: '人类' }));
    await waitFor(() => expect(pendingAnimations).toHaveLength(2));
    await user.click(screen.getByRole('button', { name: '智能体' }));
    await waitFor(() => expect(pendingAnimations).toHaveLength(4));
    expect(pendingAnimations[0].animation.cancel).toHaveBeenCalledOnce();
    expect(pendingAnimations[1].animation.cancel).toHaveBeenCalledOnce();

    pendingAnimations[2].resolve();
    pendingAnimations[3].resolve();
    await waitFor(() => expect(pendingAnimations).toHaveLength(6));
    pendingAnimations[4].resolve();
    pendingAnimations[5].resolve();

    await waitFor(() => {
      expect(screen.getByText(/Please read the instruction/)).toBeVisible();
      expect(screen.getByRole('heading', { name: '卡准时间', hidden: true })).not.toBeVisible();
    });
  });

  it('uses the shared expandable state for automatic and manual time modes', async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      identity: 'human',
      url: 'https://ccc.nottingham.edu.cn/study/home/details?id=1234',
      timeMode: 'auto'
    }));
    window.history.replaceState({}, '', '/index.html?step=2');
    render(<App />);

    expect(await screen.findByRole('heading', { name: '选择时间模式' }, { timeout: 2000 })).toBeVisible();
    const dateSelect = document.getElementById('date');
    expect(dateSelect).toBeInstanceOf(HTMLSelectElement);
    expect(dateSelect).not.toBeVisible();

    await user.click(screen.getByText('手动', { selector: 'strong' }));
    expect(dateSelect).toBeVisible();

    await user.click(screen.getByText('自动（推荐）', { selector: 'strong' }));
    expect(dateSelect).not.toBeVisible();
  });

  it('settles on the latest time mode when switches interrupt active animations', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    const pendingAnimations: Array<{
      animation: Animation & { cancel: ReturnType<typeof vi.fn> };
      resolve: () => void;
    }> = [];
    const animate = vi.fn(() => {
      let resolve = () => {};
      const finished = new Promise<void>((finish) => {
        resolve = finish;
      });
      const animation = {
        cancel: vi.fn(),
        finished
      } as unknown as Animation & { cancel: ReturnType<typeof vi.fn> };
      pendingAnimations.push({ animation, resolve });
      return animation;
    });
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      value: animate
    });
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validWizardState));
    window.history.replaceState({}, '', '/index.html?step=2');
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: '选择时间模式' }, { timeout: 2000 })).toBeVisible();
    const manualTime = document.getElementById('manualTime');
    expect(manualTime).not.toBeNull();
    if (!manualTime) return;

    await user.click(screen.getByRole('radio', { name: /^手动/ }));
    await waitFor(() => expect(pendingAnimations).toHaveLength(2));
    await user.click(screen.getByRole('radio', { name: /^自动/ }));
    await waitFor(() => expect(pendingAnimations).toHaveLength(4));
    expect(pendingAnimations[0].animation.cancel).toHaveBeenCalledOnce();
    expect(pendingAnimations[1].animation.cancel).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('radio', { name: /^手动/ }));
    await waitFor(() => expect(pendingAnimations).toHaveLength(6));
    expect(pendingAnimations[2].animation.cancel).toHaveBeenCalledOnce();
    expect(pendingAnimations[3].animation.cancel).toHaveBeenCalledOnce();
    pendingAnimations[4].resolve();
    pendingAnimations[5].resolve();

    await waitFor(() => expect(manualTime).toHaveClass('is-expanded'));
    expect(screen.getByRole('radio', { name: /^手动/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^自动/ })).not.toBeChecked();
  });

  it('reveals every manual time control when browser animations never finish', async () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    const stalled = new Promise<void>(() => {});
    const animate = vi.fn(() => ({
      cancel: vi.fn(),
      finished: stalled
    }) as unknown as Animation);
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      value: animate
    });
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validWizardState));
    window.history.replaceState({}, '', '/index.html?step=2');
    render(<App />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(520);
    });
    expect(screen.getByRole('heading', { name: '选择时间模式' })).toBeVisible();

    const panel = document.querySelector<HTMLElement>('.time-panel');
    const manualTime = document.getElementById('manualTime');
    expect(panel).not.toBeNull();
    expect(manualTime).not.toBeNull();
    if (!panel || !manualTime) return;

    Object.defineProperties(panel, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 500 },
      scrollTop: { configurable: true, value: 24, writable: true }
    });
    Object.defineProperty(manualTime, 'offsetTop', { configurable: true, value: 360 });
    const scrollTo = vi.fn();
    panel.scrollTo = scrollTo;

    await act(async () => {
      fireEvent.click(screen.getByText('手动', { selector: 'strong' }));
      await Promise.resolve();
    });
    expect(animate).toHaveBeenCalledTimes(2);
    expect(manualTime.style.height).toBe('0px');
    expect(manualTime.style.overflow).toBe('clip');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(EXPAND_DURATION + 100);
    });

    expect(manualTime).toHaveClass('is-expanded');
    expect(manualTime.style.height).toBe('');
    expect(manualTime.style.overflow).toBe('');
    expect(screen.getByRole('combobox', { name: '日期' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: '时' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: '分' })).toBeVisible();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(panel.scrollTop).toBe(24);
  });

  it('leaves constrained task panel scrolling under user control', async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validWizardState));
    window.history.replaceState({}, '', '/index.html?step=2');
    render(<App />);

    expect(await screen.findByRole('heading', { name: '选择时间模式' }, { timeout: 2000 })).toBeVisible();
    const panel = document.querySelector<HTMLElement>('.time-panel');
    const manualTime = document.getElementById('manualTime');
    expect(panel).not.toBeNull();
    expect(manualTime).not.toBeNull();
    if (!panel || !manualTime) return;

    Object.defineProperties(panel, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 500 },
      scrollTop: { configurable: true, value: 24, writable: true }
    });
    Object.defineProperty(manualTime, 'offsetTop', { configurable: true, value: 360 });
    const scrollTo = vi.fn();
    panel.scrollTo = scrollTo;

    await user.click(screen.getByText('手动', { selector: 'strong' }));
    expect(document.getElementById('date')).toBeVisible();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(panel.scrollTop).toBe(24);

    await user.click(screen.getByText('自动（推荐）', { selector: 'strong' }));
    expect(document.getElementById('date')).not.toBeVisible();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(panel.scrollTop).toBe(24);
  });

  it('shows only the Dongqian Lake artwork on the first step', async () => {
    render(<App />);

    await expectSingleArtwork(
      '宁波东钱湖',
      '宁波东钱湖小普陀长堤纸本插图',
      '/assets/images/steps/step-01-dongqian-lake.png'
    );
  });

  it('shows only the West Lake artwork with three stone towers on the second step', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validWizardState));
    window.history.replaceState({}, '', '/index.html?step=2');
    render(<App />);

    await expectSingleArtwork(
      '杭州西湖',
      '杭州西湖三潭印月三座石塔纸本插图',
      '/assets/images/steps/step-02-west-lake.png'
    );
  });

  it('shows only the Nanhu artwork on the third step', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validWizardState));
    window.history.replaceState({}, '', '/index.html?step=3');
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));
    render(<App />);

    await expectSingleArtwork(
      '嘉兴南湖',
      '嘉兴南湖红船与烟雨楼纸本插图',
      '/assets/images/steps/step-03-nanhu.png'
    );
  });
});
