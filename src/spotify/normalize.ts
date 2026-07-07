/**
 * Normalize raw Spotify playlist items into the card engine's `Song` type.
 *
 * The card engine is deliberately ignorant of Spotify; this is the seam that
 * maps Spotify's richer, messier data down to `{ id, title, artists[], albumArt? }`
 * and filters out anything that can't be a usable bingo square.
 */

import type { Song } from '../cards';
import type { PlaylistTrackItem } from './types';

/**
 * Convert playlist items to a clean, de-duplicated `Song[]`:
 *  - drops null tracks (removed from playlist),
 *  - drops local-only tracks and tracks with no id or no name,
 *  - de-dupes by track id (first-seen wins).
 */
export function tracksToSongs(items: readonly PlaylistTrackItem[]): Song[] {
  const seen = new Set<string>();
  const songs: Song[] = [];

  for (const item of items) {
    const track = item.track;
    if (!track) continue;
    if (track.is_local) continue;
    if (!track.id || !track.name) continue;
    if (seen.has(track.id)) continue;

    seen.add(track.id);

    const albumArt = track.album?.images?.[0]?.url;
    const song: Song = {
      id: track.id,
      title: track.name,
      artists: track.artists.map((a) => a.name).filter((n) => n.length > 0),
    };
    if (albumArt) song.albumArt = albumArt;
    songs.push(song);
  }

  return songs;
}
