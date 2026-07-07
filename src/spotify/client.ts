/**
 * Thin Spotify Web API client: handles auth headers, pagination, and 429
 * rate-limit backoff. Framework-agnostic — the UI wraps these in hooks.
 */

import { getValidAccessToken } from './auth';
import type {
  Paging,
  PlaylistTrackItem,
  SpotifyPlaylistSummary,
  SpotifyUser,
} from './types';

const API_BASE = 'https://api.spotify.com/v1';

/** Error thrown for non-recoverable API failures. */
export class SpotifyApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'SpotifyApiError';
    this.status = status;
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface FetchOptions {
  /** Max retries for transient errors (429 / 5xx / network). */
  maxRetries?: number;
}

/**
 * Authenticated GET against the Spotify API with pagination-friendly semantics.
 * Accepts either a path (relative to the API base) or a full `next` URL.
 *
 * On HTTP 429 it honors the `Retry-After` header; on transient 5xx / network
 * errors it uses exponential backoff. A 401 attempts one token refresh.
 */
async function apiGet<T>(pathOrUrl: string, opts: FetchOptions = {}): Promise<T> {
  const maxRetries = opts.maxRetries ?? 5;
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE}${pathOrUrl}`;

  let attempt = 0;
  let refreshedOnce = false;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const token = await getValidAccessToken();
    if (!token) throw new SpotifyApiError('Not authenticated.', 401);

    let resp: Response;
    try {
      resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    } catch (networkErr) {
      if (attempt >= maxRetries) {
        throw new SpotifyApiError(
          `Network error contacting Spotify: ${(networkErr as Error).message}`,
          0,
        );
      }
      await sleep(backoffMs(attempt));
      attempt++;
      continue;
    }

    if (resp.ok) {
      return (await resp.json()) as T;
    }

    // Rate limited: wait the server-specified time and retry.
    if (resp.status === 429) {
      const retryAfter = Number(resp.headers.get('Retry-After') ?? '1');
      await sleep((Number.isFinite(retryAfter) ? retryAfter : 1) * 1000);
      continue;
    }

    // Token rejected: try one refresh cycle, then fail.
    if (resp.status === 401 && !refreshedOnce) {
      refreshedOnce = true;
      continue;
    }

    // Transient server errors: back off and retry.
    if (resp.status >= 500 && attempt < maxRetries) {
      await sleep(backoffMs(attempt));
      attempt++;
      continue;
    }

    throw new SpotifyApiError(`Spotify API error (${resp.status}).`, resp.status);
  }
}

/** Exponential backoff with a small base: 0.5s, 1s, 2s, 4s, ... */
function backoffMs(attempt: number): number {
  return 500 * 2 ** attempt;
}

/** Walk every page of a paginated endpoint, accumulating all items. */
async function collectPages<T>(firstPath: string, pageCap = 40): Promise<T[]> {
  const items: T[] = [];
  let next: string | null = firstPath;
  let pages = 0;
  while (next && pages < pageCap) {
    const page: Paging<T> = await apiGet<Paging<T>>(next);
    items.push(...page.items);
    next = page.next;
    pages++;
  }
  return items;
}

/** Get the current user's profile. */
export function getCurrentUser(): Promise<SpotifyUser> {
  return apiGet<SpotifyUser>('/me');
}

/** List all of the current user's playlists (paginated). */
export function getMyPlaylists(): Promise<SpotifyPlaylistSummary[]> {
  return collectPages<SpotifyPlaylistSummary>('/me/playlists?limit=50');
}

/** Fetch all track items for a playlist (paginated, minimal fields). */
export function getPlaylistTracks(playlistId: string): Promise<PlaylistTrackItem[]> {
  const fields = encodeURIComponent(
    'items(track(id,name,is_local,artists(name),album(images))),next',
  );
  return collectPages<PlaylistTrackItem>(
    `/playlists/${playlistId}/tracks?limit=100&fields=${fields}`,
  );
}
