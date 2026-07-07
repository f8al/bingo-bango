/**
 * Deterministic, seedable pseudo-random number generation.
 *
 * We deliberately avoid `Math.random()` so that card batches are reproducible:
 * given the same seed string, `xmur3` produces the same 32-bit state and
 * `mulberry32` produces the same stream of numbers. This is what powers the
 * "same seed + pool + options => same cards" guarantee of the generator.
 *
 * Both algorithms are small, well-known, public-domain constructions.
 */

/** A pseudo-random number generator: returns a float in the half-open range [0, 1). */
export type Rng = () => number;

/**
 * xmur3 string hash. Consumes a string and returns a function that yields
 * successive 32-bit seed values. We use the first output as the seed for
 * {@link mulberry32}. Deterministic for a given input string.
 */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next(): number {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/**
 * mulberry32 PRNG. Takes a 32-bit integer seed and returns an {@link Rng} that
 * produces a deterministic sequence of floats in [0, 1). Fast and statistically
 * good enough for shuffling bingo squares.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convenience helper: derive a deterministic {@link Rng} directly from a seed
 * string by running it through {@link xmur3} then {@link mulberry32}.
 */
export function makeRng(seed: string): Rng {
  const seedFn = xmur3(seed);
  return mulberry32(seedFn());
}

/**
 * Generate a random 8-character uppercase hex seed. Uses `crypto` when available
 * (browser / modern Node) and falls back to `Math.random()` otherwise. Only used
 * when the caller does not supply an explicit seed.
 */
export function generateRandomSeed(): string {
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    cryptoObj.getRandomValues(buf);
    return (buf[0] as number).toString(16).toUpperCase().padStart(8, '0');
  }
  // Fallback: not cryptographically strong, but fine for a non-security seed.
  return Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .toUpperCase()
    .padStart(8, '0');
}
