/**
 * App-level state for a generated batch of cards.
 *
 * Holds the current `GenerateResult`, the source song pool (used by the caller
 * screen), and display metadata. Persisted to `sessionStorage` so a page reload
 * or navigating to `/card/:id` and `/call` keeps the batch around.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { GenerateResult, Song } from '../cards';

export interface Batch {
  result: GenerateResult;
  pool: Song[];
  playlistName: string;
}

interface BatchContextValue {
  batch: Batch | null;
  setBatch: (batch: Batch | null) => void;
}

const STORAGE_KEY = 'bb.batch';
const BatchContext = createContext<BatchContextValue | null>(null);

function loadInitial(): Batch | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Batch) : null;
  } catch {
    return null;
  }
}

export function BatchProvider({ children }: { children: ReactNode }) {
  const [batch, setBatchState] = useState<Batch | null>(() => loadInitial());

  useEffect(() => {
    try {
      if (batch) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(batch));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage may be unavailable (private mode); state still works in memory */
    }
  }, [batch]);

  const setBatch = useCallback((next: Batch | null) => setBatchState(next), []);
  const value = useMemo(() => ({ batch, setBatch }), [batch, setBatch]);

  return <BatchContext.Provider value={value}>{children}</BatchContext.Provider>;
}

export function useBatch(): BatchContextValue {
  const ctx = useContext(BatchContext);
  if (!ctx) throw new Error('useBatch must be used within a BatchProvider');
  return ctx;
}
