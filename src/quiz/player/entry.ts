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

/** Must run inside a tap: unlocks audio, speech and the finale video. */
function enableSound(): void {
  if (soundOn) return;
  soundOn = true;
  unlockVoice();
  primeTape();
  void unlock().then(() => startMusic());
  startAmbientThunder(lightning);
  $("#sound-on").hidden = true;
}

/** `onOpen` hears every change of the shared open/locked state. */
export function setupEntry(store: QuizStore, onOpen: (open: boolean) => void): void {
  const gate = $<HTMLFormElement>("#gate");
  const input = $<HTMLInputElement>("#password");

  store.onUnlocked((open) => {
    gate.hidden = open;
    $("#stage").hidden = !open;
    $("#sound-on").hidden = !open || soundOn;
    if (open) startSpooky();
    onOpen(open);
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

  // Opened by someone else: the first tap anywhere on the quiz turns sound on.
  document.addEventListener(
    "pointerdown",
    () => {
      if (!$("#stage").hidden) enableSound();
    },
    { capture: true },
  );
}
