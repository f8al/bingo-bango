/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Spotify application client id (public under PKCE). */
  readonly VITE_SPOTIFY_CLIENT_ID?: string;
  /** Optional explicit OAuth redirect URI override. */
  readonly VITE_SPOTIFY_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
