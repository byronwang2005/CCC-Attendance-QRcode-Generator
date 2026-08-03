import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { STORAGE_KEY } from './config';

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
