/**
 * The card-generation engine.
 *
 * Pure and dependency-free (no Spotify, no DOM): it takes a pool of songs plus
 * options and produces a deterministic batch of bingo cards. Determinism comes
 * from a single seeded RNG stream (see {@link ./rng}); the same seed + pool +
 * options always reproduces the same batch, which is what makes shareable seeds
 * and reproducible PDFs possible.
 */

import type { BingoCard, CardCell, CardOptions, GenerateResult, Song, Square } from './types.js';
import { makeRng, generateRandomSeed, xmur3, type Rng } from './rng.js';
import { shuffle } from './shuffle.js';
import { artistKey, normalizeArtist, titleKey } from './match.js';

/** Error thrown when a valid batch of cards cannot be produced. */
export class CardGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CardGenerationError';
  }
}

const DEFAULT_GRID_SIZE = 5;
const DEFAULT_FREE_SPACE = true;

/**
 * Cap on how many single-card attempts we make while trying to satisfy
 * batch-wide uniqueness. Scales with the batch size so large batches still get
 * a fair number of retries before we give up.
 */
const ATTEMPT_MULTIPLIER = 50;
const MIN_ATTEMPTS = 200;

/**
 * De-duplicate songs by `id`, preserving first-seen order. Later duplicates of
 * an already-seen id are dropped. Songs with empty ids are treated as distinct
 * only by their (possibly empty) id value, matching "by id" semantics.
 */
export function dedupeSongs(songs: readonly Song[]): Song[] {
  const seen = new Set<string>();
  const out: Song[] = [];
  for (const song of songs) {
    if (seen.has(song.id)) continue;
    seen.add(song.id);
    out.push(song);
  }
  return out;
}

/** Number of squares per card for a given grid size and free-space flag. */
export function squaresPerCard(gridSize: number, freeSpace: boolean): number {
  return gridSize * gridSize - (freeSpace ? 1 : 0);
}

/** The title and artist square pools derived from a song list. */
export interface SquarePool {
  titles: Square[];
  artists: Square[];
}

/**
 * Build the playable square pools from songs: one `title` square per unique
 * song (with a non-empty title), and one `artist` square per unique artist
 * (de-duplicated case-insensitively, first-seen display name kept).
 */
export function collectSquares(songs: readonly Song[]): SquarePool {
  const deduped = dedupeSongs(songs);
  const titles: Square[] = [];
  const artists: Square[] = [];
  const artistSeen = new Set<string>();

  for (const song of deduped) {
    if (song.title.length > 0) {
      titles.push({ kind: 'title', label: song.title, key: titleKey(song.id), songId: song.id });
    }
    for (const name of song.artists) {
      const norm = normalizeArtist(name);
      if (norm.length === 0 || artistSeen.has(norm)) continue;
      artistSeen.add(norm);
      artists.push({ kind: 'artist', label: name, key: artistKey(name) });
    }
  }

  return { titles, artists };
}

/**
 * Choose `need` squares for one card, aiming for a roughly even split of titles
 * and artists. When one pool is too small to hit the target, the shortfall is
 * taken from the other pool. Deterministic given `rng`; assumes the combined
 * pool has at least `need` squares.
 */
function selectSquares(pool: SquarePool, need: number, rng: Rng): Square[] {
  const { titles, artists } = pool;

  // Split as evenly as possible; for an odd count, randomize which side gets
  // the extra square so batches aren't biased toward titles.
  let wantTitles =
    need % 2 === 0 ? need / 2 : rng() < 0.5 ? Math.floor(need / 2) : Math.ceil(need / 2);
  let wantArtists = need - wantTitles;

  // Rebalance against availability so the totals still sum to `need`.
  if (wantTitles > titles.length) {
    wantArtists += wantTitles - titles.length;
    wantTitles = titles.length;
  }
  if (wantArtists > artists.length) {
    wantTitles += wantArtists - artists.length;
    wantArtists = artists.length;
  }

  const chosen = shuffle(titles, rng)
    .slice(0, wantTitles)
    .concat(shuffle(artists, rng).slice(0, wantArtists));
  return shuffle(chosen, rng);
}

/** Row-major index of the centered free space for an odd grid size. */
function centerIndex(gridSize: number): number {
  return (gridSize * gridSize - 1) / 2;
}

/**
 * Build a single card's cells from a shuffled selection of squares.
 * `selection.length` must equal the number of squares required.
 */
function buildCells(selection: Square[], gridSize: number, freeSpace: boolean): CardCell[] {
  const total = gridSize * gridSize;
  const center = freeSpace ? centerIndex(gridSize) : -1;
  const cells: CardCell[] = [];
  let ptr = 0;
  for (let i = 0; i < total; i++) {
    if (i === center) {
      cells.push({ square: null, isFreeSpace: true });
    } else {
      cells.push({ square: selection[ptr++] as Square, isFreeSpace: false });
    }
  }
  return cells;
}

/**
 * A canonical signature for a card, used to enforce batch-wide uniqueness.
 * Two cards with the same squares in the same positions share a signature.
 */
function cardSignature(cells: CardCell[]): string {
  return cells.map((c) => (c.isFreeSpace ? '*' : (c.square as Square).key)).join('|');
}

/**
 * Deterministic 4-character batch prefix derived from the seed, e.g. "A7F3".
 * Combined with a per-card index to form ids like "A7F3-01".
 */
function batchPrefix(seed: string): string {
  const hash = xmur3(seed)();
  return hash.toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
}

function validate(
  poolSize: number,
  gridSize: number,
  freeSpace: boolean,
  count: number,
): void {
  if (!Number.isInteger(count) || count <= 0) {
    throw new CardGenerationError(`count must be a positive integer, got ${count}`);
  }
  if (!Number.isInteger(gridSize) || gridSize <= 0) {
    throw new CardGenerationError(`gridSize must be a positive integer, got ${gridSize}`);
  }
  if (freeSpace && gridSize % 2 === 0) {
    throw new CardGenerationError(
      `a centered free space requires an odd gridSize, got ${gridSize}`,
    );
  }
  const needed = squaresPerCard(gridSize, freeSpace);
  if (poolSize < needed) {
    throw new CardGenerationError(
      `not enough unique squares: need at least ${needed} title+artist squares but pool has ${poolSize}`,
    );
  }
}

/**
 * Generate a deterministic batch of unique bingo cards.
 *
 * @param songs Raw song pool (may contain duplicates; de-duplicated internally).
 * @param options Grid size, free space, count, and optional seed.
 * @throws {CardGenerationError} on invalid options, too-small pools, or when a
 *   batch of the requested size cannot be made unique within the attempt cap.
 */
export function generateCards(songs: readonly Song[], options: CardOptions): GenerateResult {
  const gridSize = options.gridSize ?? DEFAULT_GRID_SIZE;
  const freeSpace = options.freeSpace ?? DEFAULT_FREE_SPACE;
  const { count } = options;

  const pool = collectSquares(songs);
  const poolSize = pool.titles.length + pool.artists.length;
  validate(poolSize, gridSize, freeSpace, count);

  const needed = squaresPerCard(gridSize, freeSpace);
  const seed = options.seed ?? generateRandomSeed();
  const rng = makeRng(seed);
  const prefix = batchPrefix(seed);
  const idWidth = Math.max(2, String(count).length);

  const cards: BingoCard[] = [];
  const signatures = new Set<string>();
  const attemptCap = Math.max(MIN_ATTEMPTS, count * ATTEMPT_MULTIPLIER);
  let attempts = 0;

  while (cards.length < count) {
    if (attempts >= attemptCap) {
      throw new CardGenerationError(
        `unable to generate ${count} unique cards from a pool of ${poolSize} squares ` +
          `after ${attempts} attempts; increase the pool size or reduce the count`,
      );
    }
    attempts++;
    const selection = selectSquares(pool, needed, rng);
    const cells = buildCells(selection, gridSize, freeSpace);
    const sig = cardSignature(cells);
    if (signatures.has(sig)) continue;
    signatures.add(sig);
    const index = String(cards.length + 1).padStart(idWidth, '0');
    cards.push({ id: `${prefix}-${index}`, gridSize, cells });
  }

  return {
    cards,
    seed,
    poolSize,
    squaresPerCard: needed,
    songCount: dedupeSongs(songs).length,
    titleCount: pool.titles.length,
    artistCount: pool.artists.length,
  };
}
