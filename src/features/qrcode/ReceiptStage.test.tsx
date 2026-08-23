import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReceiptStage, type ReceiptStageProps } from './ReceiptStage';

const createReceiptStageMock = vi.hoisted(() => vi.fn());

vi.mock('./receipt-stage', () => ({
  createReceiptStage: createReceiptStageMock
}));

const props: ReceiptStageProps = {
  imageUrl: 'blob:attendance-qr',
  generatedTime: '2026-08-23 18:30',
  validTime: '2026-08-23 18:31',
  identityLabel: 'Human',
  modeLabel: 'Auto',
  scheduleId: 'schedule-42',
  accentColor: '#6e6042',
  ambientColor: '#897b60'
};

describe('ReceiptStage', () => {
  afterEach(() => {
    cleanup();
    createReceiptStageMock.mockReset();
  });

  it('passes the synchronized gold theme into the Three.js stage and cleans it up', async () => {
    const destroy = vi.fn();
    createReceiptStageMock.mockResolvedValue({ destroy });
    const { container, unmount } = render(<ReceiptStage {...props} />);

    await waitFor(() => expect(createReceiptStageMock).toHaveBeenCalledOnce());
    expect(createReceiptStageMock.mock.calls[0][1]).toEqual(props);
    expect(container.querySelector('.receipt-stage-host')).toHaveAttribute('aria-hidden', 'true');

    unmount();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('falls back to the original QR image when WebGL initialization fails', async () => {
    createReceiptStageMock.mockRejectedValue(new Error('WebGL unavailable'));
    const { container } = render(<ReceiptStage {...props} />);

    await waitFor(() => expect(container.querySelector('.receipt-stage-fallback')).toBeInTheDocument());
    expect(container.querySelector('img')).toHaveAttribute('src', props.imageUrl);
    expect(container.querySelector('img')).toHaveAttribute('alt', 'Attendance QR Code');
    expect(container).toHaveTextContent('schedule-42');
    expect(container).toHaveTextContent('Human');
    expect(container).toHaveTextContent('VALID TIME');
  });
});
