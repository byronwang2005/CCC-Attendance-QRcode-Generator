import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InkFlowRenderer } from './ink-renderer';
import { INK_PALETTES, type InkStep } from './ink-flow-config';

let clock = 100;
let raf: Map<number, FrameRequestCallback>;
let images: Array<{ onload: (() => void) | null; onerror: (() => void) | null; src: string }>;
let gl: WebGL2RenderingContext;
let renderer: InkFlowRenderer | undefined;
let nextRaf: number;
const functions = ['bindVertexArray','bindBuffer','bufferData','enableVertexAttribArray','vertexAttribPointer',
  'shaderSource','compileShader','attachShader','linkProgram','deleteShader','deleteProgram','bindTexture',
  'texParameteri','texImage2D','pixelStorei','bindFramebuffer','framebufferTexture2D','deleteFramebuffer',
  'deleteTexture','deleteBuffer','deleteVertexArray','viewport','useProgram','activeTexture','uniform1i',
  'uniform2f','uniform1f','uniform3f','clearColor','clear','drawArrays'];

beforeEach(() => {
  clock = 100; nextRaf=1; raf=new Map(); images=[];
  vi.spyOn(performance,'now').mockImplementation(()=>clock);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id=nextRaf++;raf.set(id,cb);return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => raf.delete(id));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('Image', class {
    onload=null; onerror=null; src=''; decoding=''; constructor() { images.push(this); }
  });
  const fake: Record<string, unknown> = {};
  functions.forEach(name=>fake[name]=vi.fn());
  ['createShader','createProgram','createTexture','createFramebuffer','createBuffer','createVertexArray']
    .forEach(name=>fake[name]=vi.fn(()=>({})));
  fake.getUniformLocation=vi.fn((_program,name)=>name);
  fake.getAttribLocation=vi.fn(()=>0);
  fake.getShaderParameter=fake.getProgramParameter=vi.fn(()=>true);
  fake.isContextLost=vi.fn(()=>false);
  fake.FRAMEBUFFER_COMPLETE=1; fake.checkFramebufferStatus=vi.fn(()=>1);
  gl=fake as unknown as WebGL2RenderingContext;
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(gl);
  vi.spyOn(HTMLCanvasElement.prototype,'getBoundingClientRect').mockReturnValue({width:1200,height:800,left:0,top:0} as DOMRect);
});
afterEach(()=> { renderer?.destroy(); renderer=undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function frame(ms=17) { clock+=ms; const callbacks=[...raf.values()];raf.clear();callbacks.forEach(cb=>cb(clock)); }
function create(animate=true) {
  const canvas=document.createElement('canvas'), ready=vi.fn();
  renderer=new InkFlowRenderer(canvas,1,INK_PALETTES[1],{animate,pointerReactive:animate},ready);
  return {canvas,ready};
}

describe('ink renderer lifecycle', () => {
  it('waits for a painting before declaring the canvas ready', () => {
    const {ready}=create(); frame(); expect(ready).not.toHaveBeenCalledWith(true);
    images[0].onload?.(); frame(); expect(ready).toHaveBeenLastCalledWith(true);
  });
  it('keeps five textures and two framebuffers through 30 scene changes and releases them', () => {
    create(); images[0].onload?.();
    renderer!.setScene(2,INK_PALETTES[2]); images[1].onload?.();
    renderer!.setScene(3,INK_PALETTES[3]); images[2].onload?.();
    for(let i=0;i<30;i++) {const step=(i%3+1) as InkStep;renderer!.setScene(step,INK_PALETTES[step]);frame(50);}
    expect(gl.createTexture).toHaveBeenCalledTimes(5);
    expect(gl.createFramebuffer).toHaveBeenCalledTimes(2);
    renderer!.destroy();
    expect(gl.deleteTexture).toHaveBeenCalledTimes(5);
    expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(2);
    expect(raf.size).toBe(0);
    renderer!.destroy(); expect(gl.deleteTexture).toHaveBeenCalledTimes(5);
  });
  it('renders static scenes on image arrival and step changes without leaving an animation loop', () => {
    create(false); images[0].onload?.(); frame(); expect(raf.size).toBe(0);
    const calls=vi.mocked(gl.drawArrays).mock.calls.length;
    renderer!.setScene(2,INK_PALETTES[2]); images[1].onload?.();frame();
    expect(gl.drawArrays).toHaveBeenCalledTimes(calls+1);expect(raf.size).toBe(0);
    expect(gl.uniform3f).toHaveBeenCalledWith('u_weights',0,1,0);
  });
  it('uses the static fallback on load failure and ignores late loads after disposal', () => {
    const {ready}=create(); images[0].onerror?.(); expect(ready).toHaveBeenLastCalledWith(false);
    renderer!.setScene(2,INK_PALETTES[2]);const late=images[1].onload;
    renderer!.destroy();const calls=vi.mocked(gl.texImage2D).mock.calls.length;
    late?.();expect(gl.texImage2D).toHaveBeenCalledTimes(calls);
  });
  it('does not inject a velocity jump on the first pointer sample', () => {
    create();images[0].onload?.();renderer!.setPointer(1000,700);frame();
    expect(gl.uniform2f).toHaveBeenCalledWith('u_velocity',0,0);
    clock+=16; renderer!.setPointer(1020,700);frame();
    expect(vi.mocked(gl.uniform2f).mock.calls.filter(c=>String(c[0])==='u_velocity').at(-1)?.[1]).toBeGreaterThan(0);
    renderer!.pause();const calls=vi.mocked(gl.drawArrays).mock.calls.length;frame();
    expect(gl.drawArrays).toHaveBeenCalledTimes(calls);
  });
  it('caps draw cadence on a 120Hz callback stream', () => {
    create();images[0].onload?.();
    for(let i=0;i<120;i++)frame(1000/120);
    expect(vi.mocked(gl.drawArrays).mock.calls.length).toBeGreaterThanOrEqual(59);
    expect(vi.mocked(gl.drawArrays).mock.calls.length).toBeLessThanOrEqual(61);
  });
});
