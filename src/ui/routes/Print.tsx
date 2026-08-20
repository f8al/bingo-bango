/**
 * Print-first view (`/print`): lays out the whole batch one card per page and
 * hands it straight to the browser's print dialog (→ paper, or "Save as PDF").
 *
 * This is the primary output path. It uses the browser's own print engine — no
 * heavy PDF library is loaded — so it stays fast on low-powered laptops, and it
 * naturally includes the album-art pictures on every square.
 */

import { Link } from 'react-router-dom';
import { useBatch } from '../state';
import { BingoCardView } from '../components/BingoCardView';
import { Button, Panel } from '../components/primitives';

export function Print() {
  const { batch } = useBatch();

  if (!batch) {
    return (
      <Panel className="mx-auto max-w-md text-center">
        <p className="mb-3 text-sm opacity-80">
          No cards yet. Generate a batch first, then come back here to print.
        </p>
        <Link to="/generate">
          <Button>Go to generator</Button>
        </Link>
      </Panel>
    );
  }

  const { result, playlistName } = batch;

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar — hidden when printing */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Print cards</h1>
          <p className="text-sm opacity-70">
            {result.cards.length} cards from {playlistName} — one per page. Click print, then choose
            your printer (or “Save as PDF”).
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/generate">
            <Button variant="secondary">← Back</Button>
          </Link>
          <Button onClick={() => window.print()}>🖨 Print these cards</Button>
        </div>
      </div>

      <div className="no-print rounded-xl border border-white/10 bg-white/5 p-3 text-xs opacity-70">
        Tip: in the print dialog, turn on <strong>Background graphics</strong> so the pictures and
        the green FREE space print in color. Set margins to “Default” and scale to “Fit”.
      </div>

      {/* One card per printed page */}
      <div className="flex flex-col items-center gap-8">
        {result.cards.map((card) => (
          <section
            key={card.id}
            className="print-card w-full max-w-[46rem] rounded-2xl border border-white/10 bg-white/5 p-4 print:max-w-none print:rounded-none print:border-0 print:bg-transparent print:p-0"
          >
            <div className="mb-2 flex items-baseline justify-between print:mb-1">
              <h2 className="text-lg font-black print:text-black">{playlistName}</h2>
              <span className="font-mono text-xs opacity-60 print:text-black">{card.id}</span>
            </div>
            <BingoCardView card={card} print />
          </section>
        ))}
      </div>
    </div>
  );
}
