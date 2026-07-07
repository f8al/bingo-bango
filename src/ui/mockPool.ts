/** A built-in demo song pool so the app is fully usable without Spotify creds. */

import type { Song } from '../cards';

const DEMO: Array<[string, string]> = [
  ['Bohemian Rhapsody', 'Queen'],
  ['Billie Jean', 'Michael Jackson'],
  ['Dreams', 'Fleetwood Mac'],
  ['Get Lucky', 'Daft Punk'],
  ['Rolling in the Deep', 'Adele'],
  ['Smells Like Teen Spirit', 'Nirvana'],
  ['Superstition', 'Stevie Wonder'],
  ['Uptown Funk', 'Mark Ronson, Bruno Mars'],
  ['Hey Ya!', 'OutKast'],
  ['No Scrubs', 'TLC'],
  ['Take On Me', 'a-ha'],
  ['Wonderwall', 'Oasis'],
  ['Like a Prayer', 'Madonna'],
  ['Sweet Child o’ Mine', "Guns N' Roses"],
  ['Mr. Brightside', 'The Killers'],
  ['Seven Nation Army', 'The White Stripes'],
  ['Hips Don’t Lie', 'Shakira'],
  ['Toxic', 'Britney Spears'],
  ['Crazy in Love', 'Beyoncé'],
  ['Karma Police', 'Radiohead'],
  ['HUMBLE.', 'Kendrick Lamar'],
  ['Dancing Queen', 'ABBA'],
  ['Africa', 'Toto'],
  ['September', 'Earth, Wind & Fire'],
  ['Blinding Lights', 'The Weeknd'],
  ['Bad Guy', 'Billie Eilish'],
  ['Shake It Off', 'Taylor Swift'],
  ['Old Town Road', 'Lil Nas X'],
  ['Levitating', 'Dua Lipa'],
  ['Someone Like You', 'Adele'],
  ['Viva la Vida', 'Coldplay'],
  ['Lose Yourself', 'Eminem'],
  ['Poker Face', 'Lady Gaga'],
  ['Sunflower', 'Post Malone, Swae Lee'],
  ['Bad Romance', 'Lady Gaga'],
  ['Believer', 'Imagine Dragons'],
  ['Happy', 'Pharrell Williams'],
  ['Stronger', 'Kanye West'],
  ['Radioactive', 'Imagine Dragons'],
  ['Shape of You', 'Ed Sheeran'],
];

export function demoPool(): Song[] {
  return DEMO.map(([title, artist], i) => ({
    id: `demo-${i + 1}`,
    title,
    artists: artist.split(', '),
  }));
}

export const DEMO_PLAYLIST_NAME = 'Demo Playlist (Party Classics)';
