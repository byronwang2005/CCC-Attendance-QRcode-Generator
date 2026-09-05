import {
  AmbientLight, BufferGeometry, Color, CatmullRomCurve3, TubeGeometry, DirectionalLight,
  DoubleSide, Float32BufferAttribute, Group, InstancedMesh, LineBasicMaterial,
  InstancedBufferAttribute,
  LineSegments, Material, Mesh, MeshBasicMaterial, Object3D,
  OrthographicCamera, PlaneGeometry, Scene, Vector3, WebGLRenderer
} from 'three';
import { loadQrModules } from './qr-modules';
import { advanceTreeTransition, naturalQrTargets, TREE_PALETTE, canopyCoverage, meadowDensity, qrModuleColors, treeRandom, treeTransition, treeWind } from './magic-tree-config';

import { barkMaterial, foliageGeometry, foliageMaterial } from './magic-tree-materials';

export interface MagicTreeScene {
  setQr(value: boolean): void;
  destroy(): void;
}

export async function createMagicTreeStage(
  host: HTMLElement, imageUrl: string, signal: AbortSignal, onFailure: () => void
): Promise<MagicTreeScene> {
  const modules = await loadQrModules(imageUrl, signal);
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  const scene = new Scene();
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const geometry = <T extends BufferGeometry>(value: T) => { geometries.add(value); return value; };
  const material = <T extends Material>(value: T) => { materials.add(value); return value; };
  let frame = 0;
  let destroyed = false;
  let observer: ResizeObserver | undefined;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motion.matches;
  let progress = 0;
  let target = 0;
  let last = 0;
  let time = 0;
  let lastScanFrame = 0;
  let wake: () => void = () => {};
  const visibility = () => { cancelAnimationFrame(frame); frame = 0; last = 0; wake(); };
  const preference = () => { reduced = motion.matches; if (reduced) progress = target; visibility(); };
  const lost = (event: Event) => { event.preventDefault(); destroy(); onFailure(); };
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    motion.removeEventListener('change', preference);
    renderer.domElement.removeEventListener('webglcontextlost', lost);
    scene.traverse(object => { if (object instanceof InstancedMesh) object.dispose(); });
    geometries.forEach(value => value.dispose());
    materials.forEach(value => value.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  };
  try {
    const random = treeRandom();
    const mobile = host.clientWidth < 600;
    const pixelRatio = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(TREE_PALETTE.background, 0);
    host.appendChild(renderer.domElement);
    const camera = new OrthographicCamera(-3, 3, 3, -3, .1, 60);
    const focus = new Vector3();
    const scanFocus = new Vector3();
    let scanZoom = 1.25;
    const size = modules.length;
    const side = 3.65;
    const cell = side / size;
    const quietEdge = side / 2 + cell * 4;
    const groundSize = (quietEdge + .035) * 2;
    scene.add(new AmbientLight('#fff9ef', 1.5));
    const sun = new DirectionalLight('#fff6e4', 1.6);
    sun.position.set(-3, 8, 5); scene.add(sun);
    const environment = new Group(); scene.add(environment);
    const darkCells: Array<{ x: number; z: number }> = [];
    modules.forEach((row, z) => row.forEach((dark, x) => { if (dark) darkCells.push({ x, z }); }));
    const grassColors = TREE_PALETTE.grass.map(value => new Color(value));
    const leafColors = TREE_PALETTE.leaf.map(value => new Color(value));
    const pickColor = () => { const r = random(); return r < .5 ? 0 : r < .8 ? 1 : 2; };
    const moduleColors = qrModuleColors(size).map(row => row.map(value => new Color(value)));
    const tempColor = new Color();
    const dummy = new Object3D();
    const bark = material(barkMaterial(TREE_PALETTE.bark));

    const branch = (a: Vector3, b: Vector3, radius: number, trunkPoints?: Vector3[]) => {
      const mid = a.clone().lerp(b, .5);
      mid.x -= .035; mid.y -= a.distanceTo(b) * .08;
      const curve = new CatmullRomCurve3(trunkPoints ?? [a, mid, b]);
      const tube = geometry(new TubeGeometry(curve, trunkPoints ? 40 : 8, radius, trunkPoints ? 12 : 8, false));
      const vertices = tube.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const t = tube.attributes.uv.getX(i);
        const center = curve.getPointAt(t);
        const around = tube.attributes.uv.getY(i) * Math.PI * 2;
        const taper = (1 - t * (trunkPoints ? .9 : .58)) * (1 + .065 * Math.sin(around * 5 + t * 17) + (trunkPoints ? .24 * Math.exp(-t * 28) : 0));
        vertices.setXYZ(i, center.x + (vertices.getX(i) - center.x) * taper, center.y + (vertices.getY(i) - center.y) * taper, center.z + (vertices.getZ(i) - center.z) * taper);
      }
      tube.computeVertexNormals(); environment.add(new Mesh(tube, bark));
    };
    const canopyCenters: Vector3[] = [];
    const trunkPoints = [new Vector3(0, 0, 0)];
    for (let level = 0; level < 8; level++) {
      const y = .65 + level * .43 + random() * .06;
      const trunk = new Vector3(Math.sin(level * .7) * .1, y, Math.cos(level) * .07);
      trunkPoints.push(trunk);
      if (level < 2) continue;
      const radius = (1.05 + random() * .28) * (1 - Math.max(0, level - 5) * .20);
      for (let j = 0; j < 3; j++) {
        const angle = level * 2.4 + j * Math.PI * .67 + (random() - .5) * .6;
        const end = new Vector3(Math.cos(angle) * radius, y + .1 + random() * .4, Math.sin(angle) * radius);
        const middle = trunk.clone().lerp(end, .6); middle.y -= .15;
        branch(trunk, end, .05 * (1 - level / 12), [trunk, middle, end]);
        canopyCenters.push(middle.clone().lerp(end, .75));
      }
    }
    branch(trunkPoints[0], trunkPoints[trunkPoints.length - 1], .13, trunkPoints);
    // Sample the meadow independently of the QR bitmap. Canopy coverage controls acceptance.
    const grassGeometry = geometry(foliageGeometry('grass'));
    const grassMat = material(foliageMaterial('grass'));
    const grassPoses: Array<{ origin: Vector3; scan: Vector3; angle: number; height: number; width: number; color: number; ink: Color }> = [];
    for (let patchIndex = 0; patchIndex < (mobile ? 500 : 700); patchIndex++) {
      const patch = new Vector3((random() - .5) * side, .005, (random() - .5) * side);
      // Reject whole tufts instead of shortening blades or replacing rejected tufts elsewhere.
      if (random() >= meadowDensity(patch.x, patch.z, canopyCenters)) continue;
      const patchColor = Math.floor(random() * grassColors.length);
      const cover = canopyCoverage(patch.x, patch.z, canopyCenters);
      const density = cover > .75 ? 2 : mobile ? 4 : 6;
      for (let i = 0; i < density; i++) {
        const origin = patch.clone();
        origin.x = Math.max(-side / 2, Math.min(side / 2, origin.x + (random() - .5) * .08));
        origin.z = Math.max(-side / 2, Math.min(side / 2, origin.z + (random() - .5) * .08));
        grassPoses.push({ origin, scan: origin.clone(), ink: new Color(),
          angle: (random() - .5) * Math.PI * 2, height: .09 + random() * .19 + (random() < .08 ? .12 : 0),
          width: .014 + random() * .024, color: random() < .8 ? patchColor : Math.floor(random() * grassColors.length) });
      }
    }
    const grassReveal = new InstancedBufferAttribute(new Float32Array(grassPoses.length), 1);
    grassGeometry.setAttribute('reveal', grassReveal);
    const grass = new InstancedMesh(grassGeometry, grassMat, grassPoses.length);
    grass.name = 'meadow'; grass.frustumCulled = false; environment.add(grass);

    const leafMat = material(foliageMaterial('leaf'));
    const leafGeometry = geometry(foliageGeometry('leaf'));
    type LeafPose = { origin: Vector3; scan: Vector3; rotation: Vector3; size: number; color: number; ink: Color };
    const leafPoses: LeafPose[] = [];
    const makeLeaf = (origin: Vector3, ground: boolean, color: number): LeafPose => {
      return { origin, scan: origin.clone(), ink: new Color(),
        rotation: ground ? new Vector3(-Math.PI / 2 + random() * .16, random() * .15, random() * Math.PI * 2)
          : new Vector3(-.35 - random() * 1.4, random() * 1.1 - .55, random() * Math.PI * 2),
        size: ground ? .14 + random() * .075 : .10 + random() * .075, color };
    };
    canopyCenters.forEach((center, cluster) => {
      const count = Math.max(mobile ? 100 : 130, Math.ceil(darkCells.length / canopyCenters.length));
      const spread = .46 + random() * .14;
      const clusterColor = cluster % leafColors.length;
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * spread;
        const origin = new Vector3(center.x + Math.cos(angle) * radius, center.y + (random() - .5) * spread * 1.3, center.z + Math.sin(angle) * radius);
        leafPoses.push(makeLeaf(origin, false, random() < .82 ? clusterColor : pickColor()));
      }
    });
    const leafReveal = new InstancedBufferAttribute(new Float32Array(leafPoses.length), 1);
    leafGeometry.setAttribute('reveal', leafReveal);
    const leaves = new InstancedMesh(leafGeometry, leafMat, leafPoses.length);
    leaves.name = 'canopy'; leaves.frustumCulled = false; environment.add(leaves);

    const litterPoses: LeafPose[] = [];
    for (let i = 0; i < (mobile ? 24 : 40); i++) {
      let x = 0, z = 0;
      for (let attempt = 0; attempt < 100; attempt++) {
        x = (random() - .5) * side * .85; z = (random() - .5) * side * .85;
        if (random() < canopyCoverage(x, z, canopyCenters)) break;
      }
      litterPoses.push(makeLeaf(new Vector3(x, .025 + random() * .012, z), true, Math.floor(random() * leafColors.length)));
    }
    const litterGeometry = geometry(leafGeometry.clone());
    const litterReveal = new InstancedBufferAttribute(new Float32Array(litterPoses.length), 1);
    litterGeometry.setAttribute('reveal', litterReveal);
    const litter = new InstancedMesh(litterGeometry, leafMat, litterPoses.length);
    litter.name = 'fallen-leaves'; litter.frustumCulled = false; environment.add(litter);

    const allPoses = [...grassPoses, ...leafPoses, ...litterPoses];
    const destinations = naturalQrTargets(allPoses.map(pose => pose.origin), modules, side);
    allPoses.forEach((pose, i) => {
      const destination = destinations[i];
      const x = Math.round(destination.x / cell + (size - 1) / 2), z = Math.round(destination.z / cell + (size - 1) / 2);
      // Keep canopy height: the camera reveals the grid without dropping the whole crown onto the ground.
      pose.scan.set(destination.x, pose.origin.y + .003 + i * .000001, destination.z);
      pose.ink = moduleColors[z][x];
    });

    const seedMat = material(new MeshBasicMaterial({ color: TREE_PALETTE.grass[1], transparent: true, side: DoubleSide }));
    const seedHeads = new InstancedMesh(geometry(new PlaneGeometry(.018, .06)), seedMat, Math.floor(grassPoses.length / 36));
    seedHeads.frustumCulled = false; environment.add(seedHeads);

    const rainCount = mobile ? 24 : 45;
    const rainPositions = new Float32Array(rainCount * 6);
    const rainSeeds = Array.from({ length: rainCount }, () => [random() * 5 - 2.5, random() * 5, random() * 5 - 2.5]);
    const rainGeometry = geometry(new BufferGeometry());
    rainGeometry.setAttribute('position', new Float32BufferAttribute(rainPositions, 3));
    const rainMat = material(new LineBasicMaterial({ color: '#aaa393', transparent: true, opacity: .16, depthWrite: false }));
    const rain = new LineSegments(rainGeometry, rainMat); rain.frustumCulled = false; scene.add(rain);
    const fallenMat = material(new MeshBasicMaterial({ color: TREE_PALETTE.leaf[1], transparent: true, side: DoubleSide }));
    const fallen = new InstancedMesh(leafGeometry, fallenMat, mobile ? 6 : 10);
    const fallingSeeds = Array.from({ length: fallen.count }, () => [random() * 3.8 - 1.9, random() * 4, random() * 3.8 - 1.9]);
    environment.add(fallen);

    const render = (now: number) => {
      frame = 0;
      if (destroyed || document.hidden) return;
      try {
        if (!reduced && progress === 1 && target === 1 && lastScanFrame && now - lastScanFrame < 49) {
          frame = requestAnimationFrame(render); return;
        }
        lastScanFrame = now;
        const delta = last ? Math.min((now - last) / 1000, .1) : 0;
        last = now; time += reduced ? 0 : delta;
        progress = advanceTreeTransition(progress, target, delta, reduced);
        const { camera: p, settle } = treeTransition(progress);
        const polar = (1 - p) * 1.07;
        const azimuth = (1 - p) * Math.atan2(7, 8);
        focus.set(scanFocus.x * p, 1.78 * (1 - p), scanFocus.z * p);
        camera.position.set(focus.x + 12 * Math.sin(polar) * Math.sin(azimuth), focus.y + 12 * Math.cos(polar), focus.z + 12 * Math.sin(polar) * Math.cos(azimuth));
        camera.up.set(0, Math.cos(p * Math.PI / 2), -Math.sin(p * Math.PI / 2));
        camera.lookAt(focus);
        camera.zoom = 1 + p * (scanZoom - 1); camera.updateProjectionMatrix();
        rain.visible = settle < 1 && !reduced;
        rainMat.opacity = .12 * (1 - settle);
        fallen.visible = settle < 1 && !reduced;
        fallenMat.opacity = 1 - settle;
        bark.opacity = 1 - settle;
        bark.depthWrite = settle < .5;
        // The same visible particles settle locally and stay present through the final frame.
        const animateLeaves = (mesh: InstancedMesh, poses: LeafPose[], reveal: InstancedBufferAttribute, ground: boolean) => {
          mesh.visible = true;
          poses.forEach((pose, i) => {
            const local = treeTransition(progress, (i % 17) / 16).settle;
            const wind = reduced || ground ? 0 : treeWind(time, pose.origin.x, pose.origin.z);
            dummy.position.copy(pose.origin).lerp(pose.scan, local);
            dummy.position.x += wind * .045 * (1 - local);
            dummy.position.y += ground || reduced ? 0 : Math.sin(time * 2.1 + i * .9) * .018 * (1 - local);
            const squareAngle = Math.round(pose.rotation.z / (Math.PI / 2)) * Math.PI / 2;
            dummy.rotation.set((pose.rotation.x + wind * .16) * (1 - local) - Math.PI / 2 * local,
              pose.rotation.y * (1 - local), (pose.rotation.z + wind * .23) * (1 - local) + squareAngle * local);
            if (local === 1) dummy.rotation.set(-Math.PI / 2, 0, squareAngle);
            dummy.scale.setScalar(pose.size * (1 - local) + cell * local);
            dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
            mesh.setColorAt(i, tempColor.copy(leafColors[pose.color]).lerp(pose.ink, local));
            reveal.setX(i, local);
          });
          mesh.instanceMatrix.needsUpdate = true; reveal.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        };
        animateLeaves(leaves, leafPoses, leafReveal, false);
        animateLeaves(litter, litterPoses, litterReveal, true);
        grassPoses.forEach((pose, i) => {
          const local = treeTransition(progress, (i % 13) / 12).settle;
          const wind = reduced ? 0 : treeWind(time, pose.origin.x, pose.origin.z);
          dummy.position.copy(pose.origin).lerp(pose.scan, local);
          dummy.rotation.set(-Math.PI / 2 * local + wind * .18 * (1 - local), pose.angle * (1 - local), wind * .23 * (1 - local));
          if (local === 1) dummy.rotation.set(-Math.PI / 2, 0, 0);
          dummy.scale.set(pose.width * (1 - local) + cell * local,
            pose.height * (1 - local) + cell * local, 1);
          dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix);
          grass.setColorAt(i, tempColor.copy(grassColors[pose.color]).lerp(pose.ink, local));
          grassReveal.setX(i, local);
          if (i % 36 === 0 && i / 36 < seedHeads.count) {
            dummy.position.copy(pose.origin);
            dummy.position.y += pose.height;
            dummy.position.x += wind * pose.height * .2;
            dummy.rotation.set(0, pose.angle, wind * .15);
            dummy.scale.setScalar(1); dummy.updateMatrix(); seedHeads.setMatrixAt(i / 36, dummy.matrix);
          }
        });
        grass.instanceMatrix.needsUpdate = true; grassReveal.needsUpdate = true;
        if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
        seedHeads.instanceMatrix.needsUpdate = true; seedHeads.visible = settle < 1; seedMat.opacity = 1 - settle;
        const positions = rainGeometry.attributes.position.array;
        rainSeeds.forEach(([x, y, z], i) => {
          const height = ((y - time * 2.2) % 5 + 5) % 5;
          positions[i * 6] = x; positions[i * 6 + 1] = height; positions[i * 6 + 2] = z;
          positions[i * 6 + 3] = x; positions[i * 6 + 4] = height - .14; positions[i * 6 + 5] = z;
        });
        rainGeometry.attributes.position.needsUpdate = true;
        fallingSeeds.forEach(([x, y, z], i) => {
          dummy.position.set(x + Math.sin(time + i) * .12, reduced ? .04 : ((y - time * .24) % 4 + 4) % 4, z);
          dummy.rotation.set(-1.3, time * .2 + i, Math.sin(time + i) * .3);
          dummy.scale.setScalar(.12); dummy.updateMatrix(); fallen.setMatrixAt(i, dummy.matrix);
        });
        fallen.instanceMatrix.needsUpdate = true;
        renderer.render(scene, camera);
        if (!reduced) frame = requestAnimationFrame(render);
      } catch { destroy(); onFailure(); }
    };
    wake = () => { if (!destroyed && !document.hidden && !frame) frame = requestAnimationFrame(render); };
    const resize = () => {
      if (destroyed) return;
      const width = Math.max(host.clientWidth, 1), height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      const aspect = width / height;
      const halfHeight = Math.max(3.15, (groundSize * .70) / aspect);
      // Snap the settled grid to physical pixels, including its origin, to avoid soft finder edges.
      const physicalWidth = Math.floor(width * pixelRatio), physicalHeight = Math.floor(height * pixelRatio);
      const modulePixels = Math.max(1, Math.floor(cell * physicalHeight / (2 * halfHeight) * 1.25));
      scanZoom = modulePixels * 2 * halfHeight / (cell * physicalHeight);
      scanFocus.set(((physicalWidth - size * modulePixels) % 2) * .5 * cell / modulePixels, 0,
        ((physicalHeight - size * modulePixels) % 2) * .5 * cell / modulePixels);
      camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
      camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix(); wake();
    };
    observer = new ResizeObserver(resize); observer.observe(host);
    renderer.domElement.addEventListener('webglcontextlost', lost);
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', preference);
    resize();
    return {
      setQr(value) { target = value ? 1 : 0; last = 0; wake(); },
      destroy
    };
  } catch (error) { destroy(); throw error; }
}
