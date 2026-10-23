// The cursed tape, played full-screen on every phone at the end of the quiz.
import { duckMusic } from "../audio/music";
import { stopAmbientThunder } from "../audio/sfx";

/** MP4 first (H.264 plays everywhere, incl. iPhone), WebM as a fallback. */
const SOURCES: [file: string, type: string][] = [
  ["video/cursed-tape.mp4", "video/mp4"],
  ["video/cursed-tape.webm", "video/webm"],
];

let video: HTMLVideoElement | null = null;

function appRoot(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="app-root"]')?.content ?? "./";
}

function tape(): HTMLVideoElement {
  if (video) return video;
  video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";
  video.className = "tape-video";
  for (const [file, type] of SOURCES) {
    const source = document.createElement("source");
    source.src = `${appRoot()}${file}`;
    source.type = type;
    video.append(source);
  }
  return video;
}

/** True while the enter-tap "start then pause" is still in flight. */
let priming = false;

/**
 * Call inside the enter tap: phones only let a video play with sound later if it
 * was started by a tap once. Start it and pause straight away (a click at most).
 */
export function primeTape(): void {
  const v = tape();
  priming = true;
  v.load(); // phones often skip preloading; ask for the file now
  void v
    .play()
    // On a slow phone this can resolve much later, even after the finale has
    // started; only pause if we're still just priming.
    .then(() => priming && v.pause())
    .catch(() => undefined)
    .finally(() => (priming = false));
}

let stopCurrent: (() => void) | null = null;

/** Cut the tape off immediately (e.g. the admin started a new game). */
export function stopTape(): void {
  stopCurrent?.();
}

/** Play the tape full-screen; resolves when it ends, is stopped, or can't play. */
export function playTape(): Promise<void> {
  priming = false; // from now on nobody may pause the tape but us
  const v = tape();
  const screen = document.createElement("div");
  screen.className = "tape-screen";
  screen.append(v);
  document.body.append(screen);
  duckMusic(true);
  stopAmbientThunder();

  return new Promise((resolve) => {
    let done = false;
    let watchdog = 0;
    const finish = () => {
      if (done) return;
      done = true;
      stopCurrent = null;
      window.clearInterval(watchdog);
      v.pause();
      screen.remove();
      resolve();
    };
    // A tap always (re)starts it, whatever the phone decided.
    const offerTap = () => {
      if (done || screen.querySelector(".tape-tap")) return;
      const tap = document.createElement("button");
      tap.type = "button";
      tap.className = "tape-tap";
      tap.textContent = "▶ Πάτα";
      tap.onclick = () => {
        tap.remove();
        void v.play().catch(offerTap);
      };
      screen.append(tap);
    };
    stopCurrent = finish;
    v.onended = finish;
    v.onerror = finish;
    // Never leave a phone stuck: if the picture hasn't moved for 4 s, offer the tap;
    // and give up entirely after 75 s (slow download + 30 s tape).
    let last = -1;
    let still = 0;
    watchdog = window.setInterval(() => {
      if (v.currentTime !== last || v.ended) {
        last = v.currentTime;
        still = 0;
        return;
      }
      still += 1;
      if (still >= 4) offerTap();
    }, 1000);
    window.setTimeout(finish, 75_000);

    v.currentTime = 0;
    v.play().catch(offerTap);
  });
}
