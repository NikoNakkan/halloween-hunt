// Tape tool entry: exposes helpers on window so they can be driven from the console.
import { encodeWebm } from "./encode";
import { contactSheet, loadFootage, save } from "./footage";
import { drawFrame } from "./picture";
import { mixSoundtrack } from "./soundtrack";
import { DURATION, FPS } from "./timeline";

const screenCanvas = document.querySelector("#screen") as HTMLCanvasElement;
const screen = screenCanvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
const status = document.querySelector("#status") as HTMLElement;
const log = (text: string) => (status.textContent = text);

let footage: Promise<HTMLVideoElement> | null = null;
const video = () => (footage ??= loadFootage());

function canvasBlob(type: string): Promise<Blob> {
  return new Promise((resolve) => screenCanvas.toBlob((b) => resolve(b as Blob), type, 0.85));
}

const tools = {
  async sheet(from: number, to: number, step: number, name: string) {
    log(`sheet ${from}-${to}…`);
    return save(name, await contactSheet(await video(), from, to, step));
  },
  /** Save single frames as JPEGs for review, e.g. tape.stills([1, 3.1, 7.2]). */
  async stills(times: number[]) {
    const v = await video();
    for (const t of times) {
      await drawFrame(screen, v, t);
      await save(`still-${t.toFixed(2)}.jpg`, await canvasBlob("image/jpeg"));
    }
    return `saved ${times.length} stills`;
  },
  async render(name = "cursed-tape.webm") {
    const v = await video();
    log("mixing sound…");
    const sound = await mixSoundtrack();
    const frames = Math.round(DURATION * FPS);
    const bytes = await encodeWebm(
      frames,
      async (i) => {
        await drawFrame(screen, v, i / FPS);
        return screenCanvas;
      },
      sound,
      log,
    );
    log(`saving ${(bytes.byteLength / 1e6).toFixed(1)} MB…`);
    const result = await save(name, bytes);
    log(result);
    return `${result} (${(bytes.byteLength / 1e6).toFixed(1)} MB)`;
  },
};

Object.assign(window, { tape: tools });
log("Ready.");
