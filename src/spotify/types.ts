/**
 * Minimal type definitions for the subset of the Spotify Web API we consume.
 * Only the fields we actually read are modeled.
 */

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtist {
  name: string;
}

export interface SpotifyAlbum {
  images: SpotifyImage[];
}

export interface SpotifyTrack {
  id: string | null;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  is_local: boolean;
}

/** An item within a playlist's track list. `track` can be null for removed items. */
export interface PlaylistTrackItem {
  track: SpotifyTrack | null;
}

/** A page of results from a paginated endpoint. */
export interface Paging<T> {
  items: T[];
  next: string | null;
  total: number;
}

export interface SpotifyPlaylistSummary {
  id: string;
  name: string;
  images: SpotifyImage[];
  tracks: { total: number };
  owner: { display_name: string | null };
}

export interface SpotifyUser {
  id: string;
  display_name: string | null;
}

/** Token response from the Spotify token endpoint. */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}
