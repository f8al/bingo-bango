# Bingo Bango — Roadmap

Five milestones, from scoping to interactive play. Each builds on the previous;
the pure card engine (M1) is the foundation everything else depends on.

Status legend: ✅ done · 🚧 in progress · ⬜ not started

---

## M0 — Scoping ✅

Project definition and planning docs.

- ✅ `README.md`: overview, how music bingo works, the client-only + PKCE approach.
- ✅ `docs/SCOPE.md`: goal, users, MVP / should / could / won't stories,
  functional + non-functional requirements, risks, definition of done.
- ✅ `docs/ARCHITECTURE.md`: client-only diagram, stack, PKCE flow, Spotify
  endpoints, card algorithm, routes, deployment, repo layout, build order.
- ✅ `docs/ROADMAP.md`: this file.
- ✅ MIT `LICENSE`, public repo.

**Done when:** the docs above exist and describe the agreed scope.

---

## M1 — Card-generation core ✅

Pure, deterministic, dependency-free TypeScript engine plus a full test suite.

- ✅ Project setup: `package.json` (ESM), strict `tsconfig.json`,
  `vitest.config.ts`, `.gitignore`.
- ✅ `src/cards/types.ts`: `Song`, `CardCell`, `BingoCard`, `CardOptions`,
  `GenerateResult`.
- ✅ `src/cards/rng.ts`: `xmur3` hash + `mulberry32` seeded PRNG, `generateRandomSeed`.
- ✅ `src/cards/shuffle.ts`: unbiased Fisher–Yates (in-place + copy).
- ✅ `src/cards/generate.ts`: `dedupeSongs`, `squaresPerCard`, `generateCards`
  with validation, centered free space, batch uniqueness, deterministic IDs,
  `CardGenerationError`.
- ✅ `src/cards/index.ts` public exports; `src/cards/demo.ts` CLI.
- ✅ Vitest suite: RNG determinism/range, shuffle permutation/unbiased/non-mutating,
  card structure/area, centered free space, distinct songs, unique IDs,
  reproducibility, batch uniqueness, all validation errors.
- ✅ `npm install`, `npm run typecheck`, `npm test`, `npm run demo` all pass.

**Done when:** the engine is fully unit-tested and green, with no Spotify or DOM
dependencies.

---

## M2 — Static shell + PDF export ✅

The app people can actually click, without Spotify yet.

- ✅ Vite + React + TypeScript + Tailwind app shell (`src/main.tsx`, `src/App.tsx`,
  `src/ui/`).
- ✅ `/generate` screen: choose count, grid size, free space, optional seed; feeds a
  playlist or the built-in demo pool into the engine.
- ✅ Responsive on-screen card rendering (`BingoCardView`).
- ✅ Print-ready **PDF export** of a batch (`src/pdf/export.ts`, jsPDF, lazy-loaded).
- ✅ Routing scaffold (`/`, `/callback`, `/generate`, `/card/:id`, `/call`).

**Done when:** a user can generate and view cards and export a PDF from a local
song pool, all client-side.

---

## M3 — Spotify integration ✅

Real playlists as the song pool.

- ✅ PKCE auth: login, `/callback` code exchange, token refresh, logout
  (`src/spotify/pkce.ts`, `src/spotify/auth.ts`).
- ✅ Playlist list (`GET /me/playlists`) and track fetch
  (`GET /playlists/{id}/tracks`) with pagination (`src/spotify/client.ts`).
- ✅ 429 handling (`Retry-After`) + exponential backoff.
- ✅ Normalize + de-dupe tracks into the engine's `Song` pool, dropping local /
  unavailable tracks (`src/spotify/normalize.ts`).
- ✅ Playlist picker wired into `/generate`.

**Done when:** a host can log in, pick a real playlist, and generate cards from it.

---

## M4 — Mobile polish / PWA / deploy ✅

Make it pleasant on phones and shippable.

- ✅ Mobile-first responsive layout and a11y (semantic roles, `aria-*` labels,
  focus-visible rings, light/dark themes).
- ✅ PWA: web manifest + service worker via `vite-plugin-pwa` (installable,
  offline app shell).
- ✅ Spotify branding compliance ("Powered by Spotify" attribution, no implied
  endorsement).
- ✅ GitHub Actions **CI** (typecheck + tests + build) and **GitHub Pages deploy**
  workflow with SPA deep-link fallback (`.github/workflows/`).

**Done when:** the app is installable, mobile-polished, CI-gated, and deployed as
static files at ~$0.

---

## M5 — Interactive play ✅

Digital cards you can actually play on.

- ✅ Interactive markable cards with automatic **BINGO detection**
  (row/column/diagonal, free space auto-marked) — `src/play/bingo.ts`.
- ✅ Caller screen (`/call`) drawing songs in a deterministic seeded order.
- ✅ Share a card via self-contained link + **QR code** (`src/play/share.ts`,
  works cross-device with no backend).
- ⬜ Optional stretch: theming, winning-pattern options, preview playback.

**Done when:** players can open a card on their phone, mark songs, and get BINGO
detected automatically, with a working caller and shareable cards.
