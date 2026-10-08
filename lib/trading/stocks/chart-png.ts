/**
 * Lightweight PNG chart for opportunity Telegram alerts (no canvas/sharp deps).
 * Renders daily candles (~6m) + optional hourly panel with EMAs and levels.
 */

import { deflateSync } from "node:zlib";
import type { OhlcvBar } from "@/lib/market-data/types";

export type OpportunityChartInput = {
  symbol: string;
  daily: readonly OhlcvBar[];
  hourly?: readonly OhlcvBar[];
  entry: number;
  stop: number;
  target: number;
  support: number;
  resistance: number;
};

const W = 900;
const H = 560;
const PAD = { l: 56, r: 16, t: 36, b: 28 };

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crcData = Buffer.concat([typeBuf, Buffer.from(data)]);
  crcBuf.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([len, typeBuf, Buffer.from(data), crcBuf]);
}

function encodePng(width: number, height: number, rgba: Buffer): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const compressed = deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", new Uint8Array(0)),
  ]);
}

type RGB = [number, number, number];

class Bitmap {
  w: number;
  h: number;
  data: Buffer;
  constructor(w: number, h: number, bg: RGB = [12, 16, 24]) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i += 1) {
      const o = i * 4;
      this.data[o] = bg[0];
      this.data[o + 1] = bg[1];
      this.data[o + 2] = bg[2];
      this.data[o + 3] = 255;
    }
  }
  set(x: number, y: number, rgb: RGB, a = 255): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    const o = (yi * this.w + xi) * 4;
    if (a >= 255) {
      this.data[o] = rgb[0];
      this.data[o + 1] = rgb[1];
      this.data[o + 2] = rgb[2];
      this.data[o + 3] = 255;
      return;
    }
    const t = a / 255;
    this.data[o] = Math.round(this.data[o]! * (1 - t) + rgb[0] * t);
    this.data[o + 1] = Math.round(this.data[o + 1]! * (1 - t) + rgb[1] * t);
    this.data[o + 2] = Math.round(this.data[o + 2]! * (1 - t) + rgb[2] * t);
  }
  fillRect(x0: number, y0: number, x1: number, y1: number, rgb: RGB, a = 255): void {
    const xa = Math.max(0, Math.floor(Math.min(x0, x1)));
    const xb = Math.min(this.w - 1, Math.ceil(Math.max(x0, x1)));
    const ya = Math.max(0, Math.floor(Math.min(y0, y1)));
    const yb = Math.min(this.h - 1, Math.ceil(Math.max(y0, y1)));
    for (let y = ya; y <= yb; y += 1) {
      for (let x = xa; x <= xb; x += 1) this.set(x, y, rgb, a);
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, rgb: RGB, width = 1): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    for (;;) {
      for (let ox = -Math.floor(width / 2); ox <= Math.floor(width / 2); ox += 1) {
        for (let oy = -Math.floor(width / 2); oy <= Math.floor(width / 2); oy += 1) {
          this.set(x + ox, y + oy, rgb);
        }
      }
      if (Math.abs(x - x1) < 0.5 && Math.abs(y - y1) < 0.5) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }
  hline(y: number, x0: number, x1: number, rgb: RGB, dash = false): void {
    const ya = Math.round(y);
    const xa = Math.min(x0, x1);
    const xb = Math.max(x0, x1);
    for (let x = xa; x <= xb; x += 1) {
      if (dash && Math.floor(x / 6) % 2 === 1) continue;
      this.set(x, ya, rgb);
    }
  }
}

/** 5×7 bitmap font (digits, A-Z, few symbols). */
const GLYPHS: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0],
  "-": [0, 0, 31, 0, 0],
  ".": [0, 0, 0, 0, 4],
  ":": [0, 4, 0, 4, 0],
  "/": [1, 2, 4, 8, 16],
  "%": [17, 2, 4, 8, 17],
  $: [4, 15, 20, 15, 4],
  "€": [14, 16, 28, 16, 14],
  "0": [14, 17, 17, 17, 14],
  "1": [4, 12, 4, 4, 14],
  "2": [14, 1, 14, 16, 31],
  "3": [30, 1, 14, 1, 30],
  "4": [18, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 30],
  "6": [14, 16, 30, 17, 14],
  "7": [31, 1, 2, 4, 8],
  "8": [14, 17, 14, 17, 14],
  "9": [14, 17, 15, 1, 14],
  A: [14, 17, 31, 17, 17],
  B: [30, 17, 30, 17, 30],
  C: [14, 17, 16, 17, 14],
  D: [30, 17, 17, 17, 30],
  E: [31, 16, 30, 16, 31],
  F: [31, 16, 30, 16, 16],
  G: [14, 16, 19, 17, 14],
  H: [17, 17, 31, 17, 17],
  I: [14, 4, 4, 4, 14],
  J: [1, 1, 1, 17, 14],
  K: [17, 18, 28, 18, 17],
  L: [16, 16, 16, 16, 31],
  M: [17, 27, 21, 17, 17],
  N: [17, 25, 21, 19, 17],
  O: [14, 17, 17, 17, 14],
  P: [30, 17, 30, 16, 16],
  Q: [14, 17, 17, 19, 15],
  R: [30, 17, 30, 18, 17],
  S: [15, 16, 14, 1, 30],
  T: [31, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 14],
  V: [17, 17, 17, 10, 4],
  W: [17, 17, 21, 21, 10],
  X: [17, 10, 4, 10, 17],
  Y: [17, 10, 4, 4, 4],
  Z: [31, 2, 4, 8, 31],
};

function drawText(bmp: Bitmap, text: string, x: number, y: number, rgb: RGB, scale = 1): void {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS[" "]!;
    for (let col = 0; col < 5; col += 1) {
      const bits = g[col] ?? 0;
      for (let row = 0; row < 7; row += 1) {
        if (bits & (1 << row)) {
          for (let sy = 0; sy < scale; sy += 1) {
            for (let sx = 0; sx < scale; sx += 1) {
              bmp.set(cx + col * scale + sx, y + row * scale + sy, rgb);
            }
          }
        }
      }
    }
    cx += 6 * scale;
  }
}

function panelPriceRange(
  bars: readonly OhlcvBar[],
  extras: number[],
): { lo: number; hi: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const b of bars) {
    lo = Math.min(lo, b.low);
    hi = Math.max(hi, b.high);
  }
  for (const e of extras) {
    if (Number.isFinite(e) && e > 0) {
      lo = Math.min(lo, e);
      hi = Math.max(hi, e);
    }
  }
  if (!(hi > lo)) {
    lo = 0;
    hi = 1;
  }
  const pad = (hi - lo) * 0.06;
  return { lo: lo - pad, hi: hi + pad };
}

function drawCandles(
  bmp: Bitmap,
  bars: readonly OhlcvBar[],
  box: { x: number; y: number; w: number; h: number },
  lo: number,
  hi: number,
): void {
  const n = bars.length;
  if (n === 0) return;
  const slot = box.w / n;
  const yOf = (p: number) => box.y + ((hi - p) / (hi - lo)) * box.h;
  for (let i = 0; i < n; i += 1) {
    const b = bars[i]!;
    const cx = box.x + i * slot + slot / 2;
    const up = b.close >= b.open;
    const rgb: RGB = up ? [34, 197, 94] : [239, 68, 68];
    bmp.line(cx, yOf(b.high), cx, yOf(b.low), rgb, 1);
    const y1 = yOf(Math.max(b.open, b.close));
    const y2 = yOf(Math.min(b.open, b.close));
    const half = Math.max(1, slot * 0.35);
    bmp.fillRect(cx - half, y1, cx + half, Math.max(y2, y1 + 1), rgb);
  }
}

function drawEmaLine(
  bmp: Bitmap,
  closes: number[],
  period: number,
  box: { x: number; y: number; w: number; h: number },
  lo: number,
  hi: number,
  rgb: RGB,
): void {
  const n = closes.length;
  if (n < period) return;
  const yOf = (p: number) => box.y + ((hi - p) / (hi - lo)) * box.h;
  const slot = box.w / n;
  let prev: number | null = null;
  let prevX = 0;
  let prevY = 0;
  // Reconstruct EMA series point-by-point
  const k = 2 / (period + 1);
  let emaVal = closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period - 1; i < n; i += 1) {
    if (i >= period) emaVal = closes[i]! * k + emaVal * (1 - k);
    const x = box.x + i * slot + slot / 2;
    const y = yOf(emaVal);
    if (prev != null) bmp.line(prevX, prevY, x, y, rgb, 1);
    prev = emaVal;
    prevX = x;
    prevY = y;
  }
}

function drawLevel(
  bmp: Bitmap,
  price: number,
  label: string,
  box: { x: number; y: number; w: number; h: number },
  lo: number,
  hi: number,
  rgb: RGB,
): void {
  if (!(price > 0) || price < lo || price > hi) return;
  const y = box.y + ((hi - price) / (hi - lo)) * box.h;
  bmp.hline(y, box.x, box.x + box.w, rgb, true);
  drawText(bmp, `${label} ${price.toFixed(2)}`, box.x + 4, y - 8, rgb, 1);
}

export function renderOpportunityChartPng(input: OpportunityChartInput): Buffer {
  const daily = input.daily.slice(-130); // ~6 months trading days
  const hourly = (input.hourly ?? []).slice(-80);
  const bmp = new Bitmap(W, H, [15, 18, 28]);

  drawText(bmp, `${input.symbol}  DAILY + 1H`, PAD.l, 10, [226, 232, 240], 2);

  const extras = [input.entry, input.stop, input.target, input.support, input.resistance];
  const dailyBox = {
    x: PAD.l,
    y: PAD.t,
    w: W - PAD.l - PAD.r,
    h: hourly.length >= 20 ? 280 : H - PAD.t - PAD.b,
  };
  const { lo: dLo, hi: dHi } = panelPriceRange(daily, extras);
  bmp.fillRect(dailyBox.x, dailyBox.y, dailyBox.x + dailyBox.w, dailyBox.y + dailyBox.h, [22, 27, 40], 180);
  drawCandles(bmp, daily, dailyBox, dLo, dHi);
  const dCloses = daily.map((b) => b.close);
  drawEmaLine(bmp, dCloses, 20, dailyBox, dLo, dHi, [56, 189, 248]);
  drawEmaLine(bmp, dCloses, 50, dailyBox, dLo, dHi, [251, 191, 36]);
  drawEmaLine(bmp, dCloses, 200, dailyBox, dLo, dHi, [167, 139, 250]);
  drawLevel(bmp, input.support, "SUP", dailyBox, dLo, dHi, [96, 165, 250]);
  drawLevel(bmp, input.resistance, "RES", dailyBox, dLo, dHi, [251, 146, 60]);
  drawLevel(bmp, input.entry, "IN", dailyBox, dLo, dHi, [52, 211, 153]);
  drawLevel(bmp, input.stop, "SL", dailyBox, dLo, dHi, [248, 113, 113]);
  drawLevel(bmp, input.target, "TP", dailyBox, dLo, dHi, [74, 222, 128]);

  if (hourly.length >= 20) {
    const hourlyBox = {
      x: PAD.l,
      y: dailyBox.y + dailyBox.h + 24,
      w: dailyBox.w,
      h: H - PAD.b - (dailyBox.y + dailyBox.h + 24),
    };
    drawText(bmp, "1H", hourlyBox.x, hourlyBox.y - 14, [148, 163, 184], 1);
    const { lo: hLo, hi: hHi } = panelPriceRange(hourly, extras);
    bmp.fillRect(
      hourlyBox.x,
      hourlyBox.y,
      hourlyBox.x + hourlyBox.w,
      hourlyBox.y + hourlyBox.h,
      [22, 27, 40],
      180,
    );
    drawCandles(bmp, hourly, hourlyBox, hLo, hHi);
    const hCloses = hourly.map((b) => b.close);
    drawEmaLine(bmp, hCloses, 20, hourlyBox, hLo, hHi, [56, 189, 248]);
    drawEmaLine(bmp, hCloses, 50, hourlyBox, hLo, hHi, [251, 191, 36]);
    drawLevel(bmp, input.entry, "IN", hourlyBox, hLo, hHi, [52, 211, 153]);
    drawLevel(bmp, input.stop, "SL", hourlyBox, hLo, hHi, [248, 113, 113]);
    drawLevel(bmp, input.target, "TP", hourlyBox, hLo, hHi, [74, 222, 128]);
  }

  return encodePng(W, H, bmp.data);
}
