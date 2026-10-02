/**
 * Generates the app icon / splash / adaptive-icon PNGs (Polaroid on paper, Y2K accents)
 * with no dependencies: rasterises simple shapes and encodes PNG via zlib.
 * Run: node scripts/generate-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
// Mirrors src/theme/colors.ts
const C = {
  paper: hex('#F5F1E8'),
  polaroid: hex('#FFFDF8'),
  ink: hex('#111111'),
  pink: hex('#FF6FAE'),
  blue: hex('#69C7FF'),
  lime: hex('#D9FF5C'),
  shade: hex('#E9E3D6'),
  clear: [0, 0, 0, 0],
};

function canvas(size, bg) {
  const px = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) px.set(bg, i * 4);
  return { size, px };
}

function blend(cv, x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= cv.size || y >= cv.size) return;
  const i = (y * cv.size + x) * 4;
  const a = (color[3] / 255) * alpha;
  for (let k = 0; k < 3; k++) cv.px[i + k] = cv.px[i + k] * (1 - a) + color[k] * a;
  cv.px[i + 3] = Math.max(cv.px[i + 3], a * 255);
}

/** Filled shape test function rendered with 4x4 supersampling, rotated around (cx, cy). */
function fill(cv, inside, color, rotDeg = 0, cx = cv.size / 2, cy = cv.size / 2) {
  const r = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(-r);
  const sin = Math.sin(-r);
  const S = 4;
  for (let y = 0; y < cv.size; y++) {
    for (let x = 0; x < cv.size; x++) {
      let hits = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S - cx;
          const py = y + (sy + 0.5) / S - cy;
          const ux = px * cos - py * sin + cx;
          const uy = px * sin + py * cos + cy;
          if (inside(ux, uy)) hits++;
        }
      }
      if (hits) blend(cv, x, y, color, hits / (S * S));
    }
  }
}

const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
const circle = (cx, cy, rad) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad;

function drawPolaroid(cv, scale, withShadow = true) {
  const s = cv.size;
  const c = s / 2;
  const w = s * 0.56 * scale;
  const h = w * 1.18;
  const x0 = c - w / 2;
  const y0 = c - h / 2;
  const pad = w * 0.075;
  const tilt = -6;
  if (withShadow) fill(cv, rect(x0 + s * 0.02, y0 + s * 0.025, x0 + w + s * 0.02, y0 + h + s * 0.025), [17, 17, 17, 60], tilt);
  fill(cv, rect(x0, y0, x0 + w, y0 + h), C.polaroid, tilt);
  // Photo window: pink sky, blue hill, lime sun — a tiny memory.
  const ix0 = x0 + pad, iy0 = y0 + pad, ix1 = x0 + w - pad, iy1 = iy0 + (w - pad * 2);
  fill(cv, rect(ix0, iy0, ix1, iy1), C.pink, tilt);
  fill(cv, (x, y) => rect(ix0, iy0, ix1, iy1)(x, y) && circle(ix0 + (ix1 - ix0) * 0.5, iy1 + (iy1 - iy0) * 0.55, (ix1 - ix0) * 0.85)(x, y), C.blue, tilt);
  fill(cv, circle(ix0 + (ix1 - ix0) * 0.72, iy0 + (iy1 - iy0) * 0.3, (ix1 - ix0) * 0.13), C.lime, tilt);
  // Handwritten-ish line on the bottom strip.
  const ly = iy1 + (y0 + h - iy1) * 0.5;
  fill(cv, rect(ix0 + w * 0.08, ly - w * 0.012, ix0 + w * 0.48, ly + w * 0.012), C.ink, tilt);
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function writePng(cv, file) {
  const { size, px } = cv;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  console.log('wrote', path.relative(process.cwd(), file));
}

const out = (name) => path.join(__dirname, '..', 'assets', name);
const SIZE = 1024;

const icon = canvas(SIZE, C.paper);
fill(icon, circle(SIZE * 0.82, SIZE * 0.18, SIZE * 0.07), C.lime);
fill(icon, circle(SIZE * 0.16, SIZE * 0.86, SIZE * 0.05), C.blue);
drawPolaroid(icon, 1.15);
writePng(icon, out('icon.png'));

const fg = canvas(SIZE, C.clear);
drawPolaroid(fg, 0.85);
writePng(fg, out('android-icon-foreground.png'));

writePng(canvas(SIZE, C.paper), out('android-icon-background.png'));

const mono = canvas(SIZE, C.clear);
const monoInk = [0, 0, 0, 255];
const outer = rect(SIZE * 0.3, SIZE * 0.26, SIZE * 0.7, SIZE * 0.74);
const window = rect(SIZE * 0.33, SIZE * 0.29, SIZE * 0.67, SIZE * 0.63);
fill(mono, (x, y) => outer(x, y) && !window(x, y), monoInk, -6);
writePng(mono, out('android-icon-monochrome.png'));

const favicon = canvas(64, C.paper);
drawPolaroid(favicon, 1.3, false);
writePng(favicon, out('favicon.png'));
