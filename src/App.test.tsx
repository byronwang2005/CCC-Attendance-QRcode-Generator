import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { STORAGE_KEY } from './config';
import { EXPAND_DURATION } from './lib/expandable-section';

const originalAnimate = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate');

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
  });

  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/index.html?step=1');
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

  it('preserves the agent prompt and keeps the next action unavailable', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'CCC Attendance' }, { timeout: 2000 })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'AI代理' }));

    expect(await screen.findByText(/Please read the instruction/)).toBeVisible();
    expect(screen.getByRole('button', { name: '下一步' })).toBeDisabled();
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

    await user.click(screen.getByRole('button', { name: 'AI代理' }));
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
    await user.click(screen.getByRole('button', { name: 'AI代理' }));
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
