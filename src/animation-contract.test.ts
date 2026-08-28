import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

const readRule = (selector: string, fromIndex = 0) => {
  const selectorIndex = styles.indexOf(selector, fromIndex);
  if (selectorIndex < 0) throw new Error(`Missing CSS selector: ${selector}`);
  const blockStart = styles.indexOf('{', selectorIndex);
  const blockEnd = styles.indexOf('}', blockStart);
  return styles.slice(blockStart + 1, blockEnd);
};

describe('identity layout contract', () => {
  it('starts the human guide without a top divider', () => {
    const firstGuideRule = readRule('.guide-card:first-child');
    expect(firstGuideRule).toContain('border-top: 0');
    expect(firstGuideRule).toContain('padding-top: 0');
  });

  it('uses matching typography for both step headings', () => {
    const sharedSelector = '.time-panel .panel-header h3';
    const desktopRule = readRule(sharedSelector);
    const floatingGlassStart = styles.indexOf('/* Floating glass material system */');
    const mobileBreakpoint = styles.indexOf('@media (max-width: 720px)', floatingGlassStart);
    const mobileRule = readRule(sharedSelector, mobileBreakpoint);
    const sharedHeadingRules = styles.match(/\.identity-header h3,\s+\.time-panel \.panel-header h3\s*\{/g) ?? [];

    expect(sharedHeadingRules).toHaveLength(2);
    expect(desktopRule).toContain('font-family: var(--serif)');
    expect(desktopRule).toContain('font-size: 27px');
    expect(desktopRule).toContain('font-weight: 500');
    expect(desktopRule).toContain('line-height: 1.18');
    expect(desktopRule).toContain('margin: 0');
    expect(mobileRule).toContain('font-size: 23px');
  });

  it('keeps both step header containers aligned across breakpoints', () => {
    const floatingGlassStart = styles.indexOf('/* Floating glass material system */');
    const tabletBreakpoint = styles.indexOf('@media (max-width: 980px)', floatingGlassStart);
    const mobileBreakpoint = styles.indexOf('@media (max-width: 720px)', floatingGlassStart);
    const desktopRule = readRule('.time-panel .panel-header {', floatingGlassStart);
    const desktopTimeRule = readRule('.time-panel .panel-current-time {', floatingGlassStart);
    const tabletRule = readRule('.time-panel .panel-header {', tabletBreakpoint);
    const tabletTimeRule = readRule('.time-panel .panel-current-time {', tabletBreakpoint);
    const mobileRule = readRule('.time-panel .panel-header {', mobileBreakpoint);

    expect(desktopRule).toContain('grid-template-columns: max-content minmax(0, 1fr)');
    expect(desktopRule).toContain('min-height: 70px');
    expect(desktopRule).toContain('align-items: center');
    expect(desktopTimeRule).toContain('justify-self: end');
    expect(desktopTimeRule).toContain('margin: 0');
    expect(tabletRule).toContain('grid-template-columns: 1fr');
    expect(tabletRule).toContain('min-height: 120px');
    expect(tabletTimeRule).toContain('align-self: end');
    expect(tabletTimeRule).toContain('justify-self: start');
    expect(mobileRule).toContain('min-height: 102px');
  });
});

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
