import {
  layoutNextLineRange,
  materializeLineRange,
  prepareWithSegments
} from 'https://cdn.jsdelivr.net/npm/@chenglou/pretext@0.0.5/dist/layout.js';

const ROTATION_RADIANS = -18 * (Math.PI / 180);
const FONT_FAMILY = '"HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
const TEXT_VARIANTS = Object.freeze([
  '一个签到码，三步搞定',
  'One attendance code, done in three steps',
  'رمز حضور واحد، وثلاث خطوات تكفي'
]);

const DEFAULT_CURSOR = Object.freeze({
  segmentIndex: 0,
  graphemeIndex: 0
});

let activeLayer = null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createCursor = () => ({
  segmentIndex: DEFAULT_CURSOR.segmentIndex,
  graphemeIndex: DEFAULT_CURSOR.graphemeIndex
});

const lerp = (start, end, amount) => start + (end - start) * amount;

const mediaMatches = (query) => window.matchMedia(query).matches;

const buildTextSource = () => {
  const sequence = [];
  for (let index = 0; index < 260; index += 1) {
    sequence.push(TEXT_VARIANTS[index % TEXT_VARIANTS.length]);
  }
  return sequence.join('    ·    ');
};

const getEllipseCut = (centerX, radiusX, centerY, radiusY, rowY, padding = 0) => {
  if (radiusX <= 0 || radiusY <= 0) {
    return null;
  }

  const dy = rowY - centerY;
  if (Math.abs(dy) >= radiusY) {
    return null;
  }

  const ratio = 1 - (dy * dy) / (radiusY * radiusY);
  const dx = radiusX * Math.sqrt(Math.max(0, ratio));
  return {
    start: centerX - dx - padding,
    end: centerX + dx + padding
  };
};

class BackgroundTextLayer {
  constructor(container, canvas) {
    this.container = container;
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.prepared = null;
    this.textSource = buildTextSource();
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
    this.fontSize = clamp(Math.round(viewportShortEdge * 0.021), 12, 22);
    this.lineHeight = Math.round(this.fontSize * 1.6);
    this.font = `700 ${this.fontSize}px ${FONT_FAMILY}`;
    this.prepared = prepareWithSegments(this.textSource, this.font, { wordBreak: 'keep-all' });
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
    this.pointerCurrent.x = lerp(this.pointerCurrent.x, this.pointerTarget.x, smoothing);
    this.pointerCurrent.y = lerp(this.pointerCurrent.y, this.pointerTarget.y, smoothing);
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

  nextRange(cursor, width) {
    if (!this.prepared) {
      return null;
    }

    let range = layoutNextLineRange(this.prepared, cursor, width);
    if (!range) {
      cursor.segmentIndex = DEFAULT_CURSOR.segmentIndex;
      cursor.graphemeIndex = DEFAULT_CURSOR.graphemeIndex;
      range = layoutNextLineRange(this.prepared, cursor, width);
    }

    if (!range) {
      return null;
    }

    cursor.segmentIndex = range.end.segmentIndex;
    cursor.graphemeIndex = range.end.graphemeIndex;
    return range;
  }

  getAvailableSegments(rowY) {
    const horizontalInset = this.fontSize * 1.8;
    const minWidth = this.fontSize * 4.4;
    const segments = [{
      start: horizontalInset,
      end: this.planeWidth - horizontalInset
    }];

    if (this.pointerCurrent.radius > 4) {
      const pointerCut = getEllipseCut(
        this.pointerCurrent.x,
        this.pointerCurrent.radius,
        this.pointerCurrent.y,
        this.pointerCurrent.radius,
        rowY,
        this.fontSize * 0.6
      );
      if (pointerCut) {
        return [
          {
            start: horizontalInset,
            end: pointerCut.start
          },
          {
            start: pointerCut.end,
            end: this.planeWidth - horizontalInset
          }
        ].filter((segment) => (segment.end - segment.start) >= minWidth);
      }
    }

    return segments.filter((segment) => (segment.end - segment.start) >= minWidth);
  }

  drawBackdrop(context) {
    const gradient = context.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    gradient.addColorStop(0.42, 'rgba(255, 255, 255, 0.04)');
    gradient.addColorStop(1, 'rgba(15, 36, 55, 0.03)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.width, this.height);
  }

  drawTextPlane(context) {
    if (!this.prepared) {
      return;
    }

    const cursor = createCursor();
    context.save();
    context.translate(this.width * 0.5, this.height * 0.5);
    context.rotate(ROTATION_RADIANS);
    context.translate(-this.planeWidth * 0.5, -this.planeHeight * 0.5);
    context.font = this.font;
    context.textBaseline = 'middle';

    for (let rowY = this.lineHeight; rowY < this.planeHeight - this.lineHeight * 0.4; rowY += this.lineHeight) {
      const segments = this.getAvailableSegments(rowY);
      if (!segments.length) {
        continue;
      }

      for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
        const segment = segments[segmentIndex];
        const width = segment.end - segment.start;
        const range = this.nextRange(cursor, width);
        if (!range) {
          continue;
        }

        const line = materializeLineRange(this.prepared, range);
        context.fillStyle = 'rgba(15, 36, 55, 0.088)';
        context.fillText(line.text, segment.start, rowY);
      }

    }

    if (this.pointerCurrent.radius > 6) {
      context.save();
      const highlight = context.createRadialGradient(
        this.pointerCurrent.x,
        this.pointerCurrent.y,
        this.pointerCurrent.radius * 0.14,
        this.pointerCurrent.x,
        this.pointerCurrent.y,
        this.pointerCurrent.radius * 1.05
      );
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      highlight.addColorStop(0.56, 'rgba(255, 255, 255, 0.08)');
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
      context.fillStyle = highlight;
      context.beginPath();
      context.arc(this.pointerCurrent.x, this.pointerCurrent.y, this.pointerCurrent.radius * 1.05, 0, Math.PI * 2);
      context.fill();
      context.restore();
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
    this.drawBackdrop(this.context);
    this.drawTextPlane(this.context);
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

export const initBackgroundTextLayer = () => {
  activeLayer?.destroy();
  activeLayer = null;

  const container = document.querySelector('[data-background-layer]');
  const canvas = document.querySelector('[data-background-canvas]');
  if (!(container instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
    return null;
  }

  activeLayer = new BackgroundTextLayer(container, canvas);
  void activeLayer.init();
  return activeLayer;
};
