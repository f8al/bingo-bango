/**
 * Caller screen (`/call`): draws songs from the batch's pool in a deterministic
 * shuffled order so the host can call them out one at a time.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { makeRng, shuffle, type Song } from '../../cards';
import { useBatch } from '../state';
import { Button, Panel } from '../components/primitives';

export function Call() {
  const { batch } = useBatch();

  // Deterministic call order derived from the batch seed (distinct stream from
  // card layout via the ':call' suffix), so a given batch always calls the same.
  const order: Song[] = useMemo(() => {
    if (!batch) return [];
    return shuffle(batch.pool, makeRng(`${batch.result.seed}:call`));
  }, [batch]);

  const [drawn, setDrawn] = useState<number>(0);

  if (!batch) {
    return (
      <Panel className="mx-auto max-w-md text-center">
        <p className="mb-3 text-sm opacity-80">
          No batch yet. Generate cards first — the caller draws from the same song pool.
        </p>
        <Link to="/generate">
          <Button>Go to generator</Button>
        </Link>
      </Panel>
    );
  }

  const current = drawn > 0 ? order[drawn - 1] : null;
  const remaining = order.length - drawn;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Caller</h1>
        <span className="text-sm opacity-60">
          {drawn} / {order.length} called
        </span>
      </div>

      <Panel className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
        {current ? (
          <>
            <span className="text-xs uppercase tracking-widest opacity-60">Now playing</span>
            <span className="text-3xl font-black">{current.title}</span>
            <span className="text-lg opacity-80">{current.artists.join(', ')}</span>
          </>
        ) : (
          <span className="opacity-70">Press “Call next song” to begin.</span>
        )}
      </Panel>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => setDrawn((d) => Math.min(order.length, d + 1))} disabled={remaining === 0}>
          {remaining === 0 ? 'All songs called' : 'Call next song'}
        </Button>
        <Button variant="secondary" onClick={() => setDrawn(0)} disabled={drawn === 0}>
          Reset
        </Button>
      </div>

      {drawn > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold opacity-70">Called so far</h2>
          <ol className="flex flex-col gap-1 text-sm">
            {order.slice(0, drawn).map((s, i) => (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-1.5 ${
                  i === drawn - 1 ? 'bg-[var(--color-spotify)]/20' : 'bg-white/5'
                }`}
              >
                <span className="w-6 text-right font-mono opacity-50">{i + 1}</span>
                <span className="font-medium">{s.title}</span>
                <span className="opacity-60">— {s.artists.join(', ')}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
