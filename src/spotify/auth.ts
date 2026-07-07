/**
 * Spotify Authorization Code + PKCE flow and token lifecycle.
 *
 * All state lives client-side:
 *  - the PKCE `code_verifier` and `state` are kept in `sessionStorage` during
 *    the redirect round-trip,
 *  - tokens are kept in `localStorage` so a session survives a page reload.
 *
 * Nothing is ever sent to a server we operate. `logout()` clears everything.
 */

import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, SPOTIFY_SCOPES } from '../config';
import { deriveCodeChallenge, generateCodeVerifier, generateState } from './pkce';
import type { TokenResponse } from './types';

const AUTHORIZE_ENDPOINT = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

const PKCE_VERIFIER_KEY = 'bb.pkce_verifier';
const PKCE_STATE_KEY = 'bb.pkce_state';
const TOKENS_KEY = 'bb.tokens';

/** Persisted token record. `expiresAt` is an epoch-ms absolute expiry. */
interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

function readTokens(): StoredTokens | null {
  const raw = localStorage.getItem(TOKENS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

function writeTokens(tokens: StoredTokens): void {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

/** True if we currently hold a (possibly expired but refreshable) session. */
export function isAuthenticated(): boolean {
  return readTokens() !== null;
}

/** Begin the login flow: build the PKCE challenge and redirect to Spotify. */
export async function beginLogin(): Promise<void> {
  const verifier = generateCodeVerifier();
  const state = generateState();
  const challenge = await deriveCodeChallenge(verifier);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: SPOTIFY_SCOPES.join(' '),
  });

  window.location.assign(`${AUTHORIZE_ENDPOINT}?${params.toString()}`);
}

/** Error thrown when the OAuth callback cannot be completed. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

function storeTokenResponse(res: TokenResponse, previousRefresh: string | null): void {
  writeTokens({
    accessToken: res.access_token,
    // Spotify may or may not return a new refresh token on refresh; keep the old.
    refreshToken: res.refresh_token ?? previousRefresh,
    // Refresh 30s early to avoid using a token that expires mid-request.
    expiresAt: Date.now() + (res.expires_in - 30) * 1000,
  });
}

/**
 * Complete the OAuth callback. Verifies `state`, exchanges the authorization
 * code for tokens using the stored verifier, and persists them.
 *
 * @throws {AuthError} on state mismatch, missing verifier, or a token error.
 */
export async function handleCallback(search: URLSearchParams): Promise<void> {
  const error = search.get('error');
  if (error) throw new AuthError(`Spotify authorization was denied: ${error}`);

  const code = search.get('code');
  const state = search.get('state');
  const storedState = sessionStorage.getItem(PKCE_STATE_KEY);
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);

  if (!code || !state) throw new AuthError('Missing authorization code or state.');
  if (!storedState || state !== storedState) throw new AuthError('State mismatch — possible CSRF.');
  if (!verifier) throw new AuthError('Missing PKCE verifier — please try logging in again.');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: verifier,
  });

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!resp.ok) {
    throw new AuthError(`Token exchange failed (${resp.status}).`);
  }

  const tokens = (await resp.json()) as TokenResponse;
  storeTokenResponse(tokens, null);

  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_STATE_KEY);
}

/** Exchange the stored refresh token for a fresh access token. */
async function refreshTokens(refreshToken: string): Promise<StoredTokens | null> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SPOTIFY_CLIENT_ID,
  });

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!resp.ok) return null;
  const res = (await resp.json()) as TokenResponse;
  storeTokenResponse(res, refreshToken);
  return readTokens();
}

/**
 * Return a valid access token, refreshing if it is expired. Returns `null` if
 * there is no session or the refresh failed (caller should prompt re-login).
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = readTokens();
  if (!tokens) return null;

  if (Date.now() < tokens.expiresAt) return tokens.accessToken;

  if (!tokens.refreshToken) {
    logout();
    return null;
  }
  const refreshed = await refreshTokens(tokens.refreshToken);
  if (!refreshed) {
    logout();
    return null;
  }
  return refreshed.accessToken;
}

/** Clear all tokens and PKCE state. */
export function logout(): void {
  localStorage.removeItem(TOKENS_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_STATE_KEY);
}
