// Turns the pink shirt in the masked-man photo black, keeping folds and shading.
export const MASKED_URL = "./footage/masked.webp";

function hsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return [(h * 60 + 360) % 360, max ? d / max : 0, max / 255];
}

/** 0–1: how "shirt pink" a pixel is (magenta/pink hues, saturated enough). */
export function pinkness(r: number, g: number, b: number): number {
  const [h, s, v] = hsv(r, g, b);
  if (v < 0.12) return 0;
  // Shirt is ~305–340°; skin in shadow sits near 0–25°, so stay well clear of red.
  const inHue = h >= 295 && h <= 345 ? 1 : h > 282 && h < 295 ? (h - 282) / 13 : h > 345 && h < 352 ? (352 - h) / 7 : 0;
  const sat = Math.min(1, Math.max(0, (s - 0.22) / 0.15));
  return inHue * sat;
}

/** Recolour pixels below `fromY` (the shirt area); returns a canvas of the edited photo. */
export async function blackShirt(fromY = 0.45): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = MASKED_URL;
  await img.decode();
  // The screenshot has an image-viewer zoom bar along the bottom: crop it off.
  const CROP_BOTTOM = 56;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight - CROP_BOTTOM;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = data.data;
  const top = Math.floor(canvas.height * fromY);
  const w = canvas.width;
  // Pass 1: how strongly each pixel is shirt.
  const mask = new Float32Array(w * canvas.height);
  for (let y = top; y < canvas.height; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      mask[y * w + x] = pinkness(d[i], d[i + 1], d[i + 2]);
    }
  }
  // Pass 2: edge pixels blend shirt with background; darken pinkish ones touching the shirt.
  const R = 2;
  for (let y = top + R; y < canvas.height - R; y++) {
    for (let x = R; x < w - R; x++) {
      const p = y * w + x;
      if (mask[p] >= 0.5) continue;
      const i = p * 4;
      if (d[i] <= d[i + 1] + 12) continue; // only reddish/pinkish fringe, not grey or skin-neutral
      let near = 0;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) near = Math.max(near, mask[p + dy * w + dx]);
      const [h] = hsv(d[i], d[i + 1], d[i + 2]);
      if (near > 0.8 && (h >= 280 || h <= 3)) mask[p] = Math.max(mask[p], 0.85);
    }
  }
  for (let p = top * w; p < mask.length; p++) {
    const k = mask[p];
    if (!k) continue;
    const i = p * 4;
    // Keep the fabric's light/shadow, but in near-black.
    const v = Math.max(d[i], d[i + 1], d[i + 2]) / 255;
    const dark = 14 + v * 52;
    d[i] = d[i] * (1 - k) + dark * k;
    d[i + 1] = d[i + 1] * (1 - k) + dark * k;
    d[i + 2] = d[i + 2] * (1 - k) + (dark + 3) * k;
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}
