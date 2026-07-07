/**
 * React hook wrapping the Spotify auth lifecycle. Exposes the current
 * authentication state plus `login` / `logout` actions.
 */

import { useCallback, useEffect, useState } from 'react';
import { beginLogin, isAuthenticated, logout as doLogout } from '../spotify/auth';
import { getCurrentUser } from '../spotify/client';
import { IS_SPOTIFY_CONFIGURED } from '../config';
import type { SpotifyUser } from '../spotify/types';

export interface AuthState {
  authed: boolean;
  configured: boolean;
  user: SpotifyUser | null;
  loadingUser: boolean;
  login: () => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [authed, setAuthed] = useState<boolean>(() => isAuthenticated());
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    if (authed && !user) {
      setLoadingUser(true);
      getCurrentUser()
        .then((u) => {
          if (!cancelled) setUser(u);
        })
        .catch(() => {
          /* token likely invalid; leave user null, UI can re-prompt */
        })
        .finally(() => {
          if (!cancelled) setLoadingUser(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [authed, user]);

  const login = useCallback(() => {
    void beginLogin();
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setAuthed(false);
    setUser(null);
  }, []);

  return {
    authed,
    configured: IS_SPOTIFY_CONFIGURED,
    user,
    loadingUser,
    login,
    logout,
  };
}
