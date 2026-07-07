/**
 * Client-side print-ready PDF export for a batch of bingo cards.
 *
 * Uses jsPDF to draw one card per page: a header, the card id, and the N×N grid
 * with each square's song title + artist (or a starred free space). Runs entirely
 * in the browser — no server round-trip.
 */

import { jsPDF } from 'jspdf';
import type { BingoCard, CardCell } from '../cards';

export interface PdfOptions {
  /** Heading printed at the top of each card (e.g. the playlist name). */
  title?: string;
  /** Optional subtitle line (e.g. "Powered by Spotify · seed ABCD1234"). */
  subtitle?: string;
}

const PAGE = { w: 595.28, h: 841.89 }; // A4 in points
const MARGIN = 40;

function cellText(cell: CardCell): { title: string; artist: string; free: boolean } {
  if (cell.isFreeSpace || !cell.song) return { title: 'FREE', artist: '', free: true };
  return { title: cell.song.title, artist: cell.song.artists.join(', '), free: false };
}

function drawCard(doc: jsPDF, card: BingoCard, opts: PdfOptions): void {
  const { gridSize } = card;
  let cursorY = MARGIN;

  if (opts.title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(opts.title, PAGE.w / 2, cursorY + 8, { align: 'center' });
    cursorY += 26;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120);
  const meta = [opts.subtitle, `Card ${card.id}`].filter(Boolean).join('  ·  ');
  doc.text(meta, PAGE.w / 2, cursorY + 6, { align: 'center' });
  doc.setTextColor(0);
  cursorY += 22;

  const gridDim = PAGE.w - MARGIN * 2;
  const cellSize = gridDim / gridSize;
  const top = cursorY;

  doc.setDrawColor(30);
  doc.setLineWidth(1);

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const idx = r * gridSize + c;
      const cell = card.cells[idx];
      if (!cell) continue;
      const x = MARGIN + c * cellSize;
      const y = top + r * cellSize;

      const { title, artist, free } = cellText(cell);
      if (free) {
        doc.setFillColor(29, 185, 84); // Spotify green
        doc.rect(x, y, cellSize, cellSize, 'FD');
        doc.setTextColor(255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('FREE', x + cellSize / 2, y + cellSize / 2 + 4, { align: 'center' });
        doc.setTextColor(0);
        continue;
      }

      doc.rect(x, y, cellSize, cellSize, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const titleLines = doc.splitTextToSize(title, cellSize - 10) as string[];
      const shownTitle = titleLines.slice(0, 3);
      doc.text(shownTitle, x + cellSize / 2, y + cellSize / 2 - 6, {
        align: 'center',
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(90);
      const artistLines = doc.splitTextToSize(artist, cellSize - 10) as string[];
      doc.text(artistLines.slice(0, 2), x + cellSize / 2, y + cellSize / 2 + 14, {
        align: 'center',
      });
      doc.setTextColor(0);
    }
  }
}

/** Build a jsPDF document for the given cards (one card per page). */
export function buildPdf(cards: readonly BingoCard[], opts: PdfOptions = {}): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  cards.forEach((card, i) => {
    if (i > 0) doc.addPage();
    drawCard(doc, card, opts);
  });
  return doc;
}

/** Build and trigger a browser download of the cards as a PDF. */
export function downloadCardsPdf(
  cards: readonly BingoCard[],
  filename = 'bingo-cards.pdf',
  opts: PdfOptions = {},
): void {
  const doc = buildPdf(cards, opts);
  doc.save(filename);
}
