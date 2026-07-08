import { describe, it, expect } from 'vitest';
import { encodeCard, decodeCard } from './share';
import { generateCards } from '../cards';

function sampleCard() {
  const pool = Array.from({ length: 40 }, (_, i) => ({
    id: `t${i}`,
    title: `Song ${i}`,
    artists: [`Artist ${i}`, 'Feat'],
  }));
  return generateCards(pool, { gridSize: 5, freeSpace: true, count: 1, seed: 'share' }).cards[0]!;
}

describe('share encode/decode', () => {
  it('round-trips a card through encode → decode', () => {
    const card = sampleCard();
    const decoded = decodeCard(encodeCard(card));
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(card.id);
    expect(decoded?.gridSize).toBe(card.gridSize);
    expect(decoded?.cells).toHaveLength(card.cells.length);
  });

  it('preserves square kind, label, key, and the free space', () => {
    const card = sampleCard();
    const decoded = decodeCard(encodeCard(card))!;
    card.cells.forEach((cell, i) => {
      const d = decoded.cells[i]!;
      expect(d.isFreeSpace).toBe(cell.isFreeSpace);
      if (!cell.isFreeSpace) {
        expect(d.square?.kind).toBe(cell.square?.kind);
        expect(d.square?.label).toBe(cell.square?.label);
        expect(d.square?.key).toBe(cell.square?.key);
      }
    });
  });

  it('produces a URL-safe payload', () => {
    expect(encodeCard(sampleCard())).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('returns null for malformed input', () => {
    expect(decodeCard('not-valid-base64!!!')).toBeNull();
    expect(decodeCard('')).toBeNull();
  });
});
