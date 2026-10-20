// Soundboard + grandma's voice settings, shared by every admin page.
import { unlock } from "../audio/engine";
import { runEffect } from "../effects";
import type { EffectKind } from "../sync";
import type { EventChannel } from "../sync/events";
import { clipFor, wireVoicePanel } from "./voice-panel";

const MARKUP = `
  <section>
    <h2>Soundboard</h2>
    <div class="board">
      <button class="fx-btn scream" data-kind="scream">😱<span>Κραυγή</span></button>
      <button class="fx-btn thunder" data-kind="thunder">⚡<span>Κεραυνός</span></button>
      <button class="fx-btn laugh" data-kind="laugh">🧙‍♀️<span>Γέλιο</span></button>
    </div>
    <form id="msg-form" class="row">
      <input id="msg-input" placeholder="Μήνυμα σε όλους…" maxlength="120" />
      <button type="submit" name="kind" value="message" title="Εμφάνιση στην οθόνη">Στείλε</button>
      <button type="submit" name="kind" value="speak" title="Η γιαγιά το λέει φωναχτά">🗣️ Μίλα</button>
    </form>
    <label class="note"><input id="preview" type="checkbox" /> Παίξε και σε αυτό το κινητό</label>
    <p id="sent" class="note" aria-live="polite"></p>
  </section>
  <section>
    <details>
      <summary><h2>🧙‍♀️ Φωνή γιαγιάς (ElevenLabs)</h2></summary>
      <form id="voice-form" class="voice-form">
        <input id="voice-key" type="password" autocomplete="off" placeholder="API key" />
        <input id="voice-id" autocomplete="off" placeholder="Voice ID" />
        <select id="voice-model"></select>
        <button type="submit">Αποθήκευση &amp; δοκιμή</button>
      </form>
      <p class="note">Το κλειδί μένει μόνο σε αυτό το κινητό.</p>
    </details>
    <p id="voice-status" class="note" aria-live="polite"></p>
  </section>`;

export interface SoundboardOptions {
  send: EventChannel["sendEvent"];
  /** Optional player name to put in the scare. */
  name?: () => string | null;
}

/** Render the soundboard into `root` (replacing it) and wire every button. */
export function mountSoundboard(root: HTMLElement, { send, name = () => null }: SoundboardOptions): void {
  root.outerHTML = MARKUP;
  const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel) as T;
  wireVoicePanel();

  const fire = async (kind: EffectKind, text?: string) => {
    const who = name();
    const audio = kind === "speak" && text ? await clipFor(text) : undefined;
    const event = { kind, name: who ?? undefined, text, audio };
    if ($<HTMLInputElement>("#preview").checked) {
      await unlock();
      runEffect(event);
    }
    await send(event);
    $("#sent").textContent = `Στάλθηκε: ${kind}${who ? ` → ${who}` : ""} (${new Date().toLocaleTimeString("el-GR")})`;
  };

  document.querySelectorAll<HTMLButtonElement>(".fx-btn").forEach((btn) => {
    btn.addEventListener("click", () => void fire(btn.dataset.kind as EffectKind));
  });
  $("#msg-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>("#msg-input");
    if (!input.value.trim()) return;
    // "Στείλε" shows the text; "Μίλα" also has grandma say it out loud.
    const button = (e as SubmitEvent).submitter as HTMLButtonElement | null;
    void fire(button?.value === "speak" ? "speak" : "message", input.value.trim());
    input.value = "";
  });
}
