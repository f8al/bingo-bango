/** OAuth redirect target: exchanges the code, then routes onward to /generate. */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleCallback } from '../../spotify/auth';
import { Button, Panel, Spinner } from '../components/primitives';

export function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    handleCallback(search)
      .then(() => navigate('/generate', { replace: true }))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Login failed.'));
  }, [navigate]);

  return (
    <div className="mx-auto max-w-md py-16">
      <Panel className="flex flex-col items-center gap-4 text-center">
        {error ? (
          <>
            <h1 className="text-lg font-bold">Couldn’t finish signing in</h1>
            <p className="text-sm opacity-80">{error}</p>
            <Button onClick={() => navigate('/', { replace: true })}>Back to start</Button>
          </>
        ) : (
          <>
            <Spinner label="Finishing sign-in…" />
            <p className="text-xs opacity-60">Exchanging your Spotify authorization…</p>
          </>
        )}
      </Panel>
    </div>
  );
}
