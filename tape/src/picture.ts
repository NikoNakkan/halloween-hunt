// Draws frame t of the cursed tape onto the screen canvas.
import { FACE_SVG } from "../../src/face";
import { seek } from "./footage";
import { DURATION, FLASHES, STARE_TEXT, filmTime, shotAt } from "./timeline";
import { H, W, glitchText, grade, overlay, rng, snow, wobble, type VhsLook } from "./vhs";

const work = document.createElement("canvas");
work.width = W;
work.height = H;
const wctx = work.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;

let face: HTMLImageElement | null = null;

async function faceImage(): Promise<HTMLImageElement> {
  if (face) return face;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(FACE_SVG)}`;
  await img.decode();
  face = img;
  return img;
}

function drawFace(ctx: CanvasRenderingContext2D, img: HTMLImageElement, local: number, rand: () => number): void {
  // Lunges at the camera in the first 0.25 s, then shakes; red/black strobe behind.
  const lunge = Math.min(1, local / 0.25);
  const scale = 0.25 + 0.95 * (1 - (1 - lunge) ** 3);
  const strobe = Math.floor(local * 15) % 2 === 0;
  ctx.fillStyle = strobe ? "#b00000" : "#000";
  ctx.fillRect(0, 0, W, H);
  const h = H * 1.05 * scale;
  const w = h * (200 / 240);
  const shake = local > 0.25 ? 14 : 0;
  ctx.drawImage(img, (W - w) / 2 + (rand() - 0.5) * shake, (H - h) / 2 + (rand() - 0.5) * shake, w, h);
}

/** Render one frame; returns nothing, the result is on `screen`. */
export async function drawFrame(screen: CanvasRenderingContext2D, video: HTMLVideoElement, t: number): Promise<void> {
  const rand = rng(Math.floor(t * 1000) + 7);
  const shot = shotAt(t);
  const local = t - shot.start;
  const look: VhsLook = { damage: 0.15, trackingY: null, flicker: 0.94 + rand() * 0.08 };

  wctx.fillStyle = "#000";
  wctx.fillRect(0, 0, W, H);

  if (shot.kind === "play") {
    // Blue VCR screen fading into picture noise.
    wctx.fillStyle = "#1b2fb0";
    wctx.fillRect(0, 0, W, H);
    look.damage = 0.5;
    look.trackingY = 0.2 + local * 1.1;
  } else if (shot.kind === "film") {
    await seek(video, filmTime(shot, t));
    const progress = local / (shot.end - shot.start);
    const z = 1 + ((shot.zoom ?? 1) - 1) * progress;
    const zw = W * z;
    const zh = H * z;
    wctx.drawImage(video, (W - zw) / 2, (H - zh) / 2 - (zh - H) * 0.15, zw, zh);
    look.trackingY = ((t * 0.35) % 1.4) - 0.2;
    if (shot.zoom) {
      // The stare: tape stretching, getting worse until it snaps.
      look.damage = 0.2 + progress * 0.8;
      look.flicker *= 1 - progress * 0.25;
    }
    const flash = FLASHES.find((f) => t >= f.start && t < f.end);
    if (flash) {
      look.damage = 1;
      look.trackingY = rand();
    }
  } else if (shot.kind === "static") {
    snow(screen, rand);
    return;
  } else if (shot.kind === "face") {
    drawFace(wctx, await faceImage(), local, rand);
    look.damage = 0.85;
  } else {
    // Outro: black, with a last flicker of text.
    look.damage = 0.3;
  }

  screen.fillStyle = "#000";
  screen.fillRect(0, 0, W, H);
  wobble(screen, work, t, look, rand);
  grade(screen, look, rand);

  const flash = FLASHES.find((f) => t >= f.start && t < f.end);
  if (flash?.text) glitchText(screen, flash.text, H / 2 + 24, 68, rand);
  if (t >= STARE_TEXT.start && t < STARE_TEXT.end) {
    const chars = Math.ceil(((t - STARE_TEXT.start) / 0.6) * STARE_TEXT.text.length);
    glitchText(screen, STARE_TEXT.text.slice(0, chars), H - 170, 56, rand);
  }
  if (shot.kind === "outro") {
    const on = local > 0.15 && rand() > 0.15;
    if (on) glitchText(screen, "ΟΠΟΙΟΣ ΓΕΛΑΕΙ", H / 2 - 20, 54, rand);
    if (on && local > 0.4) glitchText(screen, "ΤΕΛΕΥΤΑΙΟΣ…", H / 2 + 50, 54, rand);
  }
  if (shot.kind !== "face") overlay(screen, t, shot.kind === "play" || t < 2);
  if (t > DURATION - 0.25) {
    screen.fillStyle = "#000";
    screen.fillRect(0, 0, W, H);
  }
}
