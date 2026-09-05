import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstancedMesh, OrthographicCamera, Scene } from 'three';
import { createMagicTreeStage } from './magic-tree-stage';

const rendererState = vi.hoisted(() => ({ render: vi.fn(), clear: vi.fn(), dispose: vi.fn() }));
vi.mock('./qr-modules', () => ({ loadQrModules: vi.fn(async () => Array.from({ length: 21 }, (_, y) => Array.from({ length: 21 }, (_, x) => (x + y) % 3 !== 0))) }));
vi.mock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>();
  return { ...actual, WebGLRenderer: class {
    domElement = document.createElement('canvas');
    setPixelRatio() {} setClearColor = rendererState.clear; setSize() {}
    render = rendererState.render;
    dispose = rendererState.dispose;
  } };
});
let callbacks: Map<number, FrameRequestCallback>;
let nextId: number;
let now: number;
let clean: (() => void) | undefined;
let reduced = false;
const tick = (count = 1) => {
  for (let i = 0; i < count; i++) {
    now += 50;
    const pending = [...callbacks.values()]; callbacks.clear();
    pending.forEach(callback => callback(now));
  }
};
const objects = () => {
  const [scene, camera] = rendererState.render.mock.calls.at(-1) as [Scene, OrthographicCamera];
  return { camera, canopy: scene.getObjectByName('canopy') as InstancedMesh, meadow: scene.getObjectByName('meadow') as InstancedMesh };
};
beforeEach(() => {
  callbacks = new Map(); nextId = 0; now = 100; reduced = false;
  rendererState.clear.mockClear(); rendererState.render.mockClear(); rendererState.dispose.mockClear();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callbacks.set(++nextId, callback); return nextId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
  vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList);
});
afterEach(() => { clean?.(); clean = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function mount() {
  const host = document.createElement('div');
  Object.defineProperties(host, { clientWidth: { value: 550 }, clientHeight: { value: 480 } });
  const fail = vi.fn();
  const stage = await createMagicTreeStage(host, 'blob:qr', new AbortController().signal, fail);
  clean = stage.destroy;
  tick(); return { host, stage, fail };
}

describe('tree rendering lifecycle', () => {
  it('animates natural poses, supports reversal and keeps scan movement inside fixed module centers', async () => {
    const { stage } = await mount();
    const before = objects().canopy.instanceMatrix.array.slice();
    tick(4);
    expect(objects().canopy.instanceMatrix.array).not.toEqual(before);
    stage.setQr(true); tick(15);
    const midCamera = objects().camera.position.clone();
    stage.setQr(false); tick(5);
    expect(objects().camera.position.distanceTo(midCamera)).toBeGreaterThan(.01);
    stage.setQr(true); tick(55);
    expect(objects().camera.position.x).toBeCloseTo(0);
    expect(objects().camera.position.z).toBeCloseTo(0);
    expect(objects().camera.up.z).toBeCloseTo(-1);
    expect(callbacks.size).toBe(1);
    const scanBefore = objects().canopy.instanceMatrix.array.slice();
    const cameraBefore = objects().camera.matrixWorld.elements.slice();
    tick(10);
    const scanAfter = objects().canopy.instanceMatrix.array;
    expect(scanAfter).not.toEqual(scanBefore);
    for (let i = 0; i < scanAfter.length; i += 16) {
      expect(Math.abs(scanAfter[i + 12] - scanBefore[i + 12])).toBeLessThan(3.65 / 21 * .121);
      expect(Math.abs(scanAfter[i + 14] - scanBefore[i + 14])).toBeLessThan(3.65 / 21 * .121);
    }
    expect(objects().camera.matrixWorld.elements).toEqual(cameraBefore);
    stage.setQr(false); tick(55); expect(callbacks.size).toBe(1);
  });
  it('forms every dark module with eight grass blades and no ground-code layer', async () => {
    const { stage } = await mount();
    const [scene] = rendererState.render.mock.calls.at(-1) as [Scene];
    const grass = objects().meadow;
    expect(scene.getObjectByName('ground-pattern')).toBeUndefined();
    expect(rendererState.clear).toHaveBeenLastCalledWith(expect.any(String), 0);
    scene.traverse(object => {
      if ('geometry' in object) expect(['BoxGeometry', 'PlaneGeometry'].includes((object.geometry as {type:string}).type) && !('isInstancedMesh' in object)).toBe(false);
    });
    expect(grass.count).toBeGreaterThanOrEqual(294 * 8);
    const protectedFlags = grass.geometry.getAttribute('protectedBlade');
    expect(protectedFlags.count).toBe(grass.count);
    stage.setQr(true); tick(55);
    const before = grass.instanceMatrix.array.slice();
    tick(100);
    const after = grass.instanceMatrix.array;
    for (let i = 0; i < grass.count; i++) {
      expect(after[i * 16 + 12]).toBe(before[i * 16 + 12]);
      expect(after[i * 16 + 14]).toBe(before[i * 16 + 14]);
      if (protectedFlags.getX(i)) expect(after.slice(i * 16, i * 16 + 16)).toEqual(before.slice(i * 16, i * 16 + 16));
    }
  });
  it('renders once per state when reduced motion is enabled', async () => {
    reduced = true;
    const { stage } = await mount();
    expect(callbacks.size).toBe(0);
    stage.setQr(true); tick();
    expect(objects().camera.position.z).toBeCloseTo(0);
    expect(callbacks.size).toBe(0);
    stage.setQr(false); tick();
    expect(objects().camera.position.z).toBeGreaterThan(0);
  });
  it('limits scan rendering to 20 FPS and pauses while the document is hidden', async () => {
    const { stage } = await mount();
    stage.setQr(true); tick(55);
    const count = rendererState.render.mock.calls.length;
    for (let i = 0; i < 30; i++) {
      now += 10;
      const pending = [...callbacks.values()]; callbacks.clear();
      pending.forEach(callback => callback(now));
    }
    expect(rendererState.render.mock.calls.length - count).toBeLessThanOrEqual(6);
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    const paused = rendererState.render.mock.calls.length;
    tick(5); expect(rendererState.render).toHaveBeenCalledTimes(paused);
    expect(callbacks.size).toBe(0);
    hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange'));
    tick(); expect(rendererState.render.mock.calls.length).toBeGreaterThan(paused);
  });
  it('releases the renderer and stops scheduling on context loss', async () => {
    const { host, stage, fail } = await mount();
    const canvas = host.querySelector('canvas')!;
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(fail).toHaveBeenCalledOnce();
    expect(host.querySelector('canvas')).toBeNull();
    expect(callbacks.size).toBe(0);
    stage.destroy(); expect(rendererState.dispose).toHaveBeenCalledOnce();
  });
});
