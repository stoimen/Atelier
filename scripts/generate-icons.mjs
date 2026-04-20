// Generates PWA icons as PNGs using only Node built-ins (no deps).
// Design: dark background with a pink → amber diagonal gradient and a
// minimal "A" glyph (triangle with a horizontal bar).
//
// Run: node scripts/generate-icons.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { Buffer } from "node:buffer";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "public");
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// Encode an RGBA Uint8Array of length w*h*4 as a PNG Buffer.
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Each scanline prefixed with filter byte 0.
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy ? rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
              : Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride)
                  .copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

// Renders a gradient background + "A" mark into an RGBA buffer.
function render(size, { padding = 0.12, markColor = [245, 245, 250] } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  // Diagonal gradient: top-left pink (#f472b6) → bottom-right amber (#f59e0b)
  // Base dark: #0b0b0f
  const c0 = [244, 114, 182];
  const c1 = [245, 158, 11];
  const dark = [11, 11, 15];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * (size - 1));
      const gr = mix(c0[0], c1[0], t);
      const gg = mix(c0[1], c1[1], t);
      const gb = mix(c0[2], c1[2], t);
      // Vignette: blend toward dark at edges (radial)
      const cx = size / 2;
      const cy = size / 2;
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const v = Math.pow(r, 2.0) * 0.55;
      const R = mix(gr, dark[0], v);
      const G = mix(gg, dark[1], v);
      const B = mix(gb, dark[2], v);
      const i = (y * size + x) * 4;
      buf[i] = R;
      buf[i + 1] = G;
      buf[i + 2] = B;
      buf[i + 3] = 255;
    }
  }

  // Draw a minimal "A" glyph: two strokes + crossbar, centered.
  const pad = size * padding;
  const innerW = size - pad * 2;
  const innerH = size - pad * 2;
  const apexX = size / 2;
  const apexY = pad + innerH * 0.08;
  const baseY = pad + innerH * 0.92;
  const leftX = size / 2 - innerW * 0.34;
  const rightX = size / 2 + innerW * 0.34;
  const stroke = Math.max(4, size * 0.07);

  function drawLine(x0, y0, x1, y1) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let s = 0; s <= steps; s++) {
      const tt = s / steps;
      const x = x0 + (x1 - x0) * tt;
      const y = y0 + (y1 - y0) * tt;
      // Stamp a round dot of radius stroke/2
      const r2 = (stroke / 2) * (stroke / 2);
      const xMin = Math.max(0, Math.floor(x - stroke));
      const xMax = Math.min(size - 1, Math.ceil(x + stroke));
      const yMin = Math.max(0, Math.floor(y - stroke));
      const yMax = Math.min(size - 1, Math.ceil(y + stroke));
      for (let py = yMin; py <= yMax; py++) {
        for (let px = xMin; px <= xMax; px++) {
          const d2 = (px - x) * (px - x) + (py - y) * (py - y);
          if (d2 <= r2) {
            const i = (py * size + px) * 4;
            buf[i] = markColor[0];
            buf[i + 1] = markColor[1];
            buf[i + 2] = markColor[2];
            buf[i + 3] = 255;
          }
        }
      }
    }
  }

  // Legs and crossbar
  drawLine(leftX, baseY, apexX, apexY);
  drawLine(rightX, baseY, apexX, apexY);
  const crossY = pad + innerH * 0.62;
  const crossL = apexX - innerW * 0.2;
  const crossR = apexX + innerW * 0.2;
  drawLine(crossL, crossY, crossR, crossY);

  return buf;
}

function writeIcon(name, size, opts) {
  const rgba = render(size, opts);
  const png = encodePNG(size, size, rgba);
  const path = resolve(outDir, name);
  writeFileSync(path, png);
  console.log("wrote", path, png.length, "bytes");
}

// Standard icons
writeIcon("icon-192.png", 192);
writeIcon("icon-512.png", 512);
// Maskable icon needs more padding so the mark survives circular masks.
writeIcon("icon-maskable-512.png", 512, { padding: 0.22 });
// Apple touch icon (180x180 is the modern iOS size, but 192 is acceptable
// and some iOS versions pick the closest size).
writeIcon("apple-touch-icon.png", 180);
