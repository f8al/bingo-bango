import { describe, it, expect } from 'vitest';
import {
  generateCards,
  dedupeSongs,
  squaresPerCard,
  CardGenerationError,
} from './generate.js';
import type { Song } from './types.js';

/** Build a pool of `n` uniquely-identified mock songs. */
function pool(n: number): Song[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i + 1}`,
    title: `Title ${i + 1}`,
    artists: [`Artist ${i + 1}`],
  }));
}

describe('dedupeSongs', () => {
  it('removes duplicate ids, keeping first-seen order', () => {
    const songs: Song[] = [
      { id: 'a', title: 'A', artists: [] },
      { id: 'b', title: 'B', artists: [] },
      { id: 'a', title: 'A (dupe)', artists: [] },
      { id: 'c', title: 'C', artists: [] },
      { id: 'b', title: 'B (dupe)', artists: [] },
    ];
    const out = dedupeSongs(songs);
    expect(out.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(out[0]?.title).toBe('A'); // first-seen instance is kept
  });
});

describe('squaresPerCard', () => {
  it('accounts for the free space', () => {
    expect(squaresPerCard(5, true)).toBe(24);
    expect(squaresPerCard(5, false)).toBe(25);
    expect(squaresPerCard(3, true)).toBe(8);
  });
});

describe('generateCards — structure', () => {
  it('produces the requested count of cards', () => {
    const result = generateCards(pool(40), { count: 6, seed: 's' });
    expect(result.cards).toHaveLength(6);
  });

  it('each card has gridSize^2 cells in row-major order', () => {
    const result = generateCards(pool(40), { gridSize: 5, count: 3, seed: 's' });
    for (const card of result.cards) {
      expect(card.gridSize).toBe(5);
      expect(card.cells).toHaveLength(25);
    }
  });

  it('reports poolSize and squaresPerCard', () => {
    const result = generateCards(pool(40), { gridSize: 5, count: 2, seed: 's' });
    expect(result.poolSize).toBe(40);
    expect(result.squaresPerCard).toBe(24);
  });

  it('counts poolSize by unique songs after de-duplication', () => {
    const dupey = [...pool(30), ...pool(30)]; // 30 unique ids, listed twice
    const result = generateCards(dupey, { gridSize: 5, count: 1, seed: 's' });
    expect(result.poolSize).toBe(30);
  });

  it('places exactly one centered free space when enabled (odd grid)', () => {
    const result = generateCards(pool(40), { gridSize: 5, freeSpace: true, count: 4, seed: 's' });
    for (const card of result.cards) {
      const freeCells = card.cells.filter((c) => c.isFreeSpace);
      expect(freeCells).toHaveLength(1);
      const center = (5 * 5 - 1) / 2; // index 12
      expect(card.cells[center]?.isFreeSpace).toBe(true);
      expect(card.cells[center]?.song).toBeNull();
    }
  });

  it('has no free space when disabled, filling all squares with songs', () => {
    const result = generateCards(pool(40), { gridSize: 5, freeSpace: false, count: 2, seed: 's' });
    for (const card of result.cards) {
      expect(card.cells.some((c) => c.isFreeSpace)).toBe(false);
      expect(card.cells.every((c) => c.song !== null)).toBe(true);
    }
  });

  it('uses distinct songs within a single card', () => {
    const result = generateCards(pool(40), { gridSize: 5, count: 5, seed: 's' });
    for (const card of result.cards) {
      const ids = card.cells.filter((c) => !c.isFreeSpace).map((c) => c.song?.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('gives every card a unique, non-empty, formatted id', () => {
    const result = generateCards(pool(40), { count: 12, seed: 's' });
    const ids = result.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9A-F]{4}-\d{2,}$/);
    }
  });
});

describe('generateCards — determinism', () => {
  it('reproduces the same batch for the same seed + pool + options', () => {
    const p = pool(40);
    const a = generateCards(p, { gridSize: 5, count: 5, seed: 'repro' });
    const b = generateCards(p, { gridSize: 5, count: 5, seed: 'repro' });
    expect(a).toEqual(b);
  });

  it('produces different batches for different seeds', () => {
    const p = pool(40);
    const a = generateCards(p, { count: 5, seed: 'seed-A' });
    const b = generateCards(p, { count: 5, seed: 'seed-B' });
    const sigA = a.cards.map((c) => c.cells.map((x) => x.song?.id ?? '*').join(',')).join('|');
    const sigB = b.cards.map((c) => c.cells.map((x) => x.song?.id ?? '*').join(',')).join('|');
    expect(sigA).not.toBe(sigB);
  });

  it('echoes the provided seed, and returns a random one otherwise', () => {
    const provided = generateCards(pool(40), { count: 1, seed: 'mine' });
    expect(provided.seed).toBe('mine');
    const random = generateCards(pool(40), { count: 1 });
    expect(random.seed).toMatch(/^[0-9A-F]{8}$/);
  });
});

describe('generateCards — batch uniqueness', () => {
  it('produces cards that are all distinct within a batch', () => {
    const result = generateCards(pool(40), { gridSize: 5, count: 20, seed: 'uniq' });
    const sigs = result.cards.map((c) =>
      c.cells.map((x) => (x.isFreeSpace ? '*' : x.song?.id)).join('|'),
    );
    expect(new Set(sigs).size).toBe(result.cards.length);
  });

  it('throws when a unique batch is impossible for the pool size', () => {
    // 2x2, no free space => 4 squares; a pool of exactly 4 songs yields only
    // 4! = 24 distinct arrangements, so 100 unique cards can never be produced
    // and generation must give up (rather than loop forever).
    expect(() =>
      generateCards(pool(4), { gridSize: 2, freeSpace: false, count: 100 }),
    ).toThrow(CardGenerationError);
  });
});

describe('generateCards — validation', () => {
  it('rejects a non-positive count', () => {
    expect(() => generateCards(pool(40), { count: 0 })).toThrow(CardGenerationError);
    expect(() => generateCards(pool(40), { count: -3 })).toThrow(CardGenerationError);
  });

  it('rejects a non-integer count', () => {
    expect(() => generateCards(pool(40), { count: 2.5 })).toThrow(CardGenerationError);
  });

  it('rejects a non-positive grid size', () => {
    expect(() => generateCards(pool(40), { gridSize: 0, count: 1 })).toThrow(CardGenerationError);
    expect(() => generateCards(pool(40), { gridSize: -5, count: 1 })).toThrow(CardGenerationError);
  });

  it('rejects a free space on an even grid', () => {
    expect(() =>
      generateCards(pool(40), { gridSize: 4, freeSpace: true, count: 1 }),
    ).toThrow(CardGenerationError);
  });

  it('allows an even grid when free space is disabled', () => {
    const result = generateCards(pool(40), { gridSize: 4, freeSpace: false, count: 1, seed: 's' });
    expect(result.cards[0]?.cells).toHaveLength(16);
  });

  it('rejects a pool that is too small, counted by UNIQUE songs', () => {
    // 24 songs are needed for a 5x5 with free space. 30 raw songs but only 20
    // unique => must fail.
    const raw = [...pool(20), ...pool(20)]; // 20 unique ids
    expect(() => generateCards(raw, { gridSize: 5, freeSpace: true, count: 1 })).toThrow(
      CardGenerationError,
    );
  });

  it('accepts a pool that is exactly large enough', () => {
    const result = generateCards(pool(24), { gridSize: 5, freeSpace: true, count: 1, seed: 's' });
    expect(result.squaresPerCard).toBe(24);
    expect(result.cards).toHaveLength(1);
  });
});
