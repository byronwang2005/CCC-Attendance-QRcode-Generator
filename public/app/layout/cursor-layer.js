const ROTATION_RADIANS = -18 * (Math.PI / 180);
const FONT_FAMILY = '"TsangerJinKai02", "Source Han Serif SC", "Noto Serif CJK SC", serif';
const POINTER_TEXT = '一个签到码，三步搞定';
const BORDER_WARM = '#e0ddd2';

let activeLayer = null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const lerp = (start, end, amount) => start + (end - start) * amount;

const mediaMatches = (query) => window.matchMedia(query).matches;

class CursorLayer {
  constructor(container, canvas) {
    this.container = container;
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.lineHeight = 56;
    this.fontSize = 34;
    this.font = '';
    this.width = 0;
    this.height = 0;
    this.planeWidth = 0;
    this.planeHeight = 0;
    this.devicePixelRatio = 1;
    this.pointerActive = false;
    this.animating = false;
    this.frameId = 0;
    this.destroyed = false;
    this.pointerTarget = { x: 0, y: 0, radius: 0 };
    this.pointerCurrent = { x: 0, y: 0, radius: 0 };

    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.tick = this.tick.bind(this);
  }

  async init() {
    if (!this.context) {
      return;
    }

    await (document.fonts?.ready ?? Promise.resolve());

    if (this.destroyed) {
      return;
    }

    this.bindEvents();
    this.handleResize();
    this.render();
  }

  bindEvents() {
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', this.handlePointerLeave, { passive: true });
    window.addEventListener('blur', this.handlePointerLeave);
    window.addEventListener('resize', this.handleResize);
  }

  isDynamicModeEnabled() {
    return !mediaMatches('(prefers-reduced-motion: reduce)') && !mediaMatches('(pointer: coarse)');
  }

  updateTypography() {
    const viewportShortEdge = Math.min(this.width, this.height);
    this.fontSize = viewportShortEdge <= 720 ? 18 : 34;
    this.lineHeight = Math.round(this.fontSize * 1.9);
    this.font = `500 ${this.fontSize}px ${FONT_FAMILY}`;
  }

  updateGeometry() {
    this.planeWidth = Math.round(this.width * 1.92);
    this.planeHeight = Math.round(this.height * 1.92);
  }

  handleResize() {
    if (this.destroyed || !this.context) {
      return;
    }

    this.width = Math.max(1, window.innerWidth);
    this.height = Math.max(1, window.innerHeight);
    this.devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.round(this.width * this.devicePixelRatio);
    this.canvas.height = Math.round(this.height * this.devicePixelRatio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.updateGeometry();
    this.updateTypography();
    this.requestRender();
  }

  handlePointerMove(event) {
    if (!this.isDynamicModeEnabled()) {
      return;
    }

    const planePoint = this.screenToPlane(event.clientX, event.clientY);
    this.pointerTarget.x = planePoint.x;
    this.pointerTarget.y = planePoint.y;
    this.pointerTarget.radius = clamp(Math.min(this.width, this.height) * 0.125, 92, 142);
    this.pointerCurrent.x = planePoint.x;
    this.pointerCurrent.y = planePoint.y;
    this.pointerActive = true;
    this.requestRender(true);
  }

  handlePointerLeave() {
    this.pointerActive = false;
    this.pointerTarget.radius = 0;
    this.requestRender(true);
  }

  requestRender(animate = false) {
    if (animate) {
      if (!this.animating) {
        this.animating = true;
        this.frameId = window.requestAnimationFrame(this.tick);
      }
      return;
    }

    this.render();
  }

  tick() {
    if (this.destroyed) {
      return;
    }

    const smoothing = this.pointerActive ? 0.16 : 0.12;
    if (this.pointerActive) {
      this.pointerCurrent.x = this.pointerTarget.x;
      this.pointerCurrent.y = this.pointerTarget.y;
    } else {
      this.pointerCurrent.x = lerp(this.pointerCurrent.x, this.pointerTarget.x, smoothing);
      this.pointerCurrent.y = lerp(this.pointerCurrent.y, this.pointerTarget.y, smoothing);
    }
    this.pointerCurrent.radius = lerp(this.pointerCurrent.radius, this.pointerTarget.radius, smoothing);

    this.render();

    const delta = Math.max(
      Math.abs(this.pointerCurrent.x - this.pointerTarget.x),
      Math.abs(this.pointerCurrent.y - this.pointerTarget.y),
      Math.abs(this.pointerCurrent.radius - this.pointerTarget.radius)
    );

    if (delta > 0.6) {
      this.frameId = window.requestAnimationFrame(this.tick);
      return;
    }

    this.animating = false;
    this.frameId = 0;
  }

  screenToPlane(screenX, screenY) {
    const centerX = this.width * 0.5;
    const centerY = this.height * 0.5;
    const dx = screenX - centerX;
    const dy = screenY - centerY;
    const cos = Math.cos(-ROTATION_RADIANS);
    const sin = Math.sin(-ROTATION_RADIANS);

    return {
      x: dx * cos - dy * sin + this.planeWidth * 0.5,
      y: dx * sin + dy * cos + this.planeHeight * 0.5
    };
  }

  drawPointerPlane(context) {
    context.save();
    context.translate(this.width * 0.5, this.height * 0.5);
    context.rotate(ROTATION_RADIANS);
    context.translate(-this.planeWidth * 0.5, -this.planeHeight * 0.5);
    this.drawPointerCircle(context);
    context.restore();
  }

  drawPointerCircle(context) {
    if (this.pointerCurrent.radius <= 6) {
      return;
    }

    const { x, y, radius } = this.pointerCurrent;
    const innerFontSize = Math.max(16, Math.round(this.fontSize * 0.72));
    const innerLineHeight = Math.round(innerFontSize * 1.8);
    const text = `${POINTER_TEXT}    ·    `;

    context.save();
    context.fillStyle = BORDER_WARM;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.clip();

    context.font = `500 ${innerFontSize}px ${FONT_FAMILY}`;
    context.textBaseline = 'middle';
    context.fillStyle = '#faf9f5';
    context.globalAlpha = 0.74;

    const measuredWidth = context.measureText(text).width;
    const stepWidth = Math.max(measuredWidth, radius * 1.6);
    const startY = innerLineHeight;
    const endY = this.planeHeight - innerLineHeight * 0.4;
    const startX = this.fontSize * 1.8;
    const endX = this.planeWidth - startX;

    for (let rowY = startY, rowIndex = 0; rowY < endY; rowY += innerLineHeight, rowIndex += 1) {
      const offset = rowIndex % 2 === 0 ? 0 : stepWidth * 0.42;
      for (let rowX = startX - offset; rowX < endX + stepWidth; rowX += stepWidth) {
        context.fillText(text, rowX, rowY);
      }
    }

    context.restore();
  }

  render() {
    if (this.destroyed || !this.context) {
      return;
    }

    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.scale(this.devicePixelRatio, this.devicePixelRatio);
    this.drawPointerPlane(this.context);
  }

  destroy() {
    this.destroyed = true;
    if (this.frameId) {
      window.cancelAnimationFrame(this.frameId);
    }
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerleave', this.handlePointerLeave);
    window.removeEventListener('blur', this.handlePointerLeave);
    window.removeEventListener('resize', this.handleResize);
  }
}

export const initCursorLayer = () => {
  activeLayer?.destroy();
  activeLayer = null;

  const container = document.querySelector('[data-cursor-layer]');
  const canvas = document.querySelector('[data-cursor-canvas]');
  if (!(container instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
    return null;
  }

  activeLayer = new CursorLayer(container, canvas);
  void activeLayer.init();
  return activeLayer;
};
