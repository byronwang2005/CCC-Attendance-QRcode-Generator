import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('CCC Attendance first step', () => {
  afterEach(() => {
    cleanup();
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
});
