// Getting in: the password is shared state, so when anyone types it every phone opens.
// Sound still needs one tap per phone (browser rule), so phones opened remotely
// show a "tap for sound" button; any tap anywhere turns it on.
import { unlock } from "../../audio/engine";
import { startMusic } from "../../audio/music";
import { playThunder, startAmbientThunder } from "../../audio/sfx";
import { unlockVoice } from "../../audio/voice";
import { lightning } from "../../effects";
import { startSpooky } from "../../spooky";
import { primeTape } from "../cinema";
import type { QuizStore } from "../store";
import { isPassword } from "./gate";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel) as T;

let soundOn = false;
let unlocked = false;
let notify: (ready: boolean) => void = () => undefined;

/** The game may only run on this phone once the quiz is open AND its sound is on. */
function update(): void {
  $("#gate").hidden = unlocked;
  $("#stage").hidden = !unlocked;
  $("#sound-on").hidden = !unlocked || soundOn;
  notify(unlocked && soundOn);
}

/** Must run inside a tap: unlocks audio, speech and the finale video. */
function enableSound(): void {
  if (soundOn) return;
  soundOn = true;
  unlockVoice();
  primeTape();
  void unlock().then(() => startMusic());
  startAmbientThunder(lightning);
  update();
}

/**
 * `onReady(true)` once this phone may run the game: the quiz is open (shared) and
 * this phone has tapped for sound (sound is not optional). `false` when locked again.
 */
export function setupEntry(store: QuizStore, onReady: (ready: boolean) => void): void {
  notify = onReady;
  const gate = $<HTMLFormElement>("#gate");
  const input = $<HTMLInputElement>("#password");

  store.onUnlocked((open) => {
    unlocked = open;
    if (open) startSpooky();
    update();
  });

  gate.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isPassword(input.value)) {
      enableSound();
      void store.setUnlocked(true); // opens every phone, this one included
      return;
    }
    $("#gate-error").hidden = false;
    gate.animate([{ transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "none" }], {
      duration: 300,
      iterations: 2,
    });
    void unlock().then(() => playThunder(0.7));
  });

  // Opened by someone else: the cover's tap (or any tap) turns sound on.
  document.addEventListener(
    "pointerdown",
    () => {
      if (unlocked) enableSound();
    },
    { capture: true },
  );
}
