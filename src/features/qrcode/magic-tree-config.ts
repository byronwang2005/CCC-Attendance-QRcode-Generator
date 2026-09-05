/** Pantone Golden Apricot / Autumn Maple inspired screen colors, not official conversions. */
export const TREE_PALETTE = {
  background: '#F6F1E7',
  leaf: ['#E8BC68', '#DFA06B', '#B87545'],
  grass: ['#E8D8AA', '#F0E3BE', '#D4BD87'],
  scan: ['#946631', '#986333', '#9B6137'],
  stone: ['#E2DAC6', '#DED5BD', '#E8DFCC'],
  bark: '#78543D'
} as const;

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
