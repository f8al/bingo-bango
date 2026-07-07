import { describe, it, expect } from 'vitest';
import { winningLines, detectWins, hasBingo, effectiveMarks } from './bingo';
import { generateCards, type BingoCard } from '../cards';

function buildCard(): BingoCard {
  // Deterministic 5x5 card with a centered free space at index 12.
  const pool = Array.from({ length: 40 }, (_, i) => ({
    id: `t${i}`,
    title: `T${i}`,
    artists: ['A'],
  }));
  return generateCards(pool, { gridSize: 5, freeSpace: true, count: 1, seed: 'bingo' }).cards[0]!;
}

describe('winningLines', () => {
  it('enumerates rows, columns, and both diagonals', () => {
    const lines = winningLines(5);
    // 5 rows + 5 cols + 2 diagonals
    expect(lines).toHaveLength(12);
    expect(lines.filter((l) => l.kind === 'row')).toHaveLength(5);
    expect(lines.filter((l) => l.kind === 'col')).toHaveLength(5);
    expect(lines.filter((l) => l.kind === 'diag')).toHaveLength(2);
  });

  it('computes correct diagonal indices for a 3x3', () => {
    const diags = winningLines(3).filter((l) => l.kind === 'diag');
    expect(diags[0]?.cells).toEqual([0, 4, 8]); // ↘
    expect(diags[1]?.cells).toEqual([2, 4, 6]); // ↗
  });
});

describe('effectiveMarks', () => {
  it('always includes the free space', () => {
    const card = buildCard();
    const eff = effectiveMarks(card, new Set());
    expect(eff.has(12)).toBe(true); // centered free space
  });
});

describe('detectWins / hasBingo', () => {
  it('detects a completed top row (free space not needed)', () => {
    const card = buildCard();
    const marks = new Set([0, 1, 2, 3, 4]);
    const wins = detectWins(card, marks);
    expect(wins.some((w) => w.kind === 'row' && w.index === 0)).toBe(true);
    expect(hasBingo(card, marks)).toBe(true);
  });

  it('detects a column win', () => {
    const card = buildCard();
    const marks = new Set([2, 7, 12, 17, 22]); // middle column; 12 is free anyway
    expect(hasBingo(card, marks)).toBe(true);
  });

  it('uses the free space to complete a diagonal', () => {
    const card = buildCard();
    // Main diagonal is 0,6,12,18,24; index 12 is the free space so we only mark 4.
    const marks = new Set([0, 6, 18, 24]);
    const wins = detectWins(card, marks);
    expect(wins.some((w) => w.kind === 'diag')).toBe(true);
  });

  it('reports no win for an incomplete line', () => {
    const card = buildCard();
    expect(hasBingo(card, new Set([0, 1, 2, 3]))).toBe(false);
  });
});
