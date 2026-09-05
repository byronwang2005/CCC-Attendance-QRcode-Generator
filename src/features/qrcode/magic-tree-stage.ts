import {
  AmbientLight, BufferGeometry, Color, CatmullRomCurve3, TubeGeometry, DirectionalLight,
  DoubleSide, Float32BufferAttribute, Group, InstancedMesh, LineBasicMaterial,
  Texture, InstancedBufferAttribute,
  LineSegments, Material, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D,
  OrthographicCamera, PlaneGeometry, Scene, Vector3, WebGLRenderer
} from 'three';
import { loadQrModules } from './qr-modules';
import { advanceTreeTransition, nearestDarkCell, TREE_PALETTE, qrProtectedCells, treeRandom, treeTransition, treeWind } from './magic-tree-config';

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
  const textures = new Set<Texture>();
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
    textures.forEach(value => value.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  };
  try {
    const random = treeRandom();
    const mobile = host.clientWidth < 600;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.setClearColor(TREE_PALETTE.background, 0);
    host.appendChild(renderer.domElement);
    const camera = new OrthographicCamera(-3, 3, 3, -3, .1, 60);
    const focus = new Vector3();
    const size = modules.length;
    const side = 3.65;
    const cell = side / size;
    const protectedCells = qrProtectedCells(size);
    const decorativeModules = modules.map((row, y) => row.map((dark, x) => dark && !protectedCells[y][x]));
    const quietEdge = side / 2 + cell * 4;
    const groundSize = (quietEdge + .035) * 2;
    const settling = { value: 0 };
    // Only the final reveal constrains projections; the resting tree has natural bark and foliage.
    const softenMaterial = (mat: MeshLambertMaterial) => {
      mat.onBeforeCompile = shader => {
        shader.uniforms.qrSettle = settling;
        shader.fragmentShader = 'uniform float qrSettle;\n' + shader.fragmentShader;
        // Scan colors remain predictable despite the scenic lighting. No noise/discard cutoff.
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
          vec3 scanInk = diffuseColor.rgb;
          outgoingLight = mix(outgoingLight, scanInk, qrSettle);
          #include <opaque_fragment>
        `);
      };
      mat.customProgramCacheKey = () => 'soft-foliage';
    };
    scene.add(new AmbientLight('#fff9ef', 1.5));
    const sun = new DirectionalLight('#fff6e4', 1.6);
    sun.position.set(-3, 8, 5); scene.add(sun);
    const environment = new Group(); scene.add(environment);
    const darkCells: Array<{ x: number; z: number }> = [];
    modules.forEach((row, z) => row.forEach((dark, x) => { if (dark) darkCells.push({ x, z }); }));
    const grassColors = TREE_PALETTE.grass.map(value => new Color(value));
    const leafColors = TREE_PALETTE.leaf.map(value => new Color(value));
    const scanColors = TREE_PALETTE.scan.map(value => new Color(value));
    const pickColor = () => { const r = random(); return r < .5 ? 0 : r < .8 ? 1 : 2; };
    const moduleColors = modules.map(row => row.map(() => Math.floor(random() * scanColors.length)));
    const tempColor = new Color();
    const dummy = new Object3D();
    const bark = material(new MeshLambertMaterial({ color: TREE_PALETTE.bark, transparent: true }));

    const branch = (a: Vector3, b: Vector3, radius: number, trunkPoints?: Vector3[]) => {
      const mid = a.clone().lerp(b, .5);
      mid.x -= .035; mid.y -= a.distanceTo(b) * .08;
      const curve = new CatmullRomCurve3(trunkPoints ?? [a, mid, b]);
      const tube = geometry(new TubeGeometry(curve, trunkPoints ? 40 : 8, radius, 6, false));
      const vertices = tube.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const t = tube.attributes.uv.getX(i);
        const center = curve.getPointAt(t);
        const taper = 1 - t * (trunkPoints ? .9 : .58);
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
        branch(trunk, middle, .045 * (1 - level / 11));
        branch(middle, end, .022);
        canopyCenters.push(middle.clone().lerp(end, .75));
      }
    }
    branch(trunkPoints[0], trunkPoints[trunkPoints.length - 1], .13, trunkPoints);
    const grassGeometry = geometry(new PlaneGeometry(1, 1, 2, 24));
    const grassVertices = grassGeometry.attributes.position;
    for (let i = 0; i < grassVertices.count; i++) {
      const y = grassVertices.getY(i) + .5;
      grassVertices.setXYZ(i, grassVertices.getX(i) * (1 - y * .94) + .32 * y * y, y, .12 * y * y);
    }
    grassGeometry.computeVertexNormals();
    const grassMat = material(new MeshLambertMaterial({ side: DoubleSide }));
    softenMaterial(grassMat);
    const compileGrass = grassMat.onBeforeCompile;
    grassMat.onBeforeCompile = (shader, renderer) => {
      compileGrass.call(grassMat, shader, renderer);
      shader.vertexShader = 'uniform float qrSettle;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        // A disk parameterized with horizontal chords; no square backing geometry.
        vec3 disk = vec3((uv.x - .5) * sqrt(max(0.0, 1.0 - pow(uv.y * 2.0 - 1.0, 2.0))), uv.y - .5, 0.0);
        transformed = mix(transformed, disk, qrSettle);
      `);
    };
    grassMat.customProgramCacheKey = () => 'living-qr-grass';
    const grassPoses: Array<{ origin: Vector3; scan: Vector3; angle: number; height: number; width: number; color: number; ink: number; diameter: number; protected: boolean; petal: number }> = [];
    darkCells.forEach(({ x, z }) => {
      const px = (x - (size - 1) / 2) * cell, pz = (z - (size - 1) / 2) * cell;
      const density = 8; // Every dark module gets a complete rosette, including on mobile.
      const patch = .5 + .5 * Math.sin(px * 4.3 + Math.cos(pz * 3.1));
      for (let i = 0; i < density; i++) {
        grassPoses.push({
          origin: new Vector3(px + (random() - .5) * cell * 2.4, .005, pz + (random() - .5) * cell * 2.4),
          scan: new Vector3(px, .008 + i * .0003, pz),
          diameter: .98, protected: protectedCells[z][x], petal: i, ink: moduleColors[z][x],
          angle: random() * Math.PI * 2,
          height: random() < .15 ? .36 + random() * .16 : .10 + patch * .12 + random() * .10,
          width: .020 + random() * .017,
          color: Math.floor((Math.sin(px * 1.8 + pz) + 1) * 1.49)
        });
      }
    });
    // Small circular grains close diagonal gaps inside solid structural clusters.
    // All four surrounding modules must be dark; separators remain untouched.
    darkCells.forEach(({x, z}) => {
      if (!protectedCells[z][x] || !modules[z][x + 1] || !modules[z + 1]?.[x] || !modules[z + 1]?.[x + 1]) return;
      const px = (x - (size - 1) / 2 + .5) * cell, pz = (z - (size - 1) / 2 + .5) * cell;
      grassPoses.push({origin: new Vector3(px, .005, pz), scan: new Vector3(px, .012, pz),
        angle: random() * Math.PI * 2, height: .18, width: .025, color: 0,
        ink: moduleColors[z][x], diameter: .60, protected: true, petal: 0});
    });
    grassGeometry.setAttribute('protectedBlade', new InstancedBufferAttribute(new Float32Array(grassPoses.map(pose => pose.protected ? 1 : 0)), 1));
    const grass = new InstancedMesh(grassGeometry, grassMat, grassPoses.length);
    grass.name = 'meadow'; grass.frustumCulled = false; environment.add(grass);

    const leafMat = material(new MeshLambertMaterial({ side: DoubleSide }));
    leafMat.onBeforeCompile = grassMat.onBeforeCompile;
    leafMat.customProgramCacheKey = grassMat.customProgramCacheKey;
    const leafGeometry = geometry(new PlaneGeometry(1, 1, 4, 24));
    const leafVertices = leafGeometry.attributes.position;
    for (let i = 0; i < leafVertices.count; i++) {
      const x = leafVertices.getX(i), y = leafVertices.getY(i);
      leafVertices.setXYZ(i, x * (.18 + .82 * Math.sin((y + .5) * Math.PI / 2)), y + .08 * Math.cos(x * 5), Math.abs(x) * .14 + y * y * .09);
    }
    leafGeometry.computeVertexNormals();
    const leafPoses: Array<{ origin: Vector3; scan: Vector3; rotation: Vector3; size: number; color: number; ink: number }> = [];
    canopyCenters.forEach((center, cluster) => {
      const count = mobile ? 115 : 145;
      const spread = .48 + random() * .14;
      const clusterColor = cluster % 7 === 0 ? 2 : cluster % 3 === 0 ? 1 : 0;
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2;
        const radius = Math.sqrt(random()) * spread;
        const origin = new Vector3(center.x + Math.cos(angle) * radius, center.y + (random() - .5) * spread * 1.3, center.z + Math.sin(angle) * radius);
        const destination = nearestDarkCell(decorativeModules, origin.x, origin.z, side);
        // Reject outlying leaves instead of pulling them across the whole scene.
        if (destination.distance > .32) continue;
        const dx = Math.round(destination.x / cell + (size - 1) / 2), dz = Math.round(destination.z / cell + (size - 1) / 2);
        leafPoses.push({ ink: moduleColors[dz][dx], origin, scan: new Vector3(destination.x, origin.y, destination.z),
          rotation: new Vector3(-.35 - random() * 1.4, random() * 1.1 - .55, random() * Math.PI * 2),
          size: .075 + random() * .071 + (cluster % 3) * .006, color: random() < .87 ? clusterColor : pickColor() });
      }
    });
    const leaves = new InstancedMesh(leafGeometry, leafMat, leafPoses.length);
    leaves.name = 'canopy'; leaves.frustumCulled = false; environment.add(leaves);
    // A few taller seed heads break the grass silhouette, using the same wind and reveal.
    const seedMat = material(new MeshBasicMaterial({ color: TREE_PALETTE.grass[1], transparent: true, side: DoubleSide }));
    const seedHeads = new InstancedMesh(geometry(new PlaneGeometry(.025, .085)), seedMat, Math.floor(grassPoses.length / 24));
    seedHeads.frustumCulled = false; environment.add(seedHeads);

    const rainCount = mobile ? 24 : 45;
    const rainPositions = new Float32Array(rainCount * 6);
    const rainSeeds = Array.from({ length: rainCount }, () => [random() * 5 - 2.5, random() * 5, random() * 5 - 2.5]);
    const rainGeometry = geometry(new BufferGeometry());
    rainGeometry.setAttribute('position', new Float32BufferAttribute(rainPositions, 3));
    const rainMat = material(new LineBasicMaterial({ color: '#aaa393', transparent: true, opacity: .16, depthWrite: false }));
    const rain = new LineSegments(rainGeometry, rainMat); rain.frustumCulled = false; scene.add(rain);
    const fallenMat = material(new MeshBasicMaterial({ color: TREE_PALETTE.leaf[1], transparent: true, side: DoubleSide }));
    const fallen = new InstancedMesh(geometry(new PlaneGeometry(.09, .12)), fallenMat, mobile ? 8 : 14);
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
        settling.value = settle;
        const polar = (1 - p) * 1.07;
        const azimuth = (1 - p) * Math.atan2(7, 8);
        focus.set(0, 1.78 * (1 - p), 0);
        camera.position.set(12 * Math.sin(polar) * Math.sin(azimuth), focus.y + 12 * Math.cos(polar), 12 * Math.sin(polar) * Math.cos(azimuth));
        camera.up.set(0, Math.cos(p * Math.PI / 2), -Math.sin(p * Math.PI / 2));
        camera.lookAt(focus);
        camera.zoom = 1 + p * .25; camera.updateProjectionMatrix();
        rain.visible = settle < 1 && !reduced;
        rainMat.opacity = .12 * (1 - settle);
        fallen.visible = settle < 1 && !reduced;
        fallenMat.opacity = 1 - settle;
        bark.opacity = 1 - settle;
        bark.depthWrite = settle < .5;
        leafPoses.forEach((pose, i) => {
          const local = treeTransition(progress, (i % 17) / 16).settle;
          const wind = reduced ? 0 : treeWind(time, pose.origin.x, pose.origin.z);
          dummy.position.copy(pose.origin).lerp(pose.scan, local);
          dummy.position.y += reduced ? 0 : Math.sin(time * Math.PI * 2 / 5 + i * .3) * .015 * local;
          dummy.position.x += wind * .055 * (1 - local);
          dummy.position.y += Math.sin(time * 2.1 + i * .9) * .025 * (reduced ? 0 : 1 - settle);
          dummy.rotation.set(pose.rotation.x * (1 - local) - Math.PI / 2 * local + wind * .16 * (1 - local), pose.rotation.y * (1 - local), pose.rotation.z + wind * .23 * (1 - local) + (reduced ? 0 : Math.sin(time * Math.PI * 2 / 5 + i * .3) * .035 * local));
          dummy.scale.setScalar(pose.size * (1 - local) + cell * .98 * local);
          dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
          leaves.setColorAt(i, tempColor.copy(leafColors[pose.color]).lerp(scanColors[pose.ink], local));
        });
        leaves.instanceMatrix.needsUpdate = true;
        if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
        grassPoses.forEach((pose, i) => {
          const local = treeTransition(progress, (i % 13) / 12).settle;
          const wind = reduced ? 0 : treeWind(time, pose.origin.x, pose.origin.z);
          dummy.position.copy(pose.origin).lerp(pose.scan, local);
          const flutter = reduced || pose.protected ? 0 : Math.sin(time * Math.PI * 2 / 5 + pose.petal) * .025;
          dummy.position.y += local * (pose.protected ? 0 : .008 * Math.sin(time + pose.petal));
          dummy.rotation.set(-Math.PI / 2 * local + wind * .18 * (1 - local), pose.angle * (1 - local), wind * .23 * (1 - local) + (pose.protected ? 0 : pose.petal * Math.PI / 4 + flutter) * local);
          dummy.scale.set(pose.width * (1 - local) + cell * pose.diameter * local, pose.height * (1 - local) + cell * pose.diameter * local, 1 - local);
          dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix);
          grass.setColorAt(i, tempColor.copy(grassColors[pose.color]).lerp(scanColors[pose.ink], local));
          if (i % 24 === 0 && i / 24 < seedHeads.count) {
            dummy.position.y += pose.height;
            dummy.position.x += wind * pose.height * .2;
            dummy.scale.setScalar(1); dummy.updateMatrix(); seedHeads.setMatrixAt(i / 24, dummy.matrix);
          }
        });
        grass.instanceMatrix.needsUpdate = true;
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
          dummy.scale.setScalar(1); dummy.updateMatrix(); fallen.setMatrixAt(i, dummy.matrix);
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
