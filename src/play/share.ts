/**
 * Self-contained share encoding for a single bingo card.
 *
 * A shared card is encoded into a compact JSON payload and base64url-stuffed
 * into the URL hash, so a link (or its QR code) reconstructs the exact card on
 * any device — no backend, no shared state required.
 */

import type { BingoCard, CardCell, Square } from '../cards';

/** Compact wire form: free space -> 0; square -> [kindFlag, label, key]. */
type WireCell = 0 | [0 | 1, string, string];
interface WireCard {
  v: 2;
  id: string;
  g: number;
  c: WireCell[];
}

function toWire(card: BingoCard): WireCard {
  return {
    v: 2,
    id: card.id,
    g: card.gridSize,
    c: card.cells.map((cell): WireCell => {
      if (cell.isFreeSpace || !cell.square) return 0;
      const flag: 0 | 1 = cell.square.kind === 'artist' ? 1 : 0;
      return [flag, cell.square.label, cell.square.key];
    }),
  };
}

function fromWire(wire: WireCard): BingoCard {
  const cells: CardCell[] = wire.c.map((wc): CardCell => {
    if (wc === 0) return { square: null, isFreeSpace: true };
    const [flag, label, key] = wc;
    const square: Square = { kind: flag === 1 ? 'artist' : 'title', label, key };
    return { square, isFreeSpace: false };
  });
  return { id: wire.id, gridSize: wire.g, cells };
}

/** UTF-8 safe base64url encode. */
function b64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** UTF-8 safe base64url decode. */
function b64urlDecode(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Encode a card into a URL-safe string for the `#c=` share hash. */
export function encodeCard(card: BingoCard): string {
  return b64urlEncode(JSON.stringify(toWire(card)));
}

/** Decode a shared card string. Returns null on any malformed input. */
export function decodeCard(encoded: string): BingoCard | null {
  try {
    const wire = JSON.parse(b64urlDecode(encoded)) as WireCard;
    if (wire.v !== 2 || !Array.isArray(wire.c) || typeof wire.g !== 'number') return null;
    return fromWire(wire);
  } catch {
    return null;
  }
}
