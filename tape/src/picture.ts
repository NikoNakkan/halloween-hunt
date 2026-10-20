// Draws frame t of the cursed tape onto the screen canvas.
import { FACE_SVG } from "../../src/face";
import { seek } from "./footage";
import { blackShirt } from "./recolor";
import { filmTime, shotAt, subliminalAt, type Cut } from "./timeline";
import { H, W, glitchText, grade, overlay, rng, snow, wobble, type VhsLook } from "./vhs";

const work = document.createElement("canvas");
work.width = W;
work.height = H;
const wctx = work.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;

let face: HTMLImageElement | null = null;
let masked: Promise<HTMLCanvasElement> | null = null;
const maskedMan = () => (masked ??= blackShirt());

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

/** Cover-fit the masked man, face a little above centre, jittering in size. */
function drawMaskedMan(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, rand: () => number): void {
  const scale = Math.max(W / img.width, H / img.height) * (1.05 + rand() * 0.12);
  const w = img.width * scale;
  const h = img.height * scale;
  const faceY = img.height * 0.46 * scale; // the mask sits ~46% down the photo
  ctx.drawImage(img, (W - w) / 2 + (rand() - 0.5) * 30, H * 0.42 - faceY, w, h);
}

/** Tint a finished frame: photographic negative or a blood-red wash. */
function tint(ctx: CanvasRenderingContext2D, style: "plain" | "negative" | "red"): void {
  if (style === "plain") return;
  ctx.save();
  ctx.globalCompositeOperation = style === "negative" ? "difference" : "multiply";
  ctx.fillStyle = style === "negative" ? "#fff" : "#ff2020";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Render frame `t` of `cut` onto `screen`. */
export async function drawFrame(
  screen: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  t: number,
  cut: Cut,
): Promise<void> {
  const rand = rng(Math.floor(t * 1000) + 7);
  const shot = shotAt(cut, t);
  const local = t - shot.start;
  const look: VhsLook = { damage: 0.15, trackingY: null, flicker: 0.94 + rand() * 0.08 };
  const flash = cut.flashes.find((f) => t >= f.start && t < f.end);
  const ghost = subliminalAt(cut, t);

  wctx.fillStyle = "#000";
  wctx.fillRect(0, 0, W, H);

  if (ghost) {
    // A few frames of the masked man, whatever shot we're in.
    drawMaskedMan(wctx, await maskedMan(), rand);
    look.damage = 0.75;
    look.trackingY = rand();
  } else if (shot.kind === "play") {
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
  if (ghost) {
    tint(screen, ghost.style);
    return; // no text or VCR overlay: it should feel like it wasn't there
  }

  if (flash?.text) glitchText(screen, flash.text, H / 2 + 24, 68, rand);
  if (t >= cut.stare.start && t < cut.stare.end) {
    const chars = Math.ceil(((t - cut.stare.start) / 0.6) * cut.stare.text.length);
    glitchText(screen, cut.stare.text.slice(0, chars), H - 170, 56, rand);
  }
  if (shot.kind === "outro") {
    const on = local > 0.15 && rand() > 0.15;
    if (on) glitchText(screen, "ΟΠΟΙΟΣ ΓΕΛΑΕΙ", H / 2 - 20, 54, rand);
    if (on && local > 0.4) glitchText(screen, "ΤΕΛΕΥΤΑΙΟΣ…", H / 2 + 50, 54, rand);
  }
  if (shot.kind !== "face") overlay(screen, t, shot.kind === "play" || t < 2);
  if (t > cut.duration - 0.25) {
    screen.fillStyle = "#000";
    screen.fillRect(0, 0, W, H);
  }
}
