// Full-screen camera scanner. Resolves with the QR text, or null if cancelled/failed.
import jsQR from "jsqr";
import { TEXT } from "../content";
import "./scanner.css";

export function scanQr(): Promise<string | null> {
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "scanner";
    root.innerHTML = `
      <video playsinline muted></video>
      <div class="scanner-frame" aria-hidden="true"></div>
      <p class="scanner-hint">${TEXT.scanHint}</p>
      <button type="button" class="scanner-close">${TEXT.scanCancel}</button>`;
    document.body.append(root);

    const video = root.querySelector("video") as HTMLVideoElement;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let stream: MediaStream | null = null;
    let frame = 0;

    const finish = (result: string | null) => {
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
      root.remove();
      resolve(result);
    };
    root.querySelector(".scanner-close")?.addEventListener("click", () => finish(null));

    const tick = () => {
      if (ctx && video.readyState >= video.HAVE_ENOUGH_DATA) {
        // Decode a downscaled frame: plenty for a printed QR and much faster on phones.
        const scale = Math.min(1, 640 / video.videoWidth);
        canvas.width = Math.floor(video.videoWidth * scale);
        canvas.height = Math.floor(video.videoHeight * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (hit?.data) {
          navigator.vibrate?.(80);
          finish(hit.data);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    const hint = root.querySelector(".scanner-hint") as HTMLElement;
    void startCamera(video)
      .then((s) => {
        stream = s;
        tick();
      })
      .catch(() => (hint.textContent = TEXT.scanNoCamera));
  });
}

/** Back camera into the video element. Needs HTTPS (or localhost) and permission. */
async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera API");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}
