/**
 * The main workflow: pick a source playlist (or demo pool), choose options, and
 * generate a batch of unique cards. Offers PDF export and links into play.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  generateCards,
  collectSquares,
  CardGenerationError,
  squaresPerCard,
  type Song,
} from '../../cards';
import { getMyPlaylists, getPlaylistTracks } from '../../spotify/client';
import { tracksToSongs } from '../../spotify/normalize';
import type { SpotifyPlaylistSummary } from '../../spotify/types';
import { useAuth } from '../useAuth';
import { useBatch } from '../state';
import { demoPool, DEMO_PLAYLIST_NAME } from '../mockPool';
import { Button, Field, Panel, Spinner } from '../components/primitives';
import { BingoCardView } from '../components/BingoCardView';

const GRID_SIZES = [3, 4, 5] as const;

export function Generate() {
  const { authed, configured, login } = useAuth();
  const { batch, setBatch } = useBatch();

  const [playlists, setPlaylists] = useState<SpotifyPlaylistSummary[] | null>(null);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');

  const [gridSize, setGridSize] = useState<number>(5);
  const [freeSpace, setFreeSpace] = useState<boolean>(true);
  const [count, setCount] = useState<number>(8);
  const [seed, setSeed] = useState<string>('');

  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Even grids can't have a centered free space — keep the UI consistent.
  useEffect(() => {
    if (gridSize % 2 === 0 && freeSpace) setFreeSpace(false);
  }, [gridSize, freeSpace]);

  // Load playlists once signed in.
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    setPlaylists(null);
    setPlaylistsError(null);
    getMyPlaylists()
      .then((pls) => {
        if (cancelled) return;
        setPlaylists(pls);
        if (pls[0]) setSelectedId(pls[0].id);
      })
      .catch((e: unknown) => {
        if (!cancelled) setPlaylistsError(e instanceof Error ? e.message : 'Failed to load playlists.');
      });
    return () => {
      cancelled = true;
    };
  }, [authed]);

  const usingDemo = !authed;
  const needed = squaresPerCard(gridSize, freeSpace);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      let pool: Song[];
      let playlistName: string;

      if (usingDemo) {
        pool = demoPool();
        playlistName = DEMO_PLAYLIST_NAME;
      } else {
        const pl = playlists?.find((p) => p.id === selectedId);
        if (!pl) throw new Error('Please select a playlist.');
        const items = await getPlaylistTracks(pl.id);
        pool = tracksToSongs(items);
        playlistName = pl.name;
      }

      const { titles, artists } = collectSquares(pool);
      const available = titles.length + artists.length;
      if (available < needed) {
        throw new Error(
          `This playlist only yields ${available} squares (${titles.length} songs + ` +
            `${artists.length} artists), but a ${gridSize}×${gridSize} card needs ${needed}. ` +
            `Pick a bigger playlist or a smaller grid.`,
        );
      }

      const options =
        seed.trim().length > 0
          ? { gridSize, freeSpace, count, seed: seed.trim() }
          : { gridSize, freeSpace, count };
      const result = generateCards(pool, options);
      setBatch({ result, pool, playlistName });
    } catch (e) {
      if (e instanceof CardGenerationError) setError(e.message);
      else setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }, [usingDemo, playlists, selectedId, needed, gridSize, freeSpace, count, seed, setBatch]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black">Generate cards</h1>

      {!configured && (
        <Panel className="text-sm">
          Demo mode: no Spotify app is configured, so cards are built from a built-in party
          playlist. Set <code className="rounded bg-white/10 px-1">VITE_SPOTIFY_CLIENT_ID</code> to
          use your own playlists.
        </Panel>
      )}

      <Panel className="flex flex-col gap-5">
        {/* Source */}
        {usingDemo ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="opacity-80">
              Source: <strong>{DEMO_PLAYLIST_NAME}</strong> ({demoPool().length} songs)
            </span>
            {configured && (
              <Button variant="secondary" onClick={login}>
                Connect Spotify for your playlists
              </Button>
            )}
          </div>
        ) : (
          <Field label="Playlist">
            {playlistsError ? (
              <span className="text-sm text-red-400">{playlistsError}</span>
            ) : playlists === null ? (
              <Spinner label="Loading your playlists…" />
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
              >
                {playlists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.tracks.total} tracks)
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        {/* Options */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Grid size">
            <select
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            >
              {GRID_SIZES.map((g) => (
                <option key={g} value={g}>
                  {g} × {g}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Number of cards">
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Seed (optional)">
            <input
              type="text"
              value={seed}
              placeholder="reproducible batch"
              onChange={(e) => setSeed(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            />
          </Field>

          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              checked={freeSpace}
              disabled={gridSize % 2 === 0}
              onChange={(e) => setFreeSpace(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-spotify)]"
            />
            Free space{gridSize % 2 === 0 ? ' (odd grids only)' : ''}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void generate()} disabled={busy}>
            {busy ? 'Generating…' : 'Generate'}
          </Button>
          <span className="text-xs opacity-60">
            {needed} squares per card{freeSpace ? ' (+ free space)' : ''} · mix of song titles &
            artists
          </span>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </Panel>

      {batch && <Results />}
    </div>
  );
}

function Results() {
  const { batch } = useBatch();
  const { result, playlistName } = batch!;
  const [exporting, setExporting] = useState(false);

  // Lazy-load the (heavy) PDF module only when the user actually exports.
  const exportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const { downloadCardsPdf } = await import('../../pdf/export');
      downloadCardsPdf(result.cards, 'bingo-cards.pdf', {
        title: playlistName,
        subtitle: `Powered by Spotify · seed ${result.seed}`,
      });
    } finally {
      setExporting(false);
    }
  }, [result, playlistName]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            {result.cards.length} cards from {playlistName}
          </h2>
          <p className="text-xs opacity-60">
            seed <code className="rounded bg-white/10 px-1">{result.seed}</code> · {result.songCount}{' '}
            songs → {result.poolSize} squares ({result.titleCount} titles · {result.artistCount}{' '}
            artists) · {result.squaresPerCard} per card
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button onClick={() => void exportPdf()} disabled={exporting}>
            {exporting ? 'Preparing…' : 'Export PDF'}
          </Button>
          <Link to="/call">
            <Button variant="secondary">Open caller</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.cards.map((card) => (
          <Panel key={card.id} className="flex flex-col gap-2">
            <BingoCardView card={card} compact />
            <Link
              to={`/card/${card.id}`}
              className="text-center text-xs font-medium text-[var(--color-spotify)] hover:underline"
            >
              Play / share this card →
            </Link>
          </Panel>
        ))}
      </div>
    </div>
  );
}
