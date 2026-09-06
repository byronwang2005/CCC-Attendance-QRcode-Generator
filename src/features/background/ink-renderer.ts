import {
  adaptInkQuality, blendSceneWeights, INK_RENDER_SCALES, INK_SCENES, INK_STEPS,
  INK_TRANSITION_MS, initialInkQuality, inkAsset, QUALITY_SAMPLE_SIZE, sceneWeights,
  type InkMotionPolicy, type InkPalette, type InkStep, type SceneWeights
} from './ink-flow-config';
import { FLOW_FRAGMENT_SHADER, INK_FRAGMENT_SHADER, VERTEX_SHADER } from './ink-shaders';

type FlowTarget = { texture: WebGLTexture; framebuffer: WebGLFramebuffer; width: number; height: number };

export class InkFlowRenderer {
  private gl: WebGL2RenderingContext;
  private programs: WebGLProgram[] = [];
  private textures: WebGLTexture[] = [];
  private framebuffers: WebGLFramebuffer[] = [];
  private flowProgram!: WebGLProgram;
  private inkProgram!: WebGLProgram;
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;
  private uniforms = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  private paintings: WebGLTexture[] = [];
  private loaded = new Set<InkStep>();
  private loading = new Set<InkStep>();
  private images = new Set<HTMLImageElement>();
  private flowTargets: FlowTarget[] = [];
  private flowIndex = 0;
  private frameId = 0;
  private preloadTimer = 0;
  private idleId = 0;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private destroyed = false;
  private visible = true;
  private running = false;
  private previousFrameTime = 0;
  private nextFrameTime = 0;
  private elapsedSeconds = 0;
  private lastPointerTime = -Infinity;
  private pointer = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
  private quality = initialInkQuality();
  private samples: number[] = [];
  private weights: SceneWeights;
  private fromWeights: SceneWeights;
  private transitionStart = 0;
  private targetStep: InkStep;
  private desiredStep: InkStep;
  private palette: InkPalette;
  private fromInk: number[];
  private fromOpacity: number;
  private currentInk: number[];
  private currentOpacity: number;
  private diagnostics: number[] = [];
  private renderCosts: number[] = [];
  private frameCount = 0;
  private diagnosticStart = 0;
  private debug = import.meta.env.DEV;

  constructor(private canvas: HTMLCanvasElement, step: InkStep, palette: InkPalette,
    private motion: InkMotionPolicy, private onReady: (ready: boolean) => void) {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false,
      premultipliedAlpha: true, powerPreference: 'low-power' });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    this.desiredStep = this.targetStep = step;
    this.weights = this.fromWeights = sceneWeights(step);
    this.palette = palette;
    this.currentInk = this.fromInk = [...palette.ink];
    this.currentOpacity = this.fromOpacity = palette.inkOpacity;
    try {
      this.flowProgram = this.createProgram(FLOW_FRAGMENT_SHADER);
      this.inkProgram = this.createProgram(INK_FRAGMENT_SHADER);
      this.vao = gl.createVertexArray();
      this.buffer = gl.createBuffer();
      if (!this.vao || !this.buffer) throw new Error('Unable to create ink geometry');
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      for (const program of this.programs) {
        const position = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      }
      this.paintings = INK_STEPS.map(() => this.createTexture(1, 1, new Uint8Array([0,0,0,255])));
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      this.intersectionObserver = new IntersectionObserver(([entry]) => {
        this.visible = entry?.isIntersecting ?? false;
        if (this.visible) this.resume(); else this.pause();
      });
      this.intersectionObserver.observe(canvas);
      this.resize();
      this.loadScene(step);
      const preload = () => { if (!this.destroyed) INK_STEPS.forEach(s => this.loadScene(s)); };
      if (typeof window.requestIdleCallback === 'function') this.idleId = window.requestIdleCallback(preload, { timeout: 2000 });
      else this.preloadTimer = window.setTimeout(preload, 1200);
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  private createProgram(source: string) {
    const gl = this.gl;
    const shaders: WebGLShader[] = [];
    let program: WebGLProgram | null = null;
    try {
      for (const [type, text] of [[gl.VERTEX_SHADER, VERTEX_SHADER], [gl.FRAGMENT_SHADER, source]] as const) {
        const shader = gl.createShader(type);
        if (!shader) throw new Error('Unable to create ink shader');
        shaders.push(shader);
        gl.shaderSource(shader, text); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Ink shader failed');
      }
      program = gl.createProgram();
      if (!program) throw new Error('Unable to create ink program');
      shaders.forEach(shader => gl.attachShader(program!, shader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Ink link failed');
      this.programs.push(program);
      this.uniforms.set(program, new Map());
      return program;
    } catch (error) {
      if (program) gl.deleteProgram(program);
      throw error;
    } finally { shaders.forEach(shader => gl.deleteShader(shader)); }
  }

  private uniform(program: WebGLProgram, name: string) {
    const cache = this.uniforms.get(program)!;
    if (!cache.has(name)) cache.set(name, this.gl.getUniformLocation(program, name));
    return cache.get(name)!;
  }

  private createTexture(width: number, height: number, data: Uint8Array) {
    const gl = this.gl, texture = gl.createTexture();
    if (!texture) throw new Error('Unable to create ink texture');
    this.textures.push(texture);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return texture;
  }

  private loadScene(step: InkStep) {
    if (this.loaded.has(step) || this.loading.has(step) || this.destroyed) return;
    this.loading.add(step);
    const image = new Image();
    image.decoding = 'async';
    this.images.add(image);
    const finish = () => { this.images.delete(image); this.loading.delete(step); image.onload = image.onerror = null; };
    image.onload = () => {
      finish();
      if (this.destroyed || this.gl.isContextLost()) return;
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.paintings[step - 1]);
      // RGB is data (stable ink, wash, movement weight), not display color.
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      this.loaded.add(step);
      if (step === this.desiredStep) this.setScene(step, this.palette);
      this.resume();
    };
    image.onerror = () => { finish(); if (!this.destroyed && step === this.desiredStep) this.onReady(false); };
    image.src = inkAsset(step, 'packed');
  }

  setScene(step: InkStep, palette: InkPalette) {
    const now = performance.now();
    this.updateTransition(now);
    this.desiredStep = step;
    this.palette = palette;
    if (!this.loaded.has(step)) {
      this.onReady(false);
      this.loadScene(step);
      return;
    }
    this.fromWeights = [...this.weights];
    this.fromInk = [...this.currentInk];
    this.fromOpacity = this.currentOpacity;
    this.targetStep = step;
    this.transitionStart = now;
    if (!this.motion.animate) this.updateTransition(now + INK_TRANSITION_MS);
    this.resume();
  }

  private updateTransition(now: number) {
    const progress = this.motion.animate ? Math.min(1, (now - this.transitionStart) / INK_TRANSITION_MS) : 1;
    const t = progress * progress * (3 - 2 * progress);
    this.weights = blendSceneWeights(this.fromWeights, this.targetStep, progress);
    this.currentInk = this.fromInk.map((v, i) => v + (this.palette.ink[i] - v) * t);
    this.currentOpacity = this.fromOpacity + (this.palette.inkOpacity - this.fromOpacity) * t;
  }

  private resize() {
    if (this.destroyed || this.gl.isContextLost()) return;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.25) * INK_RENDER_SCALES[this.quality.tier];
    const width = Math.max(1, Math.round(rect.width * ratio)), height = Math.max(1, Math.round(rect.height * ratio));
    if (this.canvas.width === width && this.canvas.height === height && this.flowTargets.length) return;
    this.canvas.width = width; this.canvas.height = height;
    const gl = this.gl;
    for (const target of this.flowTargets) {
      gl.deleteFramebuffer(target.framebuffer); gl.deleteTexture(target.texture);
      this.textures = this.textures.filter(t => t !== target.texture);
      this.framebuffers = this.framebuffers.filter(f => f !== target.framebuffer);
    }
    this.flowTargets = [];
    const scale = Math.min(1, 320 / Math.max(width, height));
    const fw = Math.max(1, Math.round(width * scale)), fh = Math.max(1, Math.round(height * scale));
    const data = new Uint8Array(fw * fh * 4);
    for (let i = 0; i < data.length; i += 4) { data[i + 1] = data[i + 2] = 128; data[i + 3] = 255; }
    for (let i = 0; i < 2; i++) {
      const texture = this.createTexture(fw, fh, data), framebuffer = gl.createFramebuffer();
      if (!framebuffer) throw new Error('Unable to create flow buffer');
      this.framebuffers.push(framebuffer);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Incomplete flow buffer');
      this.flowTargets.push({ texture, framebuffer, width: fw, height: fh });
    }
    this.flowIndex = 0;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.resume();
  }

  setPointer(clientX: number, clientY: number) {
    if (!this.motion.pointerReactive) return;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const now = performance.now();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = 1 - Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const reset = now - this.lastPointerTime > 250;
    const duration = Math.max(8, now - this.lastPointerTime);
    this.pointer.vx = reset ? 0 : Math.max(-0.08, Math.min(0.08, (x - this.pointer.x) * 16.67 / duration));
    this.pointer.vy = reset ? 0 : Math.max(-0.08, Math.min(0.08, (y - this.pointer.y) * 16.67 / duration));
    this.pointer.x = x; this.pointer.y = y;
    this.lastPointerTime = now;
  }

  resetPointer() { this.lastPointerTime = -Infinity; this.pointer.vx = this.pointer.vy = 0; }

  private render(now: number, delta: number) {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    if (now - this.lastPointerTime <= 2400) {
      const source = this.flowTargets[this.flowIndex], target = this.flowTargets[1 - this.flowIndex];
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer); gl.viewport(0, 0, target.width, target.height);
      gl.useProgram(this.flowProgram); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, source.texture);
      const u = (name: string) => this.uniform(this.flowProgram, name);
      gl.uniform1i(u('u_previous'), 0);
      gl.uniform2f(u('u_pointer'), this.pointer.x, this.pointer.y);
      gl.uniform2f(u('u_velocity'), this.pointer.vx, this.pointer.vy);
      gl.uniform1f(u('u_aspect'), this.canvas.width / this.canvas.height);
      gl.uniform1f(u('u_decay'), Math.exp(-delta * 3));
      gl.uniform1f(u('u_inject'), now - this.lastPointerTime < 70 ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      this.flowIndex = 1 - this.flowIndex;
      this.pointer.vx *= Math.exp(-delta * 10); this.pointer.vy *= Math.exp(-delta * 10);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(this.inkProgram);
    const u = (name: string) => this.uniform(this.inkProgram, name);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.flowTargets[this.flowIndex].texture);
    gl.uniform1i(u('u_flow'), 0);
    this.paintings.forEach((texture, i) => {
      gl.activeTexture(gl.TEXTURE1 + i); gl.bindTexture(gl.TEXTURE_2D, texture); gl.uniform1i(u(`u_scene${i}`), i + 1);
    });
    this.updateTransition(now);
    gl.uniform3f(u('u_weights'), ...this.weights);
    gl.uniform3f(u('u_anchors'), ...INK_STEPS.map(s => INK_SCENES[s].mobileAnchor) as [number,number,number]);
    gl.uniform3f(u('u_periods'), ...INK_STEPS.map(s => INK_SCENES[s].period) as [number,number,number]);
    gl.uniform2f(u('u_resolution'), this.canvas.width, this.canvas.height);
    gl.uniform3f(u('u_ink'), this.currentInk[0], this.currentInk[1], this.currentInk[2]);
    gl.uniform1f(u('u_opacity'), this.currentOpacity);
    gl.uniform1f(u('u_time'), this.motion.animate ? this.elapsedSeconds : 0);
    gl.uniform1f(u('u_flow_strength'), Math.max(0, 1 - (now - this.lastPointerTime) / 2400));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (this.loaded.has(this.desiredStep)) this.onReady(true);
  }

  private recordFrame(frameMs: number, cost: number, now: number) {
    if (frameMs > 0) this.samples.push(frameMs);
    if (this.samples.length >= QUALITY_SAMPLE_SIZE) {
      const sorted = this.samples.sort((a,b) => a-b);
      const next = adaptInkQuality(this.quality, sorted[Math.floor(sorted.length * .95)]);
      this.samples = [];
      const resized = next.tier !== this.quality.tier;
      this.quality = next;
      if (resized) this.resize();
    }
    this.frameCount++;
    if (!this.debug) return;
    if (!this.diagnosticStart) this.diagnosticStart = now;
    // A bounded rolling 30-second sample; no production telemetry or GPU stalls.
    if (frameMs > 0) { this.diagnostics.push(frameMs); this.renderCosts.push(cost); }
    const maxSamples = this.quality.fps * 30;
    if (this.diagnostics.length > maxSamples) { this.diagnostics.shift(); this.renderCosts.shift(); }
    if (this.frameCount % 30 === 0 || !this.motion.animate) {
      const sorted = [...this.diagnostics].sort((a,b) => a-b);
      const costs = [...this.renderCosts].sort((a,b) => a-b);
      this.canvas.dataset.inkMetrics = JSON.stringify({ frames: this.frameCount, samples: sorted.length,
        meanMs: sorted.reduce((a,b) => a+b,0) / (sorted.length || 1), p95Ms: sorted[Math.floor(sorted.length*.95)] ?? 0,
        cpuSubmitP95Ms: costs[Math.floor(costs.length*.95)] ?? 0, elapsedMs: now - this.diagnosticStart,
        tier: this.quality.tier, fpsCap: this.quality.fps, textures: this.textures.length,
        framebuffers: this.framebuffers.length, loaded: [...this.loaded], weights: this.weights,
        canvas: [this.canvas.width, this.canvas.height] });
    }
  }

  private frame = (now: number) => {
    if (!this.running || this.destroyed) return;
    const interval = 1000 / this.quality.fps;
    if (this.motion.animate && now + 0.8 < this.nextFrameTime) {
      this.frameId = requestAnimationFrame(this.frame); return;
    }
    const frameMs = this.previousFrameTime ? now - this.previousFrameTime : 0;
    const delta = Math.min(frameMs / 1000 || 1 / 60, .1);
    this.previousFrameTime = now;
    this.nextFrameTime = this.nextFrameTime && now - this.nextFrameTime < interval
      ? this.nextFrameTime + interval : now + interval;
    this.elapsedSeconds += delta;
    try {
      const start = performance.now();
      this.render(now, delta);
      this.recordFrame(frameMs, performance.now() - start, now);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Ink background fell back to its static artwork', error);
      this.onReady(false); this.pause(); return;
    }
    if (this.motion.animate) this.frameId = requestAnimationFrame(this.frame);
    else this.running = false;
  };

  resume() {
    if (this.destroyed || this.running || !this.visible || document.hidden || this.gl.isContextLost()) return;
    this.running = true; this.previousFrameTime = this.nextFrameTime = 0;
    this.frameId = requestAnimationFrame(this.frame);
  }
  pause() {
    this.running = false; this.previousFrameTime = this.nextFrameTime = 0;
    this.samples = []; this.resetPointer(); cancelAnimationFrame(this.frameId); this.frameId = 0;
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.pause();
    clearTimeout(this.preloadTimer);
    if (this.idleId) window.cancelIdleCallback(this.idleId);
    this.resizeObserver?.disconnect(); this.intersectionObserver?.disconnect();
    this.images.forEach(image => { image.onload = image.onerror = null; }); this.images.clear();
    this.textures.forEach(texture => this.gl.deleteTexture(texture));
    this.framebuffers.forEach(framebuffer => this.gl.deleteFramebuffer(framebuffer));
    this.programs.forEach(program => this.gl.deleteProgram(program));
    this.gl.deleteBuffer(this.buffer); this.gl.deleteVertexArray(this.vao);
    this.textures = []; this.framebuffers = []; this.programs = []; this.uniforms.clear();
  }
}
