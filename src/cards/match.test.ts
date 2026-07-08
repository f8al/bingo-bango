import { describe, it, expect } from 'vitest';
import {
  normalizeArtist,
  titleKey,
  artistKey,
  songCoverageKeys,
  squareMatchesSong,
} from './match.js';
import { collectSquares } from './generate.js';
import type { Song, Square } from './types.js';

const bohemian: Song = { id: 's1', title: 'Bohemian Rhapsody', artists: ['Queen'] };
const collab: Song = { id: 's2', title: 'Under Pressure', artists: ['Queen', 'David Bowie'] };

describe('key helpers', () => {
  it('normalizes artist names case-insensitively and trimmed', () => {
    expect(normalizeArtist('  Queen ')).toBe('queen');
    expect(artistKey('Queen')).toBe(artistKey('queen'));
  });

  it('builds distinct title vs artist keys', () => {
    expect(titleKey('s1')).toBe('t:s1');
    expect(artistKey('Queen')).toBe('a:queen');
  });
});

describe('songCoverageKeys', () => {
  it('covers the song title plus every artist', () => {
    expect(songCoverageKeys(collab).sort()).toEqual(
      ['a:david bowie', 'a:queen', 't:s2'].sort(),
    );
  });
});

describe('squareMatchesSong — both facets', () => {
  const titleSquare: Square = { kind: 'title', label: 'Bohemian Rhapsody', key: 't:s1' };
  const queenSquare: Square = { kind: 'artist', label: 'Queen', key: 'a:queen' };
  const bowieSquare: Square = { kind: 'artist', label: 'David Bowie', key: 'a:david bowie' };

  it("matches a song's own title square", () => {
    expect(squareMatchesSong(titleSquare, bohemian)).toBe(true);
  });

  it('does not match a different song for a title square', () => {
    expect(squareMatchesSong(titleSquare, collab)).toBe(false);
  });

  it('matches an artist square for ANY song by that artist', () => {
    // "Queen" square is covered by both a Queen solo track and a collaboration.
    expect(squareMatchesSong(queenSquare, bohemian)).toBe(true);
    expect(squareMatchesSong(queenSquare, collab)).toBe(true);
  });

  it('does not match an artist square for an unrelated song', () => {
    expect(squareMatchesSong(bowieSquare, bohemian)).toBe(false);
  });

  it('square keys produced by collectSquares match their source songs', () => {
    const { titles, artists } = collectSquares([bohemian, collab]);
    for (const t of titles) {
      const song = [bohemian, collab].find((s) => s.id === t.songId)!;
      expect(squareMatchesSong(t, song)).toBe(true);
    }
    const queen = artists.find((a) => a.label === 'Queen')!;
    expect(squareMatchesSong(queen, bohemian)).toBe(true);
    expect(squareMatchesSong(queen, collab)).toBe(true);
  });
});
