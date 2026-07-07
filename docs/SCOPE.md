# Bingo Bango — Scope

## Goal

Let anyone turn a Spotify playlist into a set of **unique, randomized music-bingo
cards** — printable and viewable on a phone — using a **free, client-only web
app** with no backend, no accounts, and no ongoing cost. The host supplies the
music (played from their own Spotify); Bingo Bango just makes the cards.

## Target users

- **Host (primary).** Runs the game night. Wants to log in with Spotify, pick a
  playlist, choose how many cards and what size grid, and get a batch of unique
  cards to print or display. Plays the songs from their own Spotify.
- **Player (secondary).** Receives a card (on paper or on their phone) and marks
  off songs as they're played. In the MVP a player just uses a printed/on-screen
  card; interactive digital cards with automatic BINGO detection are a
  should-have.

---

## User stories

### MVP (must-have)

- **Login.** As a host, I can log in with my Spotify account (read-only) so the
  app can see my playlists.
- **List playlists.** As a host, I can see a list of my Spotify playlists.
- **Pick a playlist.** As a host, I can select one playlist to use as the song
  pool.
- **Choose options.** As a host, I can choose the **number of cards**, the **grid
  size** (e.g. 3×3, 4×4, 5×5), and whether to include a **free space**.
- **Generate unique cards.** As a host, I get a batch of randomized cards where
  every card is unique and no card repeats a song.
- **PDF export.** As a host, I can export the batch to a **print-ready PDF** so I
  can print cards for players.
- **On-screen responsive cards.** As a host or player, I can view cards on a
  screen and they lay out well on **mobile and desktop**.

### Should-have

- **In-app caller.** A `/call` screen that draws songs from the playlist in a
  random (optionally seeded) order and shows the "now calling" song, so the host
  doesn't need a separate tool.
- **Interactive digital cards with BINGO detection.** Players open a card on
  their phone, tap squares to mark them, and the app detects a completed
  row/column/diagonal automatically.
- **Share via link / QR.** Share a specific card or a whole batch via URL (and a
  QR code) so players can open their card on their own device.
- **Deterministic seed.** Expose the generation seed so a batch can be exactly
  reproduced (useful for re-printing a lost card or sharing).

### Could-have

- **Theming.** Light/dark and custom color themes for cards.
- **Winning-pattern options.** Configurable win conditions (four corners, full
  card / "blackout", X, etc.) with matching detection.
- **Extra sources.** Song pools from sources other than a single playlist
  (multiple playlists, saved tracks, albums).
- **Preview playback.** In-app 30-second previews — **blocked** for new apps by
  the `preview_url` deprecation (see Risks); revisit only if Spotify restores it
  or an alternative appears.

### Won't-do (this project)

- **Full song playback / streaming in the app.** The host plays music from their
  own Spotify; we do not build a player.
- **Native mobile apps.** Web/PWA only.
- **Accounts, payments, or any monetization.** No user accounts of our own, no
  billing.

---

## Functional requirements

1. Authenticate with Spotify using **Authorization Code + PKCE** (no client
   secret) and request only `playlist-read-private` and
   `playlist-read-collaborative`.
2. Fetch the user's playlists (`GET /me/playlists`) with pagination.
3. Fetch a selected playlist's tracks (`GET /playlists/{id}/tracks`) with
   pagination, then **normalize** to `{ id, title, artists[] }` and **de-duplicate**
   by track id.
4. Generate `count` cards of `gridSize × gridSize`, with an optional centered
   free space, such that:
   - each card draws distinct songs (no repeats within a card),
   - every card in the batch is unique,
   - generation is **deterministic** given a seed (same seed + pool + options →
     same batch).
5. Render cards responsively on screen.
6. Export the batch as a **print-ready PDF**.
7. (Should-have) Provide a caller screen and interactive markable cards with
   BINGO detection.

## Non-functional requirements

- **Mobile-first.** Layouts designed for phones first, scaling up to desktop.
- **PWA / offline.** Installable; core UI and already-loaded cards work offline
  (a service worker caches the app shell). Fetching new playlists needs network.
- **Performance.** Generating a typical batch (e.g. 30 cards from a 50–200 song
  pool) completes in well under a second on a mid-range phone. Respect Spotify
  rate limits with pagination + backoff.
- **Accessibility (a11y).** Sufficient color contrast, keyboard-navigable
  controls, semantic markup, screen-reader labels on cards and squares, and no
  reliance on color alone to convey state.
- **Privacy.** Tokens and playlist data stay **client-side**; nothing is sent to
  a server we operate. No analytics that exfiltrate personal data. Tokens held in
  memory / short-lived storage and cleared on logout.
- **Cost.** ~**$0** — static hosting only, no backend, no database.
- **Spotify branding compliance.** Follow Spotify's developer branding
  guidelines: correct "Powered by Spotify" attribution, logo usage, no implication
  of endorsement, and no use of Spotify data outside the app's stated purpose.

---

## Risks & mitigations

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| **`preview_url` deprecation** (Nov 2024, new apps) | Can't do in-app previews | Out of scope; host plays from their own Spotify. Revisit only if restored. |
| **Dev-mode ~25-user quota** | Only ~25 whitelisted users until approval | Document the limit; apply for **extended quota** if the app is shared widely. |
| **Extended-quota approval** | Approval needed for public use; can be slow/denied | Keep scopes minimal and usage clearly compliant to ease review; usable in dev mode meanwhile. |
| **Redirect-URI / HTTPS requirements** | Auth fails if misconfigured | Register exact redirect URIs; serve over HTTPS; document local `http://127.0.0.1` dev setup. |
| **Small playlists (< 24 songs)** | Can't fill a 5×5 card | Validate pool size vs. `gridSize² − freeSpace`; clear error + suggest a smaller grid or bigger playlist. |
| **429 rate limits** | Playlist fetch throttled | Paginate; honor `Retry-After`; exponential backoff; cache within a session. |
| **PKCE token handling** | Token leakage / expiry bugs | Keep tokens client-side only; use short-lived access tokens + refresh; clear on logout; never log tokens. |
| **Duplicate / local / unavailable tracks** | Broken or repeated squares | De-dupe by id; drop local-only tracks and tracks with no usable id/title; count the pool by **unique** playable songs. |

---

## Definition of done

The project (through the planned milestones) is "done" when:

- A host can log in with Spotify, pick a playlist, choose card count / grid size /
  free space, and generate a batch of **unique** cards.
- Cards render responsively on mobile and desktop and can be exported to a
  **print-ready PDF**.
- The **card-generation core is pure, deterministic, and fully unit-tested**
  (`npm test` green), independent of Spotify and the DOM.
- Validation surfaces friendly errors for too-small pools, invalid options, and
  Spotify/auth failures.
- Tokens and data stay client-side; the app deploys as **static files at ~$0**
  cost with **CI** running typecheck + tests.
- The app meets the a11y and Spotify-branding requirements above.
- `README.md`, `docs/SCOPE.md`, `docs/ARCHITECTURE.md`, and `docs/ROADMAP.md` are
  present and current.
