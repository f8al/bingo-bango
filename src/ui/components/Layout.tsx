/** App chrome: header with nav + Spotify attribution footer. */

import { Link, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../useAuth';
import { Button } from './primitives';

function navClass({ isActive }: { isActive: boolean }): string {
  return `rounded-full px-3 py-1.5 text-sm transition-colors ${
    isActive ? 'bg-white/15 text-white' : 'opacity-70 hover:opacity-100'
  }`;
}

export function Layout({ children }: { children: ReactNode }) {
  const { authed, user, logout } = useAuth();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 pb-10">
      <header className="no-print sticky top-0 z-10 -mx-4 mb-6 flex items-center justify-between gap-3 border-b border-white/10 bg-[var(--color-ink)]/80 px-4 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--color-spotify)] text-black">
            🎵
          </span>
          Bingo Bango
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink to="/generate" className={navClass}>
            Generate
          </NavLink>
          <NavLink to="/call" className={navClass}>
            Caller
          </NavLink>
          {authed && (
            <Button variant="ghost" onClick={logout} className="ml-1 px-3 py-1.5 text-sm">
              {user?.display_name ? `Log out (${user.display_name})` : 'Log out'}
            </Button>
          )}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="no-print mt-10 flex flex-col items-center gap-1 border-t border-white/10 pt-5 text-center text-xs opacity-60">
        <span>
          Music played by the host from their own Spotify. Not affiliated with or endorsed by
          Spotify.
        </span>
        <span className="font-medium text-[var(--color-spotify)]">Powered by Spotify</span>
      </footer>
    </div>
  );
}
