import type { FrameColor, FrameType, FilmFilter, PhotoEntry } from '@/models';
import { colors } from '@/theme/colors';
import { filmFilters, frameColors } from '@/theme/film';
import { printFormats } from '@/theme/spacing';
import { formatClock, formatLongDate } from '@/utils/date';

/** One print on the printable album page; `imageSrc` is a base64 data URL. */
export interface AlbumPrint {
  id: string;
  imageSrc: string;
  caption: string | null;
  /** ISO-8601 UTC. */
  createdAt: string;
  place: string | null;
  frameType: FrameType;
  filter: FilmFilter;
}

export interface AlbumHtmlOptions {
  frameColor: FrameColor;
  /** Shown in the page header, e.g. "Nhật ký ảnh". */
  title: string;
  /** Header when the album has no prints. */
  emptyMessage: string;
}

export const ALBUM_TITLE = 'Nhật ký ảnh';
export const ALBUM_EMPTY_MESSAGE = 'Chưa có tấm ảnh nào.';
const SEPARATOR = ' · ';
const PERCENT = 100;
const PAGE_MARGIN_MM = 14;
const GRID_GAP_PX = 22;
const PRINT_BORDER_PX = 10;
const PRINT_BOTTOM_PX = 34;
const IMAGE_MIME = 'image/jpeg';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

export function toDataUrl(base64: string, mime: string = IMAGE_MIME): string {
  return `data:${mime};base64,${base64}`;
}

export function toAlbumPrint(photo: PhotoEntry, imageSrc: string): AlbumPrint {
  return {
    id: photo.id,
    imageSrc,
    caption: photo.caption,
    createdAt: photo.createdAt,
    place: photo.locationName,
    frameType: photo.frameType,
    filter: photo.filter,
  };
}

/** Width of a print as a share of its grid cell: the wide format fills the cell, others are scaled. */
export function printWidthPercent(frameType: FrameType): number {
  return Math.round((printFormats[frameType].w / printFormats.wide.w) * PERCENT);
}

/** Height of the photo window as a percentage of its width (padding-top aspect-ratio trick). */
export function windowPaddingPercent(frameType: FrameType): number {
  const { iw, ih } = printFormats[frameType];
  return Math.round((ih / iw) * PERCENT * 100) / 100;
}

function renderPrint(print: AlbumPrint): string {
  const filter = filmFilters[print.filter];
  const imageFilter = filter.filter ? ` style="filter:${escapeHtml(filter.filter)}"` : '';
  const tint = filter.tint
    ? `<div class="tint" style="background:${filter.tint.color};opacity:${filter.tint.opacity}"></div>`
    : '';
  const caption = print.caption?.trim()
    ? `<p class="caption">${escapeHtml(print.caption.trim())}</p>`
    : '';
  const meta = [formatLongDate(print.createdAt), formatClock(print.createdAt)].join(SEPARATOR);
  const place = print.place?.trim() ? `<p class="place">${escapeHtml(print.place.trim())}</p>` : '';
  return `<div class="cell"><figure class="print" style="width:${printWidthPercent(print.frameType)}%">
<div class="window" style="padding-top:${windowPaddingPercent(print.frameType)}%"><img src="${print.imageSrc}" alt=""${imageFilter}>${tint}</div>
${caption}<p class="meta">${escapeHtml(meta)}</p>${place}
</figure></div>`;
}

function describeRange(sorted: readonly AlbumPrint[]): string {
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const from = formatLongDate(first.createdAt);
  const to = formatLongDate(last.createdAt);
  return from === to ? from : `${from} – ${to}`;
}

/**
 * Printable album: every print as a Polaroid on a 2-column page, oldest first.
 * Pure: images arrive already embedded as data URLs, so the document is self-contained.
 */
export function buildAlbumHtml(prints: readonly AlbumPrint[], options: AlbumHtmlOptions): string {
  const frame = frameColors[options.frameColor];
  const sorted = [...prints].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const subtitle =
    sorted.length > 0 ? `${sorted.length} tấm ảnh${SEPARATOR}${describeRange(sorted)}` : options.emptyMessage;
  const body = sorted.map(renderPrint).join('\n');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(options.title)}</title>
<style>
@page { margin: ${PAGE_MARGIN_MM}mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; background: ${colors.sheet}; color: ${colors.ink};
  font-family: 'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
header { padding: 8px 4px ${GRID_GAP_PX}px; }
h1 { margin: 0; font-size: 28px; font-weight: 600; }
.subtitle { margin: 6px 0 0; font-size: 13px; color: ${colors.muted}; }
.grid { display: flex; flex-wrap: wrap; margin: 0 -${GRID_GAP_PX / 2}px; }
.cell { width: 50%; padding: 0 ${GRID_GAP_PX / 2}px ${GRID_GAP_PX}px; display: flex; justify-content: center;
  align-items: flex-start; break-inside: avoid; page-break-inside: avoid; }
.print { margin: 0; background: ${frame.fill}; color: ${frame.ink};
  padding: ${PRINT_BORDER_PX}px ${PRINT_BORDER_PX}px ${PRINT_BOTTOM_PX}px;
  border: 1px solid ${colors.hairline}; border-radius: 3px; }
.window { position: relative; width: 100%; overflow: hidden; background: ${colors.undevelopedFilm}; }
.window img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
.tint { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.caption { margin: 10px 0 0; font-family: 'Patrick Hand', 'Segoe Print', 'Bradley Hand', cursive; font-size: 17px; line-height: 1.2; }
.meta { margin: 6px 0 0; font-size: 10px; color: ${frame.inkSoft}; }
.place { margin: 2px 0 0; font-size: 10px; color: ${frame.inkSoft}; }
</style>
</head>
<body>
<header><h1>${escapeHtml(options.title)}</h1><p class="subtitle">${escapeHtml(subtitle)}</p></header>
<main class="grid">
${body}
</main>
</body>
</html>`;
}
