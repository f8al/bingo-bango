/** Landing screen: pitch, login, and quick links. */

import { Link } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { Button, Panel } from '../components/primitives';

export function Home() {
  const { authed, configured, login } = useAuth();

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col items-center gap-4 py-8 text-center">
        <h1 className="text-4xl font-black sm:text-5xl">
          Music bingo, <span className="text-[var(--color-spotify)]">straight from Spotify</span>
        </h1>
        <p className="max-w-xl text-balance opacity-80">
          Turn any of your playlists into a batch of unique, randomized bingo cards. Print them or
          play on a phone. You host the music from your own Spotify — Bingo Bango just makes the
          cards.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {configured && !authed && (
            <Button onClick={login}>Connect Spotify</Button>
          )}
          <Link to="/generate">
            <Button variant={authed ? 'primary' : 'secondary'}>
              {authed ? 'Generate cards' : 'Try the demo'}
            </Button>
          </Link>
        </div>
        {!configured && (
          <p className="text-xs opacity-60">
            No Spotify app configured — running in demo mode with a built-in song pool.
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['1 · Pick a playlist', 'Log in read-only and choose any playlist as your song pool.'],
          ['2 · Generate cards', 'Choose grid size, free space, and how many unique cards you need.'],
          ['3 · Print or play', 'Export a print-ready PDF, or play interactive cards on any device.'],
        ].map(([title, body]) => (
          <Panel key={title}>
            <h2 className="mb-1 font-bold text-[var(--color-spotify)]">{title}</h2>
            <p className="text-sm opacity-80">{body}</p>
          </Panel>
        ))}
      </section>

      <section className="text-center text-sm opacity-70">
        Read-only access ·{' '}
        <code className="rounded bg-white/10 px-1">playlist-read-private</code>{' '}
        <code className="rounded bg-white/10 px-1">playlist-read-collaborative</code> · tokens stay
        in your browser.
      </section>
    </div>
  );
}
