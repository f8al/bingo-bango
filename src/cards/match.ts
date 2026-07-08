/**
 * Song → square matching ("both facets" rule).
 *
 * When the host plays a song, it covers TWO kinds of square on a player's card:
 *  - the `title` square for that exact song, and
 *  - any `artist` square for that song's artist(s) — an artist square is marked
 *    whenever *any* song by that artist is played.
 *
 * Both a square's key and a song's coverage keys are built the same way, so
 * matching is a simple key membership test.
 */

import type { Song, Square } from './types.js';

/** Canonical form of an artist name for de-dup and matching. */
export function normalizeArtist(name: string): string {
  return name.trim().toLowerCase();
}

/** The identity key for a title square of the given song id. */
export function titleKey(songId: string): string {
  return `t:${songId}`;
}

/** The identity key for an artist square with the given (raw) artist name. */
export function artistKey(name: string): string {
  return `a:${normalizeArtist(name)}`;
}

/**
 * The set of square keys a song "covers": its own title, plus one key per
 * artist. A square is markable for this song iff its key is in this list.
 */
export function songCoverageKeys(song: Song): string[] {
  const keys = [titleKey(song.id)];
  for (const a of song.artists) {
    if (normalizeArtist(a).length > 0) keys.push(artistKey(a));
  }
  return keys;
}

/** Whether playing `song` allows the given `square` to be marked. */
export function squareMatchesSong(square: Square, song: Song): boolean {
  return songCoverageKeys(song).includes(square.key);
}
