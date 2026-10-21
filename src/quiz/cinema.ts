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

/**
 * Call inside the enter tap: phones only let a video play with sound later if it
 * was started by a tap once. Start it and pause straight away (a click at most).
 */
export function primeTape(): void {
  const v = tape();
  void v
    .play()
    .then(() => v.pause())
    .catch(() => undefined);
}

/** Play the tape full-screen; resolves when it ends (or can't play). */
export function playTape(): Promise<void> {
  const v = tape();
  const screen = document.createElement("div");
  screen.className = "tape-screen";
  screen.append(v);
  document.body.append(screen);
  duckMusic(true);
  stopAmbientThunder();

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      v.pause();
      screen.remove();
      resolve();
    };
    v.onended = finish;
    v.onerror = finish;
    // Safety net: never leave a phone stuck on a black screen.
    window.setTimeout(finish, 45_000);

    v.currentTime = 0;
    v.play().catch(() => {
      // Blocked anyway (e.g. low-power mode): one tap starts it.
      const tap = document.createElement("button");
      tap.type = "button";
      tap.className = "tape-tap";
      tap.textContent = "▶ Πάτα";
      tap.onclick = () => {
        tap.remove();
        void v.play().catch(finish);
      };
      screen.append(tap);
    });
  });
}
