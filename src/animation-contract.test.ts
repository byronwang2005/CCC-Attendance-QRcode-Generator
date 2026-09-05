import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const segmentedSource = readFileSync(resolve(process.cwd(), 'src/features/glass/SegmentedGlassControl.tsx'), 'utf8');
const notFoundSource = readFileSync(resolve(process.cwd(), 'src/features/not-found/NotFoundPage.tsx'), 'utf8');

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
    const mobileSharedHeader = styles.indexOf('.time-panel .panel-header {', mobileBreakpoint);
    const mobileRule = readRule('.time-panel .panel-header {', mobileSharedHeader + 1);

    expect(desktopRule).toContain('grid-template-columns: max-content minmax(0, 1fr)');
    expect(desktopRule).toContain('min-height: 70px');
    expect(desktopRule).toContain('align-items: center');
    expect(desktopTimeRule).toContain('justify-self: end');
    expect(desktopTimeRule).toContain('margin: 0');
    expect(tabletRule).toContain('grid-template-columns: 1fr');
    expect(tabletRule).toContain('min-height: 120px');
    expect(tabletTimeRule).toContain('align-self: end');
    expect(tabletTimeRule).toContain('justify-self: start');
    expect(mobileRule).toContain('grid-template-rows: auto auto');
    expect(mobileRule).toContain('gap: 8px');
    expect(mobileRule).toContain('min-height: 0');
    expect(mobileRule).toContain('align-content: start');
  });

  it('keeps mobile scrolling inside the task panel and aligns action hit areas', () => {
    const floatingGlassStart = styles.indexOf('/* Floating glass material system */');
    const mobileBreakpoint = styles.indexOf('@media (max-width: 720px)', floatingGlassStart);
    const mobileRootRule = readRule('html,', mobileBreakpoint);
    const mobileBodyRule = readRule('body {', mobileBreakpoint);
    const mobileStageRule = readRule('.app-stage {', mobileBreakpoint);
    const mobileShellRule = readRule('.page-shell {', mobileBreakpoint);
    const mobileWorkflowRule = readRule('.workflow-frame {', mobileBreakpoint);
    const mobileStepperRule = readRule('.stepper-island {', mobileBreakpoint);
    const mobileWizardRule = readRule('.wizard-layout {', mobileBreakpoint);
    const mobileSceneRule = readRule('.step-scene {', mobileBreakpoint);
    const mobileTaskRule = readRule('.task-glass {', mobileBreakpoint);
    const mobileActionsRule = readRule('.actions,', mobileBreakpoint);
    const mobileMajorActionsRule = readRule('.actions-major > .action-island {', mobileBreakpoint);
    const mobileActionIslandRule = readRule('.actions .action-island {', mobileBreakpoint);
    const mobileCopyRule = readRule('.copy-action-island,', mobileBreakpoint);
    const mobileCopyAlignmentRule = readRule('.copy-action-island {', mobileBreakpoint);

    expect(mobileRootRule).toContain('height: 100%');
    expect(mobileRootRule).toContain('min-height: 0');
    expect(mobileBodyRule).toContain('overflow: hidden');
    expect(mobileStageRule).toContain('height: 100dvh');
    expect(mobileStageRule).toContain('overflow: hidden');
    expect(mobileShellRule).toContain('height: 100%');
    expect(mobileShellRule).toContain('overflow: hidden');
    expect(mobileWorkflowRule).toContain('grid-template-rows: auto minmax(0, 1fr) auto');
    expect(mobileWorkflowRule).toContain('min-height: 0');
    expect(mobileWorkflowRule).toContain('overflow: hidden');
    expect(mobileStepperRule).toContain('--static-glass-shadow: 0 2px 8px rgb(36 44 51 / 4%)');
    expect(mobileWizardRule).toContain('height: 100%');
    expect(mobileWizardRule).toContain('min-height: 0');
    expect(mobileWizardRule).toContain('overflow: hidden');
    expect(mobileSceneRule).toContain('grid-template-rows: minmax(0, 1fr) auto');
    expect(mobileTaskRule).toContain('height: 100%');
    expect(mobileTaskRule).toContain('--static-glass-shadow: none');
    expect(mobileTaskRule).not.toContain('--pearl-shadow');
    expect(mobileActionsRule).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(mobileMajorActionsRule).toContain('grid-column: 2');
    expect(mobileActionIslandRule).toContain('--pearl-shadow: none');
    expect(mobileActionIslandRule).toContain('box-shadow: none');
    expect(mobileCopyAlignmentRule).toContain('justify-self: stretch');
    expect(mobileCopyRule).toContain('width: 100%');
  });

  it('uses the main static surface for fixed glass contents', () => {
    const floatingGlassStart = styles.indexOf('/* Floating glass material system */');
    const mobileBreakpoint = styles.indexOf('@media (max-width: 720px)', floatingGlassStart);
    const forcedColorsBreakpoint = styles.indexOf('@media (forced-colors: active)', floatingGlassStart);
    const inlineIslandRule = readRule('.inline-code-island {', floatingGlassStart);
    const inlineContentRule = readRule('.inline-code-island > .glass-island__content', floatingGlassStart);
    const inlineRule = readRule('.inline-code-island code', floatingGlassStart);
    const sharedUrlInputRule = styles.indexOf('#urlInput {');
    const urlInputRule = readRule('#urlInput {', sharedUrlInputRule + 1);
    const inputRule = readRule('.course-link-input-island .course-link-input-wrap', floatingGlassStart);
    const commandRule = readRule('.agent-command-island .agent-command', floatingGlassStart);
    const focusRule = readRule('.course-link-input-island:focus-within', floatingGlassStart);
    const focusRingRule = readRule('.course-link-input-island::after', floatingGlassStart);
    const focusedRingRule = readRule('.course-link-input-island:focus-within::after', floatingGlassStart);
    const forcedColorsFocusRule = readRule('.course-link-input-island:focus-within::after', forcedColorsBreakpoint);
    const reducedMotionBreakpoint = styles.indexOf('@media (prefers-reduced-motion: reduce)', forcedColorsBreakpoint);
    const reducedMotionBlock = styles.slice(
      reducedMotionBreakpoint,
      styles.indexOf('/* QR result:', reducedMotionBreakpoint)
    );
    const reducedMotionRule = readRule('.stepper-active-indicator,', reducedMotionBreakpoint);
    const staticRule = readRule('.static-glass-island {', floatingGlassStart);
    const embeddedRule = readRule('.embedded-static-glass {', floatingGlassStart);
    const embeddedDepthRule = readRule('.static-glass-island.embedded-static-glass', floatingGlassStart);
    const embeddedRefractiveRule = readRule('.embedded-static-glass > .glass-island__surface.is-refractive', floatingGlassStart);
    const activeNumberRule = readRule('.step-card.is-active .step-number,', floatingGlassStart);
    const copiedButtonRule = readRule('.copy-action-island .copy-btn:disabled', floatingGlassStart);
    const desktopGuideRule = readRule('.guide-card {', floatingGlassStart);
    const desktopNumberRule = readRule('.step-number {', floatingGlassStart);
    const mobileGuideRule = readRule('.guide-card {', mobileBreakpoint);
    const mobileNumberRule = readRule('.step-number {', mobileBreakpoint);
    const mobileInlineRule = readRule('.inline-code-island code', mobileBreakpoint);
    const mobileWizardRule = readRule('.wizard-layout {', mobileBreakpoint);
    const mobileTaskRule = readRule('.task-glass {', mobileBreakpoint);
    const mobileStageRule = readRule('.app-stage {', mobileBreakpoint);
    const mobileWorkflowRule = readRule('.workflow-frame {', mobileBreakpoint);

    expect(inlineIslandRule).toContain('display: inline-flex');
    expect(inlineIslandRule).toContain('align-items: center');
    expect(inlineIslandRule).toContain('vertical-align: middle');
    expect(inlineIslandRule).not.toContain('transform:');
    expect(inlineContentRule).toContain('display: inline-flex');
    expect(inlineContentRule).toContain('align-items: center');
    expect(inlineRule).toContain('background: transparent');
    expect(inlineRule).toContain('line-height: 1.35');
    expect(inlineRule).toContain('white-space: normal');
    expect(inlineRule).toContain('overflow-wrap: anywhere');
    expect(urlInputRule).toContain('-webkit-appearance: none');
    expect(urlInputRule).toContain('appearance: none');
    expect(urlInputRule).toContain('background: transparent');
    expect(urlInputRule).toContain('border: none');
    expect(urlInputRule).toContain('box-shadow: none');
    expect(inputRule).toContain('background: transparent');
    expect(commandRule).toContain('background: transparent');
    expect(focusRule).toContain('outline: none');
    expect(focusRule).not.toContain('outline-offset');
    expect(focusRingRule).toContain('inset: 0');
    expect(focusRingRule).toContain('border: 0');
    expect(focusRingRule).toContain('border-radius: inherit');
    expect(focusRingRule).toContain('inset 0 1px 0 rgb(255 255 255 / 70%)');
    expect(focusRingRule).toContain('inset 0 0 12px rgb(27 54 93 / 14%)');
    expect(focusRingRule).toContain('opacity: 0');
    expect(focusRingRule).toContain('pointer-events: none');
    expect(focusRingRule).toContain('transition: opacity 140ms ease-in');
    expect(focusedRingRule).toContain('opacity: 1');
    expect(focusedRingRule).toContain('transition-duration: 200ms');
    expect(focusedRingRule).toContain('transition-timing-function: cubic-bezier(.2, .7, .2, 1)');
    expect(forcedColorsFocusRule).toContain('border: 2px solid Highlight');
    expect(forcedColorsFocusRule).toContain('box-shadow: none');
    expect(forcedColorsFocusRule).toContain('forced-color-adjust: none');
    expect(reducedMotionBlock).toContain('.course-link-input-island::after');
    expect(reducedMotionRule).toContain('transition: none');
    expect(staticRule).toContain('--pearl-fill: rgb(250 248 241 / 39%)');
    expect(staticRule).toContain('--pearl-blur: 22px');
    expect(staticRule).toContain('--pearl-inner: inset');
    expect(staticRule).not.toContain('--pearl-shadow');
    expect(staticRule).toContain('--static-glass-shadow: 0 18px 44px');
    expect(embeddedRule).toContain('overflow: hidden');
    expect(embeddedRule).not.toContain('background:');
    expect(embeddedDepthRule).toContain('box-shadow: none');
    expect(embeddedRefractiveRule).toContain('background: rgb(255 255 255 / 64%)');
    expect(embeddedRefractiveRule).toContain('box-shadow: inset');
    expect(activeNumberRule).toContain('background: transparent');
    expect(activeNumberRule).toContain('color: var(--brand)');
    expect(copiedButtonRule).toContain('color: var(--brand)');
    expect(desktopGuideRule).toContain('grid-template-columns: 52px minmax(0, 1fr)');
    expect(desktopNumberRule).toContain('width: 52px');
    expect(desktopNumberRule).toContain('height: 52px');
    expect(mobileGuideRule).toContain('grid-template-columns: 28px minmax(0, 1fr)');
    expect(mobileNumberRule).toContain('width: 28px');
    expect(mobileNumberRule).toContain('height: 28px');
    expect(mobileInlineRule).toContain('padding: 1px 6px');
    expect(mobileWizardRule).toContain('height: 100%');
    expect(mobileWizardRule).toContain('overflow: hidden');
    expect(mobileTaskRule).toContain('height: 100%');
    expect(mobileStageRule).toContain('height: 100dvh');
    expect(mobileStageRule).toContain('overflow: hidden');
    expect(mobileWorkflowRule).toContain('grid-template-rows: auto minmax(0, 1fr) auto');
    expect(mobileWorkflowRule).toContain('height: 100%');
  });
});

describe('glass animation contract', () => {
  it('reserves live optics for moving lenses and interactive actions', () => {
    expect(appSource).not.toContain('LayeredGlassIsland');
    expect(appSource).not.toContain('opticsPreset="controlRail"');
    expect(appSource).not.toContain('opticsPreset="micro"');
    expect(appSource).toContain('opticsPreset="selectionLens"');
    expect(appSource).toContain('opticsPreset="action"');
    expect(notFoundSource).toContain('<StaticGlassIsland');
    expect(notFoundSource).not.toContain('LayeredGlassIsland');
    expect(segmentedSource).toContain('opticsPreset="surface"');
    expect(segmentedSource).toContain('className="static-glass-surface segmented-glass__rail-surface"');
  });

  it('keeps pressed glass surfaces at a stable size', () => {
    expect(readRule('.glass-island--interactive.is-refractive:active')).not.toContain('scale(');
    expect(readRule('.action-island.is-pearl.allows-motion:not(:has(:disabled)):active')).not.toContain('scale(');
  });

  it('gives static glass one optical edge and one depth layer', () => {
    const floatingGlassStart = styles.indexOf('/* Floating glass material system */');
    const outerSelectorStart = styles.indexOf('.static-glass-island.is-refractive,', floatingGlassStart);
    const outerSelectorEnd = styles.indexOf('{', outerSelectorStart);
    const outerSelector = styles.slice(outerSelectorStart, outerSelectorEnd);
    const outerRule = readRule('.static-glass-island.is-refractive,', floatingGlassStart);
    const surfaceRule = readRule('.static-glass-island > .glass-island__surface.is-refractive {', floatingGlassStart);
    const pearlRimRule = readRule('.static-glass-island > .glass-island__surface.is-pearl::before', floatingGlassStart);
    const embeddedRule = readRule('.static-glass-island.embedded-static-glass', floatingGlassStart);
    const copyPearlRule = readRule('.copy-action-island,', floatingGlassStart);
    const copyRefractiveRule = readRule('.copy-action-island.is-refractive,', floatingGlassStart);
    const copyFillRule = readRule('.copy-action-island .copy-btn,', floatingGlassStart);
    const interactiveRule = readRule('.glass-island--interactive.is-refractive {', floatingGlassStart);

    expect(outerRule).toContain('box-shadow: var(--static-glass-shadow)');
    expect(outerSelector).toContain('.static-glass-island.is-pearl');
    expect(surfaceRule).toContain('border: 1px solid rgb(255 255 255 / 32%)');
    expect(surfaceRule).toContain('box-shadow: inset');
    expect(surfaceRule).not.toContain('0 18px 44px');
    expect(pearlRimRule).toContain('opacity: .72');
    expect(embeddedRule).toContain('box-shadow: none');
    expect(copyPearlRule).toContain('--pearl-fill: rgb(255 255 255 / 78%)');
    expect(copyRefractiveRule).toContain('background: rgb(255 255 255 / 78%)');
    expect(copyFillRule).toContain('radial-gradient(');
    expect(interactiveRule).toContain('border: 1px solid');
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
