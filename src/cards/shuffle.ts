/**
 * Unbiased Fisher–Yates shuffling, driven by an injected {@link Rng}.
 *
 * Injecting the RNG keeps these functions pure and deterministic: the caller
 * controls the randomness source, so shuffles are reproducible under a seeded
 * generator and easy to test.
 */

import type { Rng } from './rng.js';

/**
 * In-place, unbiased Fisher–Yates shuffle. Mutates `array` and returns it.
 *
 * The classic backwards loop picks, for each position `i`, a uniformly random
 * index `j` in `[0, i]` and swaps. This is provably unbiased when the RNG is
 * uniform on [0, 1).
 */
export function shuffleInPlace<T>(array: T[], rng: Rng): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = array[i] as T;
    array[i] = array[j] as T;
    array[j] = tmp;
  }
  return array;
}

/**
 * Non-mutating variant: returns a shuffled copy and leaves the input untouched.
 */
export function shuffle<T>(array: readonly T[], rng: Rng): T[] {
  return shuffleInPlace(array.slice(), rng);
}
