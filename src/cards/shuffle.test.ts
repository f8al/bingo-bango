import { describe, it, expect } from 'vitest';
import { shuffle, shuffleInPlace } from './shuffle.js';
import { makeRng } from './rng.js';

describe('shuffle', () => {
  it('shuffle returns a permutation (same multiset of elements)', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = shuffle(input, makeRng('perm'));
    expect(out.slice().sort((a, b) => a - b)).toEqual(input);
  });

  it('shuffle does not mutate its input', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = input.slice();
    shuffle(input, makeRng('immutable'));
    expect(input).toEqual(copy);
  });

  it('shuffleInPlace mutates and returns the same array reference', () => {
    const input = [1, 2, 3, 4, 5];
    const returned = shuffleInPlace(input, makeRng('inplace'));
    expect(returned).toBe(input);
    expect(returned.slice().sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('is deterministic for a given seed', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8], makeRng('det'));
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8], makeRng('det'));
    expect(a).toEqual(b);
  });

  it('produces different orderings for different seeds', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8], makeRng('seedA'));
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8], makeRng('seedB'));
    expect(a).not.toEqual(b);
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffle([], makeRng('x'))).toEqual([]);
    expect(shuffle([42], makeRng('x'))).toEqual([42]);
  });

  it('is statistically unbiased across all positions', () => {
    // For each element, count how often it lands in each position across many
    // shuffles. A biased shuffle (e.g. the naive "swap i with random index")
    // would produce a visibly skewed distribution; Fisher–Yates should be flat.
    const n = 4;
    const trials = 60000;
    const counts: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (let t = 0; t < trials; t++) {
      const rng = makeRng(`unbiased-${t}`);
      const out = shuffle([0, 1, 2, 3], rng);
      for (let pos = 0; pos < n; pos++) {
        const value = out[pos] as number;
        const row = counts[value] as number[];
        row[pos] = (row[pos] as number) + 1;
      }
    }
    const expected = trials / n;
    for (let value = 0; value < n; value++) {
      for (let pos = 0; pos < n; pos++) {
        const observed = (counts[value] as number[])[pos] as number;
        // Allow a generous 10% tolerance band around the uniform expectation.
        expect(Math.abs(observed - expected) / expected).toBeLessThan(0.1);
      }
    }
  });
});
