# Bingo Bango — Architecture

## Overview

Bingo Bango is a **client-only single-page app**. There is no backend: the
browser talks directly to the Spotify Web API using an OAuth **PKCE** flow, holds
the access token in memory, fetches playlist data, and does all card generation
and PDF export locally.

```
                          ┌─────────────────────────────────────────────┐
                          │                   Browser                    │
                          │                                              │
   ┌───────────┐  OAuth   │  ┌────────────┐   ┌───────────────────────┐  │
   │  Spotify   │◀────────┼─▶│   Auth      │   │        UI (React)      │  │
   │  Accounts  │  PKCE    │  │  (PKCE)     │──▶│  routes / components   │  │
   └───────────┘          │  └────────────┘   └───────────┬───────────┘  │
                          │        │ token                │             │
   ┌───────────┐  HTTPS   │  ┌─────▼──────┐   ┌────────────▼──────────┐  │
   │  Spotify   │◀────────┼─▶│  Spotify    │──▶│   Card engine (pure)   │  │
   │  Web API   │  GET     │  │  client     │   │  rng/shuffle/generate  │  │
   └───────────┘          │  └────────────┘   └────────────┬──────────┘  │
                          │                                │             │
                          │                    ┌───────────▼──────────┐  │
                          │                    │   PDF export (client) │  │
                          │                    └──────────────────────┘  │
                          │                                              │
                          │   Service worker (PWA shell cache)           │
                          └─────────────────────────────────────────────┘

  Static host (GitHub Pages / Vercel / Netlify) serves the built assets only.
  No server-side code. No secrets on any server.
```

Everything inside the browser box ships as static files. The only "servers"
involved are **Spotify's** (auth + API) and the **static host** that serves the
bundle.

---

## Stack

| Layer            | Technology                    | Why |
| ---------------- | ----------------------------- | --- |
| Build / dev      | **Vite**                      | Fast dev server, static build output |
| Language         | **TypeScript** (strict)       | Type safety across engine + UI |
| UI               | **React**                     | Component model for the SPA |
| Styling          | **Tailwind CSS**              | Utility-first, mobile-first, small CSS |
| Routing          | React Router (hash or history)| Client-side routes |
| Card engine      | Pure TypeScript (no deps)     | Deterministic, unit-testable core |
| PDF export       | Client-side PDF lib (e.g. jsPDF / pdf-lib) | Print-ready output, no server |
| Auth             | Spotify Authorization Code + PKCE | No client secret → static hosting |
| PWA              | Service worker + web manifest | Installable, offline app shell |
| Tests            | **Vitest**                    | Fast, TS-native unit tests |
| CI               | GitHub Actions                | Typecheck + tests on every push |

---

## Spotify PKCE flow

Authorization Code with **PKCE** lets a public client authenticate without a
client secret.

1. **Generate PKCE pair.** Create a random `code_verifier`; derive
   `code_challenge = BASE64URL(SHA256(code_verifier))`. Store the verifier
   (e.g. `sessionStorage`) and a random `state`.
2. **Redirect to Spotify authorize.**
   `GET https://accounts.spotify.com/authorize` with
   `client_id`, `response_type=code`, `redirect_uri`, `code_challenge_method=S256`,
   `code_challenge`, `state`, and
   `scope=playlist-read-private playlist-read-collaborative`.
3. **User approves** and Spotify redirects back to `/callback?code=...&state=...`.
4. **Verify `state`**, then **exchange the code** at
   `POST https://accounts.spotify.com/api/token` with
   `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, and the
   stored `code_verifier`. No secret is sent.
5. **Store tokens client-side** (access token in memory; refresh token in
   `localStorage`/`sessionStorage` per privacy stance). Access tokens are
   short-lived.
6. **Refresh** via `grant_type=refresh_token` + `client_id` when the access token
   nears expiry.
7. **Logout** clears all tokens and PKCE state.

Tokens never leave the browser. Redirect URIs must be registered exactly in the
Spotify dashboard and served over HTTPS (localhost/`127.0.0.1` is allowed for
dev).

---

## Spotify endpoints & data pipeline

### Endpoints

- **`GET /v1/me/playlists`** — list the user's playlists. Paginated via `limit`
  (max 50) + `offset` or the `next` URL.
- **`GET /v1/playlists/{playlist_id}/tracks`** — a playlist's items. Paginated the
  same way; request only needed `fields` to reduce payload, e.g.
  `fields=items(track(id,name,artists(name),album(images),is_local)),next`.

### Pagination

Follow the `next` cursor until it is `null`, accumulating items. Cap total pages
defensively for very large playlists.

### 429 rate limiting / backoff

On HTTP **429**, read the `Retry-After` header (seconds) and wait that long
before retrying. For other transient/network errors, use **exponential backoff**
(e.g. 0.5s, 1s, 2s, 4s) with a small retry cap. Requests within a session are
cached to avoid refetching.

### Normalization & de-dupe

Map each raw track to the engine's `Song`:

```
{ id: track.id, title: track.name, artists: track.artists.map(a => a.name),
  albumArt: track.album?.images?.[0]?.url }
```

Then filter and de-dupe:

- Drop tracks with no `id` or no `name`.
- Drop **local** tracks (`is_local`) and unavailable tracks (no usable id).
- **De-duplicate by `id`**, keeping first-seen order (`dedupeSongs`).

The resulting **unique** pool size is what's validated against the card's square
requirement.

---

## Card-generation algorithm

Implemented in [`src/cards/`](../src/cards/), pure and dependency-free.

1. **De-dupe** the incoming songs by id → `pool`.
2. **Validate**: `count` and `gridSize` are positive integers; a free space
   requires an **odd** `gridSize`; `pool.length ≥ gridSize² − (freeSpace ? 1 : 0)`.
3. **Seed the RNG**: `seed` string → `xmur3` 32-bit hash → `mulberry32` PRNG. If no
   seed is given, generate a random one and return it (so batches are
   reproducible after the fact).
4. **Per card**: shuffle the pool with an **unbiased Fisher–Yates** driven by the
   seeded RNG, take the first `squaresPerCard` songs, and lay them out row-major,
   inserting the **centered free space** at index `(gridSize² − 1) / 2` when
   enabled.
5. **Batch uniqueness**: compute a canonical signature per card; if a new card
   collides with one already in the batch, retry (drawing further from the same
   deterministic stream) up to an attempt cap. If the cap is exceeded (pool too
   small to yield enough distinct cards), throw `CardGenerationError`.
6. **IDs**: derive a short deterministic prefix from the seed (`xmur3` → 4 hex
   chars) and append a 1-based zero-padded index, e.g. `A7F3-01`.

Determinism guarantee: **same seed + same pool + same options → identical
batch**, because every random decision flows from the single seeded stream.

---

## Routes

| Route         | Purpose |
| ------------- | ------- |
| `/`           | Landing / login (Spotify connect). |
| `/callback`   | OAuth redirect target; exchanges the code, then routes onward. |
| `/generate`   | Pick a playlist, choose count / grid size / free space, generate + export. |
| `/card/:id`   | View a single card (shareable; interactive in the should-have phase). |
| `/call`       | Caller screen: draws songs from the pool in random/seeded order. |

---

## Deployment

- **Static hosting**: GitHub Pages (project site), or Vercel / Netlify. The build
  is `vite build` → `dist/` served as static assets.
- **CI**: **GitHub Actions** runs `npm ci`, `npm run typecheck`, and `npm test` on
  every push / PR; a deploy job publishes `dist/` (e.g. to GitHub Pages) on the
  default branch.
- **Config**: `VITE_SPOTIFY_CLIENT_ID` and the redirect URI are build-time env
  (public — the client id is not a secret under PKCE). Redirect URIs registered in
  the Spotify dashboard must match the deployed origin(s).

---

## Repository layout

```
bingo-bango/
├── README.md
├── LICENSE
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── docs/
│   ├── SCOPE.md
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
└── src/
    ├── cards/                 # M1: pure card engine (no Spotify / DOM)
    │   ├── types.ts
    │   ├── rng.ts
    │   ├── shuffle.ts
    │   ├── generate.ts
    │   ├── index.ts
    │   ├── demo.ts
    │   └── *.test.ts
    ├── spotify/               # (M3) auth (PKCE) + API client + normalization
    ├── pdf/                   # (M2) PDF export
    ├── ui/                    # (M2+) React components, routes, Tailwind
    └── pwa/                   # (M4) service worker + manifest
```

Only `src/cards/` exists today; the other `src/` folders are added in their
milestones.

---

## Build order

1. **M1 — Card engine** (`src/cards/`): types, RNG, shuffle, generate, tests. _(current)_
2. **M2 — Static shell + PDF**: Vite/React/Tailwind app shell, generate screen
   wired to the engine, on-screen cards, PDF export.
3. **M3 — Spotify integration**: PKCE auth, playlist list/detail fetch with
   pagination + backoff, normalization/de-dupe feeding the engine.
4. **M4 — Mobile polish / PWA / deploy**: responsive polish, a11y, service worker
   + manifest, CI + static deploy.
5. **M5 — Interactive play**: markable digital cards + BINGO detection, caller
   screen, share via link/QR.

See [`ROADMAP.md`](ROADMAP.md) for milestone detail.
