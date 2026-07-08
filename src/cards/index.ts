/**
 * Public entry point for the card-generation core.
 *
 * The rest of the application (Spotify layer, React UI, PDF export) should import
 * from here rather than reaching into individual modules.
 */

export type {
  Song,
  Square,
  SquareKind,
  CardCell,
  BingoCard,
  CardOptions,
  GenerateResult,
} from './types.js';

export {
  generateCards,
  dedupeSongs,
  squaresPerCard,
  collectSquares,
  CardGenerationError,
  type SquarePool,
} from './generate.js';

export {
  squareMatchesSong,
  songCoverageKeys,
  normalizeArtist,
  titleKey,
  artistKey,
} from './match.js';

export {
  xmur3,
  mulberry32,
  makeRng,
  generateRandomSeed,
  type Rng,
} from './rng.js';

export { shuffle, shuffleInPlace } from './shuffle.js';
