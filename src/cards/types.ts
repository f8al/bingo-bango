/**
 * Core data types for the music-bingo card-generation engine.
 *
 * This module is intentionally free of any Spotify- or DOM-specific concerns:
 * a `Song` is just the minimal shape needed to fill a bingo square. The rest of
 * the app (Spotify fetch layer, React UI, PDF export) maps its richer data down
 * to these types before handing them to the generator.
 */

/** A single track that can occupy a bingo square. */
export interface Song {
  /** Stable unique identifier (e.g. Spotify track id). Used for de-duplication. */
  id: string;
  /** Track title, e.g. "Bohemian Rhapsody". */
  title: string;
  /** One or more performing artists, e.g. ["Queen"]. */
  artists: string[];
  /** Optional album-art URL, used by the UI but ignored by the generator. */
  albumArt?: string;
}

/** A single cell within a bingo card. Either a song square or the free space. */
export interface CardCell {
  /** The song in this cell, or `null` when this is the free space. */
  song: Song | null;
  /** True for the centered free space; false for a normal song square. */
  isFreeSpace: boolean;
}

/** A fully generated bingo card. */
export interface BingoCard {
  /** Short, human-readable, deterministic identifier, e.g. "A7F3-01". */
  id: string;
  /** Grid dimension N for an N×N card (e.g. 5 for a classic 5×5 card). */
  gridSize: number;
  /** Cells in row-major order; length is always `gridSize * gridSize`. */
  cells: CardCell[];
}

/** Options controlling a batch card generation. */
export interface CardOptions {
  /** Grid dimension N for N×N cards. Defaults to 5. */
  gridSize?: number;
  /**
   * Whether to place a centered free space. Defaults to true.
   * A centered free space requires an odd `gridSize`.
   */
  freeSpace?: boolean;
  /** Number of cards to generate. Must be a positive integer. */
  count: number;
  /**
   * Optional seed for deterministic output. When provided, the same
   * seed + pool + options always reproduces the same batch. When omitted,
   * a random seed is generated and returned in {@link GenerateResult.seed}.
   */
  seed?: string;
}

/** The result of a batch card generation. */
export interface GenerateResult {
  /** The generated cards. */
  cards: BingoCard[];
  /** The seed actually used (echoing input, or the randomly generated one). */
  seed: string;
  /** Number of unique songs available in the de-duplicated pool. */
  poolSize: number;
  /** Number of song squares that must be filled per card (excludes free space). */
  squaresPerCard: number;
}
