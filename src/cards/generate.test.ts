import { describe, it, expect } from 'vitest';
import {
  generateCards,
  dedupeSongs,
  squaresPerCard,
  collectSquares,
  CardGenerationError,
} from './generate.js';
import type { Song } from './types.js';

/** Build a pool of `n` songs, each with a unique title AND a unique artist. */
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
    ];
    expect(dedupeSongs(songs).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('collectSquares', () => {
  it('builds one title square per song and one artist square per unique artist', () => {
    const songs: Song[] = [
      { id: 's1', title: 'One', artists: ['Queen'] },
      { id: 's2', title: 'Two', artists: ['Queen'] }, // same artist → shared artist square
      { id: 's3', title: 'Three', artists: ['ABBA'] },
    ];
    const { titles, artists } = collectSquares(songs);
    expect(titles).toHaveLength(3);
    expect(artists).toHaveLength(2); // Queen, ABBA
    expect(titles[0]).toMatchObject({ kind: 'title', label: 'One', key: 't:s1', songId: 's1' });
    expect(artists.map((a) => a.label).sort()).toEqual(['ABBA', 'Queen']);
  });

  it('de-dupes artists case-insensitively and skips empty titles/artists', () => {
    const songs: Song[] = [
      { id: 's1', title: 'One', artists: ['Queen', 'queen '] },
      { id: 's2', title: '', artists: [''] },
    ];
    const { titles, artists } = collectSquares(songs);
    expect(titles).toHaveLength(1); // empty title dropped
    expect(artists).toHaveLength(1); // "Queen" and "queen " collapse
  });
});

describe('squaresPerCard', () => {
  it('accounts for the free space', () => {
    expect(squaresPerCard(5, true)).toBe(24);
    expect(squaresPerCard(5, false)).toBe(25);
  });
});

describe('generateCards — structure', () => {
  it('produces the requested count of cards', () => {
    expect(generateCards(pool(40), { count: 6, seed: 's' }).cards).toHaveLength(6);
  });

  it('each card has gridSize^2 cells in row-major order', () => {
    const result = generateCards(pool(40), { gridSize: 5, count: 3, seed: 's' });
    for (const card of result.cards) {
      expect(card.gridSize).toBe(5);
      expect(card.cells).toHaveLength(25);
    }
  });

  it('reports pool composition (songs, titles, artists, squares)', () => {
    const result = generateCards(pool(40), { gridSize: 5, count: 2, seed: 's' });
    expect(result.songCount).toBe(40);
    expect(result.titleCount).toBe(40);
    expect(result.artistCount).toBe(40); // unique artist per song
    expect(result.poolSize).toBe(80); // titles + artists
    expect(result.squaresPerCard).toBe(24);
  });

  it('counts squares from UNIQUE songs after de-duplication', () => {
    const dupey = [...pool(30), ...pool(30)]; // 30 unique ids listed twice
    const result = generateCards(dupey, { gridSize: 5, count: 1, seed: 's' });
    expect(result.songCount).toBe(30);
    expect(result.poolSize).toBe(60);
  });

  it('places exactly one centered free space when enabled (odd grid)', () => {
    const result = generateCards(pool(40), { gridSize: 5, freeSpace: true, count: 4, seed: 's' });
    for (const card of result.cards) {
      expect(card.cells.filter((c) => c.isFreeSpace)).toHaveLength(1);
      const center = (5 * 5 - 1) / 2; // index 12
      expect(card.cells[center]?.isFreeSpace).toBe(true);
      expect(card.cells[center]?.square).toBeNull();
    }
  });

  it('fills every non-free cell with a title or artist square', () => {
    const result = generateCards(pool(40), { gridSize: 5, count: 3, seed: 's' });
    for (const card of result.cards) {
      for (const cell of card.cells) {
        if (cell.isFreeSpace) continue;
        expect(cell.square).not.toBeNull();
        expect(['title', 'artist']).toContain(cell.square?.kind);
      }
    }
  });

  it('mixes both title and artist squares on a card', () => {
    const card = generateCards(pool(40), { gridSize: 5, count: 1, seed: 'mix' }).cards[0]!;
    const kinds = new Set(card.cells.filter((c) => !c.isFreeSpace).map((c) => c.square?.kind));
    expect(kinds.has('title')).toBe(true);
    expect(kinds.has('artist')).toBe(true);
  });

  it('uses distinct squares within a single card', () => {
    const result = generateCards(pool(40), { gridSize: 5, count: 5, seed: 's' });
    for (const card of result.cards) {
      const keys = card.cells.filter((c) => !c.isFreeSpace).map((c) => c.square?.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('gives every card a unique, formatted id', () => {
    const ids = generateCards(pool(40), { count: 12, seed: 's' }).cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[0-9A-F]{4}-\d{2,}$/);
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
    const sig = (seed: string) =>
      generateCards(pool(40), { count: 5, seed })
        .cards.map((c) => c.cells.map((x) => x.square?.key ?? '*').join(','))
        .join('|');
    expect(sig('seed-A')).not.toBe(sig('seed-B'));
  });

  it('echoes the provided seed, and returns a random one otherwise', () => {
    expect(generateCards(pool(40), { count: 1, seed: 'mine' }).seed).toBe('mine');
    expect(generateCards(pool(40), { count: 1 }).seed).toMatch(/^[0-9A-F]{8}$/);
  });
});

describe('generateCards — batch uniqueness', () => {
  it('produces cards that are all distinct within a batch', () => {
    const result = generateCards(pool(40), { gridSize: 5, count: 20, seed: 'uniq' });
    const sigs = result.cards.map((c) =>
      c.cells.map((x) => (x.isFreeSpace ? '*' : x.square?.key)).join('|'),
    );
    expect(new Set(sigs).size).toBe(result.cards.length);
  });

  it('throws when a unique batch is impossible for the pool size', () => {
    // 3 songs sharing one artist → 3 titles + 1 artist = exactly 4 squares.
    // A 2×2 no-free-space card needs 4 squares, so only 4! = 24 distinct
    // arrangements exist and 100 unique cards can never be produced.
    const songs: Song[] = [
      { id: 's1', title: 'A', artists: ['Solo'] },
      { id: 's2', title: 'B', artists: ['Solo'] },
      { id: 's3', title: 'C', artists: ['Solo'] },
    ];
    expect(() =>
      generateCards(songs, { gridSize: 2, freeSpace: false, count: 100 }),
    ).toThrow(CardGenerationError);
  });
});

describe('generateCards — validation', () => {
  it('rejects a non-positive or non-integer count', () => {
    expect(() => generateCards(pool(40), { count: 0 })).toThrow(CardGenerationError);
    expect(() => generateCards(pool(40), { count: -3 })).toThrow(CardGenerationError);
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

  it('rejects a pool with too few unique squares (titles + artists)', () => {
    // 11 songs → 11 titles + 11 artists = 22 squares < 24 needed for a 5×5.
    expect(() => generateCards(pool(11), { gridSize: 5, freeSpace: true, count: 1 })).toThrow(
      CardGenerationError,
    );
  });

  it('accepts a pool that is exactly large enough', () => {
    // 12 songs → 12 titles + 12 artists = 24 squares == needed for a 5×5.
    const result = generateCards(pool(12), { gridSize: 5, freeSpace: true, count: 1, seed: 's' });
    expect(result.squaresPerCard).toBe(24);
    expect(result.cards).toHaveLength(1);
  });
});
