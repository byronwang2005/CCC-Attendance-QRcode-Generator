/** Pantone Golden Apricot / Autumn Maple inspired screen colors, not official conversions. */
export const TREE_PALETTE = {
  background: '#F6F1E7',
  leaf: ['#E6B65B', '#D99350', '#BC713C', '#ECCB75', '#C98347'],
  grass: ['#CBB666', '#DDC681', '#A69A5D', '#D2B259', '#E2D49C'],
  // Near-equal luminance keeps large colored finder patterns below decoder local-contrast thresholds.
  scanLeaf: ['#C26031', '#C66025', '#B36431', '#B96418', '#B86330'],
  scanGrass: ['#827331', '#966E1B', '#936E2B', '#927116', '#787439'],
  stone: ['#E2DAC6', '#DED5BD', '#E8DFCC'],
  bark: '#78543D'
} as const;

/** Soft canopy coverage in ground coordinates, independent of the encoded QR. */
export function canopyCoverage(x: number, z: number, centers: ReadonlyArray<{ x: number; z: number }>) {
  let open = 1;
  for (const center of centers) {
    const distance = Math.hypot(x - center.x, z - center.z);
    const t = Math.max(0, Math.min(1, (1.02 - distance) / .64));
    open *= 1 - t * t * (3 - 2 * t);
  }
  return 1 - open;
}

export function meadowDensity(x: number, z: number, centers: ReadonlyArray<{ x: number; z: number }>) {
  return 1 - .94 * canopyCoverage(x, z, centers);
}

/** Adjacent modules have different variants; the square-radius blend never changes QR bits. */
export function qrModuleColors(size: number) {
  const random = treeRandom();
  const variants: number[][] = [];
  const colors: string[][] = [];
  for (let y = 0; y < size; y++) {
    variants[y] = []; colors[y] = [];
    for (let x = 0; x < size; x++) {
      const radius = Math.max(Math.abs(x - (size - 1) / 2), Math.abs(y - (size - 1) / 2)) / ((size - 1) / 2);
      const t = Math.max(0, Math.min(1, (radius - .45) / .4));
      const mix = t * t * (3 - 2 * t);
      const candidates = TREE_PALETTE.scanLeaf.map((inner, variant) => {
        const outer = TREE_PALETTE.scanGrass[variant];
        const color = '#' + [1, 3, 5].map(offset => Math.round(
          parseInt(inner.slice(offset, offset + 2), 16) * (1 - mix) + parseInt(outer.slice(offset, offset + 2), 16) * mix
        ).toString(16).padStart(2, '0')).join('').toUpperCase();
        return { variant, color };
      }).filter(({ variant, color }) => variant !== variants[y][x - 1] && variant !== variants[y - 1]?.[x]
        && color !== colors[y][x - 1] && color !== colors[y - 1]?.[x]);
      const chosen = candidates[Math.floor(random() * candidates.length)];
      variants[y][x] = chosen.variant; colors[y][x] = chosen.color;
    }
  }
  return colors;
}

export const TREE_TRANSITION_SECONDS = 2;
export const TREE_SETTLE_START = .25;
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
/** Core Animation easeInEaseOut: cubic-bezier(.42, 0, .58, 1). */
export function cameraEase(value: number) {
  const x = Math.max(0, Math.min(1, value));
  let t = x;
  // Invert the Bezier x coordinate before evaluating its y coordinate.
  for (let i = 0; i < 5; i++) {
    t -= (t * (1.26 + t * (-.78 + .52 * t)) - x) / (1.26 + t * (-1.56 + 1.56 * t));
  }
  return t * t * (3 - 2 * t);
}

export function treeTransition(progress: number, cohort = 0) {
  const delay = (.08 + Math.max(0, Math.min(1, cohort)) * .1) / TREE_TRANSITION_SECONDS;
  return {
    camera: cameraEase(progress),
    settle: smooth((progress - TREE_SETTLE_START - delay) / (.95 - TREE_SETTLE_START - delay))
  };
}

/** Continuous across reversals; clamp time jumps when a hidden page resumes. */
export function advanceTreeTransition(current: number, target: number, delta: number, reduced: boolean) {
  return reduced ? target : current + Math.sign(target - current) * Math.min(Math.max(0, delta) / TREE_TRANSITION_SECONDS, Math.abs(target - current));
}

export function treeWind(time: number, x: number, z: number) {
  const gust = .65 + .35 * Math.sin(time * .47);
  return gust * (Math.sin(time * 1.1 + x * 1.4 + z * .65) + .3 * Math.sin(time * 2.3 + z * 2.3));
}

export function treeRandom() {
  let seed = 74819;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

export function nearestDarkCell(modules: boolean[][], x: number, z: number, side: number) {
  const cell = side / modules.length;
  let bestX = 0, bestZ = 0, distance = Infinity;
  modules.forEach((row, iz) => row.forEach((dark, ix) => {
    if (!dark) return;
    const px = (ix - (modules.length - 1) / 2) * cell;
    const pz = (iz - (modules.length - 1) / 2) * cell;
    const d = (px - x) ** 2 + (pz - z) ** 2;
    if (d < distance) { distance = d; bestX = px; bestZ = pz; }
  }));
  return { x: bestX, z: bestZ, distance: Math.sqrt(distance) };
}

/** Conservative protection for QR functional patterns, including format/version areas. */
export function qrProtectedCells(size: number) {
  const version = (size - 17) / 4;
  const protectedCells = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const rect = (x: number, y: number, width: number, height: number) => {
    for (let j = Math.max(0, y); j < Math.min(size, y + height); j++)
      for (let i = Math.max(0, x); i < Math.min(size, x + width); i++) protectedCells[j][i] = true;
  };
  rect(0, 0, 9, 9); rect(size - 8, 0, 8, 9); rect(0, size - 8, 9, 8);
  rect(6, 0, 1, size); rect(0, 6, size, 1);
  rect(8, 0, 1, size); rect(0, 8, size, 1);
  if (version >= 7) { rect(size - 11, 0, 3, 6); rect(0, size - 11, 6, 3); }
  if (version > 1) {
    const count = Math.floor(version / 7) + 2;
    const step = version === 32 ? 26 : Math.floor((version * 4 + count * 2 + 1) / (count * 2 - 2)) * 2;
    const centers = [6];
    for (let p = size - 7; centers.length < count; p -= step) centers.splice(1, 0, p);
    centers.forEach((y, j) => centers.forEach((x, i) => {
      if ((i === 0 && j === 0) || (i === 0 && j === count - 1) || (i === count - 1 && j === 0)) return;
      rect(x - 2, y - 2, 5, 5);
    }));
  }
  return protectedCells;
}


/** Fix targets once at construction: nearest cells first, then fill holes from locally redundant particles. */
export function naturalQrTargets(points: ReadonlyArray<{ x: number; z: number }>, modules: boolean[][], side: number) {
  const size = modules.length, cell = side / size;
  const cells: Array<{ x: number; z: number }> = [];
  modules.forEach((row, z) => row.forEach((dark, x) => {
    if (dark) cells.push({ x: (x - (size - 1) / 2) * cell, z: (z - (size - 1) / 2) * cell });
  }));
  if (points.length < cells.length) throw new Error('Not enough foliage to cover the QR');
  const counts = new Int32Array(cells.length);
  const assignment = points.map(point => {
    let best = 0, distance = Infinity;
    cells.forEach((target, index) => {
      const d = (point.x - target.x) ** 2 + (point.z - target.z) ** 2;
      if (d < distance) { best = index; distance = d; }
    });
    counts[best]++;
    return best;
  });
  cells.forEach((target, index) => {
    if (counts[index]) return;
    let best = -1, distance = Infinity;
    points.forEach((point, i) => {
      if (counts[assignment[i]] < 2) return;
      const d = (point.x - target.x) ** 2 + (point.z - target.z) ** 2;
      if (d < distance) { best = i; distance = d; }
    });
    if (best < 0) throw new Error('QR foliage assignment failed');
    counts[assignment[best]]--; counts[index]++; assignment[best] = index;
  });
  return assignment.map(index => cells[index]);
}
