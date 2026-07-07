/**
 * Public entry point for the card-generation core.
 *
 * The rest of the application (Spotify layer, React UI, PDF export) should import
 * from here rather than reaching into individual modules.
 */

export type {
  Song,
  CardCell,
  BingoCard,
  CardOptions,
  GenerateResult,
} from './types.js';

export {
  generateCards,
  dedupeSongs,
  squaresPerCard,
  CardGenerationError,
} from './generate.js';

export {
  xmur3,
  mulberry32,
  makeRng,
  generateRandomSeed,
  type Rng,
} from './rng.js';

export { shuffle, shuffleInPlace } from './shuffle.js';
