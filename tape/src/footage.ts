// The source film: a <video> we seek frame by frame (works even in a background tab).
export const FOOTAGE_URL = "./footage/skeleton-dance-16mm-480p.webm";

export async function loadFootage(): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.src = FOOTAGE_URL;
  video.muted = true;
  video.preload = "auto";
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("footage failed to load"));
  });
  return video;
}

export function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.001) return resolve();
    video.addEventListener("seeked", () => resolve(), { once: true });
    video.currentTime = time;
  });
}

/** Save any bytes into tape/out/ through the dev server. */
export async function save(name: string, data: Blob | ArrayBuffer): Promise<string> {
  const res = await fetch(`/__save?name=${encodeURIComponent(name)}`, { method: "POST", body: data });
  return res.text();
}

/** Grid of frames every `step` seconds, for picking moments to use. */
export async function contactSheet(video: HTMLVideoElement, from: number, to: number, step: number): Promise<Blob> {
  const times: number[] = [];
  for (let t = from; t <= to; t += step) times.push(t);
  const cols = 6;
  const w = 240;
  const h = 180;
  const canvas = document.createElement("canvas");
  canvas.width = cols * w;
  canvas.height = Math.ceil(times.length / cols) * h;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  for (const [i, t] of times.entries()) {
    await seek(video, t);
    const x = (i % cols) * w;
    const y = Math.floor(i / cols) * h;
    ctx.drawImage(video, x, y, w, h);
    ctx.fillStyle = "#ff0";
    ctx.font = "bold 20px monospace";
    ctx.fillText(`${t.toFixed(1)}s`, x + 6, y + 22);
  }
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.8));
}
