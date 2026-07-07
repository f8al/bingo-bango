/**
 * The card-generation engine.
 *
 * Pure and dependency-free (no Spotify, no DOM): it takes a pool of songs plus
 * options and produces a deterministic batch of bingo cards. Determinism comes
 * from a single seeded RNG stream (see {@link ./rng}); the same seed + pool +
 * options always reproduces the same batch, which is what makes shareable seeds
 * and reproducible PDFs possible.
 */

import type { BingoCard, CardCell, CardOptions, GenerateResult, Song } from './types.js';
import { makeRng, generateRandomSeed, xmur3, type Rng } from './rng.js';
import { shuffle } from './shuffle.js';

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

/** Number of song squares per card for a given grid size and free-space flag. */
export function squaresPerCard(gridSize: number, freeSpace: boolean): number {
  return gridSize * gridSize - (freeSpace ? 1 : 0);
}

/** Row-major index of the centered free space for an odd grid size. */
function centerIndex(gridSize: number): number {
  return (gridSize * gridSize - 1) / 2;
}

/**
 * Build a single card's cells from a shuffled selection of songs.
 * `selection.length` must equal the number of song squares required.
 */
function buildCells(selection: Song[], gridSize: number, freeSpace: boolean): CardCell[] {
  const total = gridSize * gridSize;
  const center = freeSpace ? centerIndex(gridSize) : -1;
  const cells: CardCell[] = [];
  let songPtr = 0;
  for (let i = 0; i < total; i++) {
    if (i === center) {
      cells.push({ song: null, isFreeSpace: true });
    } else {
      cells.push({ song: selection[songPtr++] as Song, isFreeSpace: false });
    }
  }
  return cells;
}

/**
 * A canonical signature for a card, used to enforce batch-wide uniqueness.
 * Two cards with the same songs in the same positions share a signature.
 */
function cardSignature(cells: CardCell[]): string {
  return cells.map((c) => (c.isFreeSpace ? '*' : (c.song as Song).id)).join('|');
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
      `not enough unique songs: need at least ${needed} but pool has ${poolSize}`,
    );
  }
}

/** Generate one card from a fresh shuffle of the pool. */
function generateOneCard(
  pool: Song[],
  gridSize: number,
  freeSpace: boolean,
  rng: Rng,
): CardCell[] {
  const needed = squaresPerCard(gridSize, freeSpace);
  const selection = shuffle(pool, rng).slice(0, needed);
  return buildCells(selection, gridSize, freeSpace);
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

  const pool = dedupeSongs(songs);
  validate(pool.length, gridSize, freeSpace, count);

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
        `unable to generate ${count} unique cards from a pool of ${pool.length} ` +
          `after ${attempts} attempts; increase the pool size or reduce the count`,
      );
    }
    attempts++;
    const cells = generateOneCard(pool, gridSize, freeSpace, rng);
    const sig = cardSignature(cells);
    if (signatures.has(sig)) continue;
    signatures.add(sig);
    const index = String(cards.length + 1).padStart(idWidth, '0');
    cards.push({ id: `${prefix}-${index}`, gridSize, cells });
  }

  return {
    cards,
    seed,
    poolSize: pool.length,
    squaresPerCard: squaresPerCard(gridSize, freeSpace),
  };
}
