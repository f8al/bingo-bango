/**
 * Single-card play + share screen (`/card/:id`).
 *
 * Resolves the card from the current batch, or — for a link opened on another
 * device — from a self-contained `#c=` payload in the URL hash. Renders an
 * interactive card with BINGO detection plus a shareable link and QR code.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import type { BingoCard } from '../../cards';
import { useBatch } from '../state';
import { encodeCard, decodeCard } from '../../play/share';
import { BingoCardView } from '../components/BingoCardView';
import { Button, Panel } from '../components/primitives';

export function CardView() {
  const { id } = useParams<{ id: string }>();
  const { batch } = useBatch();

  const card: BingoCard | null = useMemo(() => {
    const fromBatch = batch?.result.cards.find((c) => c.id === id);
    if (fromBatch) return fromBatch;
    const hash = window.location.hash;
    const match = /[#&]c=([^&]+)/.exec(hash);
    return match?.[1] ? decodeCard(match[1]) : null;
  }, [batch, id]);

  const shareUrl = useMemo(() => {
    if (!card) return '';
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#c=${encodeCard(card)}`;
  }, [card]);

  const [qr, setQr] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!shareUrl) return;
    let active = true;
    QRCode.toDataURL(shareUrl, { margin: 1, width: 220 })
      .then((url) => {
        if (active) setQr(url);
      })
      .catch(() => setQr(''));
    return () => {
      active = false;
    };
  }, [shareUrl]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (!card) {
    return (
      <Panel className="mx-auto max-w-md text-center">
        <p className="mb-3 text-sm opacity-80">
          This card isn’t available. Generate a batch first, or open a valid share link.
        </p>
        <Link to="/generate">
          <Button>Go to generator</Button>
        </Link>
      </Panel>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">Play card</h1>
        <Link to="/generate" className="text-sm opacity-70 hover:opacity-100">
          ← all cards
        </Link>
      </div>

      <BingoCardView card={card} interactive />

      <p className="text-center text-xs opacity-60">
        Tap squares as the host plays each song. A full row, column, or diagonal wins.
      </p>

      <Panel className="no-print flex flex-col items-center gap-3">
        <h2 className="text-sm font-bold opacity-80">Share this card</h2>
        {qr && <img src={qr} alt="QR code linking to this card" className="rounded-lg bg-white p-2" />}
        <div className="flex w-full gap-2">
          <input
            readOnly
            value={shareUrl}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button variant="secondary" onClick={() => void copy()}>
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
