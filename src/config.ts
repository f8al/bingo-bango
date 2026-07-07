/**
 * App configuration derived from build-time environment variables.
 *
 * Under PKCE the Spotify **client id is public** (not a secret), so it is safe to
 * embed at build time. Configure it via a `.env` file (see `.env.example`):
 *
 *   VITE_SPOTIFY_CLIENT_ID=xxxxxxxxxxxxxxxx
 *   VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback   # optional override
 */

/** Spotify application client id (public under PKCE). */
export const SPOTIFY_CLIENT_ID: string = import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '';

/**
 * OAuth redirect URI. Must be registered *exactly* in the Spotify dashboard.
 * Defaults to `<origin><base>callback` so it works across dev and any static
 * host without extra config; override with VITE_SPOTIFY_REDIRECT_URI if needed.
 */
export const SPOTIFY_REDIRECT_URI: string =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI ??
  `${window.location.origin}${import.meta.env.BASE_URL}callback`;

/** Read-only scopes: enough to list and read the user's playlists, nothing more. */
export const SPOTIFY_SCOPES = ['playlist-read-private', 'playlist-read-collaborative'] as const;

/** Whether a client id has been configured. When false, the app runs in demo mode. */
export const IS_SPOTIFY_CONFIGURED = SPOTIFY_CLIENT_ID.length > 0;

/** Router basename, derived from Vite's base path (e.g. "/bingo-bango"). */
export const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');
