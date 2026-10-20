// Tape tool entry: exposes helpers on window so they can be driven from the console.
import { encodeWebm } from "./encode";
import { contactSheet, loadFootage, save } from "./footage";
import { drawFrame } from "./picture";
import { blackShirt } from "./recolor";
import { mixSoundtrack } from "./soundtrack";
import { CUTS, FPS, type CutName } from "./timeline";

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
  /** Save the black-shirt version of the masked-man photo for review. */
  async shirt() {
    const canvas = await blackShirt();
    const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b as Blob), "image/png"));
    return save("masked-black.png", blob);
  },
  async sheet(from: number, to: number, step: number, name: string) {
    log(`sheet ${from}-${to}…`);
    return save(name, await contactSheet(await video(), from, to, step));
  },
  /** Save single frames as JPEGs for review, e.g. tape.stills([1, 3.1, 7.2]). */
  async stills(times: number[], cut: CutName = "long") {
    const v = await video();
    for (const t of times) {
      await drawFrame(screen, v, t, CUTS[cut]);
      await save(`still-${t.toFixed(2)}.jpg`, await canvasBlob("image/jpeg"));
    }
    return `saved ${times.length} stills`;
  },
  async render(cutName: CutName = "long", name = `cursed-tape-${cutName}.webm`) {
    const cut = CUTS[cutName];
    const v = await video();
    log("mixing sound…");
    const sound = await mixSoundtrack(cut);
    const frames = Math.round(cut.duration * FPS);
    const bytes = await encodeWebm(
      frames,
      async (i) => {
        await drawFrame(screen, v, i / FPS, cut);
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
