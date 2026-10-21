// Tape tool entry: exposes helpers on window so they can be driven from the console.
import { encode } from "./encode";
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
  /** Render a cut: a full-quality WebM master plus small web copies (MP4 + WebM). */
  async render(cutName: CutName = "long") {
    const cut = CUTS[cutName];
    const v = await video();
    log("mixing sound…");
    const sound = await mixSoundtrack(cut);
    const frames = Math.round(cut.duration * FPS);
    const outputs = [
      { name: `cursed-tape-${cutName}.webm`, spec: { format: "webm", videoBitrate: 6_000_000, audioBitrate: 160_000 } },
      { name: `cursed-tape-${cutName}-web.mp4`, spec: { format: "mp4", videoBitrate: 1_800_000, audioBitrate: 128_000 } },
      { name: `cursed-tape-${cutName}-web.webm`, spec: { format: "webm", videoBitrate: 1_800_000, audioBitrate: 112_000 } },
    ] as const;
    const files = await encode(
      frames,
      async (i) => {
        await drawFrame(screen, v, i / FPS, cut);
        return screenCanvas;
      },
      sound,
      outputs.map((o) => o.spec),
      log,
    );
    const report: string[] = [];
    for (const [i, bytes] of files.entries()) {
      await save(outputs[i].name, bytes);
      report.push(`${outputs[i].name} ${(bytes.byteLength / 1e6).toFixed(1)} MB`);
    }
    log(`saved: ${report.join(", ")}`);
    return report.join(", ");
  },
};

Object.assign(window, { tape: tools });
log("Ready.");
