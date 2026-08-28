import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

const readRule = (selector: string) => {
  const selectorIndex = styles.indexOf(selector);
  if (selectorIndex < 0) throw new Error(`Missing CSS selector: ${selector}`);
  const blockStart = styles.indexOf('{', selectorIndex);
  const blockEnd = styles.indexOf('}', blockStart);
  return styles.slice(blockStart + 1, blockEnd);
};

describe('glass animation contract', () => {
  it('keeps pressed glass surfaces at a stable size', () => {
    expect(readRule('.glass-island.is-refractive:active')).not.toContain('scale(');
    expect(readRule('.action-island.is-pearl.allows-motion:not(:has(:disabled)):active')).not.toContain('scale(');
  });

  it('keeps the main glass stationary while only fading step content', () => {
    const choreographyStart = styles.indexOf('/* Directional step choreography */');
    const choreographyEnd = styles.indexOf('/* QR result:', choreographyStart);
    const choreography = styles.slice(choreographyStart, choreographyEnd);

    expect(choreography).toContain('view-transition-name: wizard-content');
    expect(choreography).toContain('view-transition-name: wizard-actions');
    expect(choreography).not.toContain('wizard-glass');
    expect(choreography).toContain('@keyframes step-content-enter');
    expect(choreography).toContain('@keyframes step-content-exit');
    expect(choreography).not.toContain('scale(');
    expect(choreography).not.toContain('step-scene-enter-forward');
    expect(choreography).not.toContain('step-scene-enter-backward');
  });
});
