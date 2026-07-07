# Bingo Bango 🎵

**Generate printable & on-screen music bingo cards from your own Spotify playlists.**

Bingo Bango is a client-only web app (SPA/PWA) that turns any of your Spotify
playlists into a batch of unique, randomized music-bingo cards. It runs entirely
in the browser — there is no backend and no server to run — so it can be hosted
for free as static files.

---

## What is music bingo?

Music bingo (a.k.a. "musical bingo" or "song bingo") is a party game that swaps
the numbers on a traditional bingo card for **songs**.

1. **The host** builds a pool of songs — here, straight from a Spotify playlist.
2. Every player gets a **bingo card** whose squares are songs (title + artist)
   drawn randomly from that pool. Every card is different.
3. The host **plays songs** from the playlist in a random order (from their own
   Spotify — a phone, a speaker, whatever they like).
4. When a player recognizes a song that's on their card, they **mark that
   square**.
5. The first player to complete a line (row, column, or diagonal) — or whatever
   winning pattern the host chose — yells **"Bingo!"** and wins.

Bingo Bango's job is step 2: it generates the cards. The host still plays the
music from their own Spotify account — the app never needs to stream or play
audio.

---

## Approach

Bingo Bango is intentionally small and cheap to run:

- **Client-only SPA/PWA — no backend.** Everything (auth, playlist fetching,
  card generation, PDF export) happens in the browser. It can be deployed to any
  static host (GitHub Pages, Vercel, Netlify) at ~$0 cost.
- **Spotify Authorization Code with PKCE.** Because there is no server, we use
  the PKCE OAuth flow, which needs **no client secret**. Access tokens live only
  in the browser and never touch a server we control.
- **Read-only Spotify scopes.** We request only
  `playlist-read-private` and `playlist-read-collaborative` — enough to list and
  read the user's playlists, nothing more.
- **Each bingo square is a song** (title + artist). The **host plays the music**
  from their own Spotify; the app only generates cards.
- **In-app preview playback is out of scope.** Spotify
  [deprecated `preview_url`](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api)
  for new apps in November 2024, so we don't rely on 30-second previews. It's
  noted as a possible later stretch goal only.

### Tech stack

| Concern        | Choice                                         |
| -------------- | ---------------------------------------------- |
| UI             | React + Vite + TypeScript                      |
| Styling        | Tailwind CSS                                    |
| Tests          | Vitest                                          |
| Card engine    | Pure, dependency-free TypeScript module        |
| Auth           | Spotify Authorization Code + PKCE              |
| Hosting        | Static files (GitHub Pages / Vercel / Netlify) |

See [`docs/SCOPE.md`](docs/SCOPE.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
and [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full plan.

---

## Project status

Early. The current milestone (**M1**) is the **card-generation core**: a pure,
deterministic, well-tested TypeScript module with no Spotify or DOM dependencies.
The Spotify integration and UI are built on top of it in later milestones — see
the [roadmap](docs/ROADMAP.md).

---

## Getting started (developers)

Requires Node 18+.

```bash
npm install        # install dev dependencies
npm test           # run the Vitest suite
npm run typecheck  # type-check with tsc --noEmit
npm run demo       # print 3 sample cards from a mock 40-song pool
```

The card engine lives in [`src/cards/`](src/cards/) and is usable on its own:

```ts
import { generateCards } from './src/cards/index.js';

const result = generateCards(songs, {
  gridSize: 5,
  freeSpace: true,
  count: 30,
  seed: 'optional-seed-for-reproducibility',
});
// result.cards -> BingoCard[]
```

---

## License

[MIT](LICENSE) © Bingo Bango contributors.

_Not affiliated with or endorsed by Spotify. "Spotify" is a trademark of Spotify
AB._
