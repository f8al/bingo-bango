/**
 * PKCE (Proof Key for Code Exchange) helpers for the Spotify OAuth flow.
 *
 * PKCE lets a public browser client authenticate without a client secret:
 * we generate a random `code_verifier`, send its SHA-256 hash (`code_challenge`)
 * when redirecting to Spotify, and later prove possession of the verifier when
 * exchanging the authorization code for tokens.
 *
 * These functions are DOM/crypto-dependent but framework-agnostic.
 */

const VERIFIER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

/**
 * Generate a high-entropy `code_verifier`: a random string of `length`
 * characters (43–128) from the unreserved URL character set, per RFC 7636.
 */
export function generateCodeVerifier(length = 64): string {
  const clamped = Math.min(128, Math.max(43, length));
  const bytes = new Uint8Array(clamped);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < clamped; i++) {
    out += VERIFIER_CHARS[(bytes[i] as number) % VERIFIER_CHARS.length];
  }
  return out;
}

/** Base64url-encode an ArrayBuffer (no padding), suitable for a code challenge. */
export function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Derive the `code_challenge` for a given verifier:
 * `BASE64URL(SHA256(verifier))`. Async because it uses `crypto.subtle.digest`.
 */
export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

/** Generate a random opaque `state` value for CSRF protection on the callback. */
export function generateState(length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
