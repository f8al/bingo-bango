/**
 * Renders a single bingo card as a responsive grid of picture squares.
 *
 * Every square shows a picture — the song/artist's album art, or a colored
 * fallback tile when no artwork is available (e.g. demo data) — plus the label
 * and a SONG/ARTIST tag. When `interactive` is set, cells can be tapped to mark
 * them and completed lines are highlighted with an announced BINGO state.
 */

import { useMemo, useState } from 'react';
import type { BingoCard, CardCell } from '../../cards';
import { detectWins } from '../../play/bingo';

interface Props {
  card: BingoCard;
  interactive?: boolean;
  /** Shrinks text for thumbnail contexts (the results grid). */
  compact?: boolean;
  /** Larger text/labels for full-page print. */
  print?: boolean;
}

/** Deterministic hue for a fallback tile, derived from the label. */
function hueOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function BingoCardView({ card, interactive = false, compact = false, print = false }: Props) {
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

  const labelSize = print ? 'text-sm' : compact ? 'text-[9px]' : 'text-[11px] sm:text-xs';
  const tagSize = print ? 'text-[9px]' : compact ? 'text-[6px]' : 'text-[7px] sm:text-[9px]';

  const renderInner = (cell: CardCell) => {
    if (cell.isFreeSpace || !cell.square) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--color-spotify)] text-black">
          <span className={print ? 'text-3xl' : 'text-lg'}>★</span>
          <span className={`font-bold ${print ? 'text-base' : 'text-[10px]'}`}>FREE</span>
        </div>
      );
    }
    const sq = cell.square;
    const isArtist = sq.kind === 'artist';
    return (
      <div className="flex h-full w-full flex-col">
        <div className="relative flex-1 overflow-hidden bg-black/40">
          {sq.image ? (
            <img
              src={sq.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center font-black text-white/90"
              style={{ backgroundColor: `hsl(${hueOf(sq.label)} 55% 40%)` }}
            >
              <span className={print ? 'text-4xl' : 'text-xl'}>{isArtist ? '♪' : '♫'}</span>
            </div>
          )}
        </div>
        <div className="bg-black/60 px-0.5 py-0.5 text-center leading-tight text-white print:bg-white print:text-black">
          <div
            className={`font-bold uppercase tracking-wider ${tagSize} ${
              isArtist ? 'text-sky-300 print:text-sky-700' : 'text-amber-300 print:text-amber-700'
            }`}
          >
            {isArtist ? 'Artist' : 'Song'}
          </div>
          <div className={`font-semibold ${labelSize} line-clamp-2`}>{sq.label}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {!print && (
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
      )}
      <div
        className="grid gap-1 rounded-xl bg-white/5 p-1 print:gap-0.5 print:bg-transparent print:p-0"
        style={{ gridTemplateColumns: `repeat(${card.gridSize}, minmax(0, 1fr))` }}
        role="grid"
        aria-label={`Bingo card ${card.id}`}
      >
        {card.cells.map((cell, idx) => {
          const isMarked = marked.has(idx) || cell.isFreeSpace;
          const isWinning = winningCells.has(idx);
          const cellClass =
            'relative flex aspect-square overflow-hidden rounded-lg border border-white/10 print:border-black/30';
          const overlay =
            interactive && isMarked && !cell.isFreeSpace ? (
              <span
                className={`pointer-events-none absolute inset-0 grid place-items-center text-3xl font-black text-black ${
                  isWinning ? 'bg-[var(--color-spotify)]/85' : 'bg-[var(--color-spotify)]/70'
                }`}
              >
                ✓
              </span>
            ) : null;

          if (interactive && !cell.isFreeSpace) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggle(idx, cell.isFreeSpace)}
                aria-pressed={isMarked}
                aria-label={`${cell.square?.kind === 'artist' ? 'Artist' : 'Song'}: ${cell.square?.label}${isMarked ? ', marked' : ''}`}
                className={cellClass}
              >
                {renderInner(cell)}
                {overlay}
              </button>
            );
          }
          return (
            <div key={idx} role="gridcell" className={cellClass}>
              {renderInner(cell)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
