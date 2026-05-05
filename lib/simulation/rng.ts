/**
 * Deterministic pseudo-random number generator and shuffle utility.
 *
 * Uses a hash-based PRNG seeded with an unsigned 32-bit integer so that
 * simulation runs are fully reproducible given the same seed.
 */

export function createRng(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rng: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const temp = result[index] as T;
    result[index] = result[swapIndex] as T;
    result[swapIndex] = temp;
  }
  return result;
}
