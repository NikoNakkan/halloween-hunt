// Analog VHS look applied to a finished frame: wobble, tracking bar, colour bleed,
// chroma shift, grain, scanlines, head-switching noise, vignette and the VCR overlay.

import { rng } from "../../src/random";

export { rng };

export const W = 960;
export const H = 720;

export interface VhsLook {
  /** 0 = clean-ish tape, 1 = badly chewed tape. */
  damage: number;
  /** Vertical position of the rolling tracking bar (0–1), or null for none. */
  trackingY: number | null;
  /** Overall brightness flicker multiplier, around 1. */
  flicker: number;
}

/** Copy `src` onto `dst` in horizontal strips with a wavy, jittery offset. */
export function wobble(dst: CanvasRenderingContext2D, src: CanvasImageSource, t: number, look: VhsLook, rand: () => number): void {
  const strip = 4;
  for (let y = 0; y < H; y += strip) {
    let dx = Math.sin(y * 0.031 + t * 9) * (1.2 + look.damage * 5) + (rand() - 0.5) * look.damage * 3;
    if (look.trackingY !== null) {
      const dist = Math.abs(y / H - look.trackingY);
      if (dist < 0.05) dx += (rand() - 0.5) * 60 * (1 - dist / 0.05) * (0.4 + look.damage);
    }
    if (y > H - 24) dx += 18 + rand() * 10; // head-switching smear at the bottom
    dst.drawImage(src, 0, y, W, strip, dx, y, W, strip);
  }
}

/** Per-pixel pass: chroma shift, VHS colour, grain, scanlines, vignette. */
export function grade(ctx: CanvasRenderingContext2D, look: VhsLook, rand: () => number): void {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const src = new Uint8ClampedArray(d);
  const shift = 3 + Math.round(look.damage * 6);
  const grain = 18 + look.damage * 40;
  for (let y = 0; y < H; y++) {
    const scan = y % 2 === 0 ? 1 : 0.86;
    const vy = (y / H - 0.5) * 2;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const iR = (y * W + Math.min(W - 1, x + shift)) * 4;
      const iB = (y * W + Math.max(0, x - shift)) * 4;
      const vx = (x / W - 0.5) * 2;
      const vignette = 1 - 0.38 * (vx * vx + vy * vy);
      const n = (rand() - 0.5) * grain;
      const k = scan * vignette * look.flicker;
      // Washed-out tape colour: lifted blacks, slight teal shadows / warm highlights.
      d[i] = (src[iR] * 0.92 + 14 + n) * k;
      d[i + 1] = (src[i + 1] * 0.9 + 16 + n) * k;
      d[i + 2] = (src[iB + 2] * 0.85 + 22 + n) * k;
    }
  }
  // Random white dropout specks, more on damaged tape.
  const specks = Math.floor(look.damage * 120);
  for (let s = 0; s < specks; s++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    const len = 4 + Math.floor(rand() * 30);
    for (let j = 0; j < len && x + j < W; j++) {
      const i = (y * W + x + j) * 4;
      d[i] = d[i + 1] = d[i + 2] = 235;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Full-screen TV snow. */
export function snow(ctx: CanvasRenderingContext2D, rand: () => number, level = 1): void {
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = rand() * 255 * level;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function osdText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 34): void {
  ctx.font = `bold ${size}px "Courier New", monospace`;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillText(text, x + 3, y + 3);
  ctx.fillStyle = "#f2f2f2";
  ctx.fillText(text, x, y);
}

/** Camcorder/VCR on-screen display. */
export function overlay(ctx: CanvasRenderingContext2D, t: number, showPlay: boolean): void {
  if (showPlay && Math.floor(t * 2) % 2 === 0) osdText(ctx, "PLAY ▶", 48, 70);
  osdText(ctx, "SP", W - 110, 70);
  const secs = 41 + Math.floor(t);
  const frames = Math.floor((t % 1) * 30);
  osdText(ctx, "ΣΑΒ 31 ΟΚΤ 1987", 48, H - 92, 30);
  osdText(ctx, `23:59:${String(secs % 60).padStart(2, "0")}:${String(frames).padStart(2, "0")}`, 48, H - 52, 30);
}

/** Big glitchy text with RGB split, used for the warnings. */
export function glitchText(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, rand: () => number): void {
  ctx.save();
  ctx.font = `bold ${size}px "Courier New", monospace`;
  ctx.textAlign = "center";
  const jitter = () => (rand() - 0.5) * 4;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(255,0,0,0.85)";
  ctx.fillText(text, W / 2 - 3 + jitter(), y);
  ctx.fillStyle = "rgba(0,255,255,0.85)";
  ctx.fillText(text, W / 2 + 3 + jitter(), y);
  ctx.globalCompositeOperation = "source-over";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.strokeText(text, W / 2, y);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, W / 2, y);
  ctx.restore();
}
