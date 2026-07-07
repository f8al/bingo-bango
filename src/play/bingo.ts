/**
 * Pure BINGO win-detection for a square card. No DOM, no React — just index
 * math over a `gridSize × gridSize` card, so it is trivially unit-testable.
 *
 * A "line" is a full row, full column, or one of the two diagonals. The free
 * space (when present) is always considered marked.
 */

import type { BingoCard } from '../cards';

/** A completed line, described for UI highlighting. */
export interface WinningLine {
  kind: 'row' | 'col' | 'diag';
  /** Row/column index for rows/cols; 0 (↘) or 1 (↗) for diagonals. */
  index: number;
  /** The row-major cell indices that make up the line. */
  cells: number[];
}

/** Enumerate all candidate winning lines for an N×N grid. */
export function winningLines(gridSize: number): WinningLine[] {
  const lines: WinningLine[] = [];

  for (let r = 0; r < gridSize; r++) {
    const cells: number[] = [];
    for (let c = 0; c < gridSize; c++) cells.push(r * gridSize + c);
    lines.push({ kind: 'row', index: r, cells });
  }

  for (let c = 0; c < gridSize; c++) {
    const cells: number[] = [];
    for (let r = 0; r < gridSize; r++) cells.push(r * gridSize + c);
    lines.push({ kind: 'col', index: c, cells });
  }

  const diagDown: number[] = [];
  const diagUp: number[] = [];
  for (let i = 0; i < gridSize; i++) {
    diagDown.push(i * gridSize + i);
    diagUp.push(i * gridSize + (gridSize - 1 - i));
  }
  lines.push({ kind: 'diag', index: 0, cells: diagDown });
  lines.push({ kind: 'diag', index: 1, cells: diagUp });

  return lines;
}

/**
 * The set of cell indices that count as marked: the player's marks plus any
 * free space on the card (which is always marked).
 */
export function effectiveMarks(card: BingoCard, marked: ReadonlySet<number>): Set<number> {
  const all = new Set<number>(marked);
  card.cells.forEach((cell, i) => {
    if (cell.isFreeSpace) all.add(i);
  });
  return all;
}

/** Return every completed line for the given card and player marks. */
export function detectWins(card: BingoCard, marked: ReadonlySet<number>): WinningLine[] {
  const effective = effectiveMarks(card, marked);
  return winningLines(card.gridSize).filter((line) =>
    line.cells.every((idx) => effective.has(idx)),
  );
}

/** Convenience predicate: does the card currently have at least one BINGO? */
export function hasBingo(card: BingoCard, marked: ReadonlySet<number>): boolean {
  return detectWins(card, marked).length > 0;
}
