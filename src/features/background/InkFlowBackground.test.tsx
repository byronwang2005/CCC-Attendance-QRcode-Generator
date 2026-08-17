import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { InkFlowBackground } from './InkFlowBackground';

describe('InkFlowBackground', () => {
  afterEach(cleanup);

  it('stays decorative and degrades cleanly when WebGL2 is unavailable', () => {
    const { container } = render(<InkFlowBackground step={1} />);
    const layer = container.querySelector('.ink-flow-layer');
    const canvas = container.querySelector('canvas');

    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(canvas).toHaveClass('ink-flow-layer__canvas');
    expect(container).toHaveTextContent('');
  });
});
