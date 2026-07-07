import { describe, it, expect } from 'vitest';
import { tracksToSongs } from './normalize';
import type { PlaylistTrackItem, SpotifyTrack } from './types';

function track(over: Partial<SpotifyTrack>): SpotifyTrack {
  return {
    id: 't1',
    name: 'A Song',
    artists: [{ name: 'An Artist' }],
    album: { images: [{ url: 'http://img/1', height: 640, width: 640 }] },
    is_local: false,
    ...over,
  };
}

function item(t: SpotifyTrack | null): PlaylistTrackItem {
  return { track: t };
}

describe('tracksToSongs', () => {
  it('maps id, title, artists, and album art', () => {
    const songs = tracksToSongs([item(track({}))]);
    expect(songs).toEqual([
      { id: 't1', title: 'A Song', artists: ['An Artist'], albumArt: 'http://img/1' },
    ]);
  });

  it('joins multiple artists into an array', () => {
    const songs = tracksToSongs([
      item(track({ artists: [{ name: 'A' }, { name: 'B' }] })),
    ]);
    expect(songs[0]?.artists).toEqual(['A', 'B']);
  });

  it('omits albumArt when there is no image', () => {
    const songs = tracksToSongs([item(track({ album: { images: [] } }))]);
    expect(songs[0]).not.toHaveProperty('albumArt');
  });

  it('drops null tracks (removed from playlist)', () => {
    expect(tracksToSongs([item(null)])).toEqual([]);
  });

  it('drops local-only tracks', () => {
    expect(tracksToSongs([item(track({ is_local: true }))])).toEqual([]);
  });

  it('drops tracks with no id or no name', () => {
    expect(tracksToSongs([item(track({ id: null }))])).toEqual([]);
    expect(tracksToSongs([item(track({ name: '' }))])).toEqual([]);
  });

  it('de-duplicates by id, keeping first-seen', () => {
    const songs = tracksToSongs([
      item(track({ id: 'x', name: 'First' })),
      item(track({ id: 'x', name: 'Second' })),
      item(track({ id: 'y', name: 'Other' })),
    ]);
    expect(songs.map((s) => s.id)).toEqual(['x', 'y']);
    expect(songs[0]?.title).toBe('First');
  });
});
