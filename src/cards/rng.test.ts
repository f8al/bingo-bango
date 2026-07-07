import { describe, it, expect } from 'vitest';
import { xmur3, mulberry32, makeRng, generateRandomSeed } from './rng.js';

describe('rng', () => {
  it('xmur3 is deterministic for the same input', () => {
    const a = xmur3('hello')();
    const b = xmur3('hello')();
    expect(a).toBe(b);
  });

  it('xmur3 differs for different inputs', () => {
    expect(xmur3('hello')()).not.toBe(xmur3('world')());
  });

  it('mulberry32 produces a deterministic sequence for a given seed', () => {
    const seed = xmur3('seed')();
    const r1 = mulberry32(seed);
    const r2 = mulberry32(seed);
    const seq1 = [r1(), r1(), r1(), r1(), r1()];
    const seq2 = [r2(), r2(), r2(), r2(), r2()];
    expect(seq1).toEqual(seq2);
  });

  it('makeRng from the same seed string yields identical streams', () => {
    const a = makeRng('same');
    const b = makeRng('same');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('makeRng from different seeds yields different streams', () => {
    const a = makeRng('one');
    const b = makeRng('two');
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });

  it('produces values within the half-open range [0, 1)', () => {
    const rng = makeRng('range-check');
    for (let i = 0; i < 10000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('generateRandomSeed returns an 8-char uppercase hex string', () => {
    const seed = generateRandomSeed();
    expect(seed).toMatch(/^[0-9A-F]{8}$/);
  });

  it('generateRandomSeed generally returns distinct values', () => {
    const seeds = new Set<string>();
    for (let i = 0; i < 50; i++) seeds.add(generateRandomSeed());
    // Collisions across 50 draws of a 32-bit space are astronomically unlikely.
    expect(seeds.size).toBeGreaterThan(45);
  });
});
