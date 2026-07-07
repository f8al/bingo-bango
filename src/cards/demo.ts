/**
 * CLI demo: prints 3 bingo cards generated from a mock 40-song pool.
 *
 * Run with `npm run demo`. Uses a fixed seed so the output is stable, which
 * doubles as a quick manual sanity check that generation is deterministic.
 */

import { generateCards, type Song } from './index.js';

/** Build a mock pool of `n` songs with predictable titles/artists. */
function mockPool(n: number): Song[] {
  const artists = [
    'The Beatles',
    'Queen',
    'Fleetwood Mac',
    'Daft Punk',
    'Beyoncé',
    'Radiohead',
    'Kendrick Lamar',
    'ABBA',
  ];
  const songs: Song[] = [];
  for (let i = 0; i < n; i++) {
    songs.push({
      id: `track-${i + 1}`,
      title: `Song ${i + 1}`,
      artists: [artists[i % artists.length] as string],
    });
  }
  return songs;
}

function renderCard(gridSize: number, cells: { song: Song | null; isFreeSpace: boolean }[]): string {
  const lines: string[] = [];
  for (let r = 0; r < gridSize; r++) {
    const cellStrs: string[] = [];
    for (let c = 0; c < gridSize; c++) {
      const cell = cells[r * gridSize + c];
      if (!cell) continue;
      if (cell.isFreeSpace) {
        cellStrs.push('★ FREE'.padEnd(18));
      } else {
        const s = cell.song as Song;
        const label = `${s.title} — ${s.artists.join(', ')}`;
        cellStrs.push(label.slice(0, 18).padEnd(18));
      }
    }
    lines.push(cellStrs.join(' | '));
  }
  return lines.join('\n');
}

function main(): void {
  const pool = mockPool(40);
  const result = generateCards(pool, {
    gridSize: 5,
    freeSpace: true,
    count: 3,
    seed: 'DEMO-SEED',
  });

  console.log('Music Bingo — demo batch');
  console.log(
    `seed=${result.seed}  poolSize=${result.poolSize}  squaresPerCard=${result.squaresPerCard}\n`,
  );

  for (const card of result.cards) {
    console.log(`Card ${card.id}`);
    console.log('-'.repeat(card.gridSize * 21));
    console.log(renderCard(card.gridSize, card.cells));
    console.log('');
  }
}

main();
