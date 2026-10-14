/**
 * Deterministic pseudo-random helpers.
 *
 * Simulated data and the mock weather provider must be reproducible: the same
 * seed string always yields the same stream. This keeps seeded records stable
 * across runs and makes the demo re-runnable.
 */

/** FNV-1a 32-bit hash of a string. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: small, fast, deterministic PRNG returning [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience: a deterministic generator seeded by a string. */
export function seededRandom(seed: string): () => number {
  return mulberry32(hashString(seed));
}
