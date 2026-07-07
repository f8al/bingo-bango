/**
 * Renders a single bingo card as a responsive grid. When `interactive` is set,
 * cells can be tapped to mark them and completed lines are highlighted with an
 * announced BINGO state.
 */

import { useMemo, useState } from 'react';
import type { BingoCard } from '../../cards';
import { detectWins } from '../../play/bingo';

interface Props {
  card: BingoCard;
  interactive?: boolean;
  /** Shrinks text/padding for print or thumbnail contexts. */
  compact?: boolean;
}

export function BingoCardView({ card, interactive = false, compact = false }: Props) {
  const [marked, setMarked] = useState<Set<number>>(() => new Set());

  const wins = useMemo(
    () => (interactive ? detectWins(card, marked) : []),
    [interactive, card, marked],
  );
  const winningCells = useMemo(() => {
    const s = new Set<number>();
    wins.forEach((line) => line.cells.forEach((c) => s.add(c)));
    return s;
  }, [wins]);

  const toggle = (idx: number, isFree: boolean) => {
    if (!interactive || isFree) return;
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs opacity-70">
        <span className="font-mono tracking-wider">{card.id}</span>
        {interactive && wins.length > 0 && (
          <span
            className="rounded-full bg-[var(--color-spotify)] px-2 py-0.5 font-bold text-black"
            role="status"
            aria-live="assertive"
          >
            BINGO!
          </span>
        )}
      </div>
      <div
        className="grid gap-1.5 rounded-xl bg-white/5 p-1.5"
        style={{ gridTemplateColumns: `repeat(${card.gridSize}, minmax(0, 1fr))` }}
        role="grid"
        aria-label={`Bingo card ${card.id}`}
      >
        {card.cells.map((cell, idx) => {
          const isMarked = marked.has(idx) || cell.isFreeSpace;
          const isWinning = winningCells.has(idx);
          const base =
            'relative flex aspect-square flex-col items-center justify-center rounded-lg text-center leading-tight transition-colors overflow-hidden';
          const pad = compact ? 'p-0.5' : 'p-1 sm:p-2';
          const tone = cell.isFreeSpace
            ? 'bg-[var(--color-spotify)] text-black font-bold'
            : isWinning
              ? 'bg-[var(--color-spotify)]/80 text-black'
              : isMarked
                ? 'bg-white/25 text-white'
                : 'bg-white/10 text-white hover:bg-white/15';

          const content = cell.isFreeSpace ? (
            <span className={compact ? 'text-[10px]' : 'text-xs sm:text-sm'}>★ FREE</span>
          ) : (
            <>
              <span
                className={`font-semibold ${compact ? 'text-[8px]' : 'text-[10px] sm:text-xs'} line-clamp-3`}
              >
                {cell.song?.title}
              </span>
              <span
                className={`opacity-70 ${compact ? 'text-[7px]' : 'text-[9px] sm:text-[11px]'} line-clamp-2`}
              >
                {cell.song?.artists.join(', ')}
              </span>
            </>
          );

          const cellClass = `${base} ${pad} ${tone}`;

          return interactive && !cell.isFreeSpace ? (
            <button
              key={idx}
              type="button"
              onClick={() => toggle(idx, cell.isFreeSpace)}
              aria-pressed={isMarked}
              aria-label={`${cell.song?.title} by ${cell.song?.artists.join(', ')}${isMarked ? ', marked' : ''}`}
              className={cellClass}
            >
              {content}
              {isMarked && !isWinning && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl text-[var(--color-spotify)]">
                  ✓
                </span>
              )}
            </button>
          ) : (
            <div key={idx} role="gridcell" className={cellClass}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
