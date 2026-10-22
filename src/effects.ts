// Full-screen scares triggered by the admin (and ambient lightning).
import { playScream, playThunder } from "./audio/sfx";
import { playWail } from "./audio/wail";
import { speak } from "./audio/voice";
import { FACE_SVG } from "./face";
import type { HuntEvent } from "./sync";



function overlay(className: string, html: string, ms: number): void {
  const el = document.createElement("div");
  el.className = `fx ${className}`;
  el.innerHTML = html;
  document.body.append(el);
  window.setTimeout(() => el.remove(), ms);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** Greek capitals drop accents: "Νίκος" → "ΝΙΚΟΣ". */
export function greekCaps(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

function vibrate(pattern: number[]): void {
  navigator.vibrate?.(pattern);
}

export function lightning(): void {
  overlay("fx-lightning", "", 1200);
}

export function runEffect(event: Pick<HuntEvent, "kind" | "name" | "text" | "audio">): void {
  const name = event.name ? escapeHtml(greekCaps(event.name)) : "";
  switch (event.kind) {
    case "scream":
      void playScream();
      vibrate([400, 100, 400]);
      overlay("fx-scream", `${FACE_SVG}${name ? `<p class="fx-name">${name}…</p>` : ""}`, 2600);
      break;
    case "thunder":
      void playThunder();
      vibrate([150, 80, 300]);
      lightning();
      if (name) overlay("fx-whisper", `<p>${name}…</p>`, 3500);
      break;
    case "wail":
      // A hollow wail and the room goes dark for a moment.
      void playWail(0.9);
      vibrate([500]);
      overlay("fx-wail", name ? `<p>${name}…</p>` : "", 5000);
      break;
    case "message":
      void playThunder();
      lightning();
      overlay(
        "fx-message",
        `<p class="fx-big">${escapeHtml(event.text ?? "")}</p>${name ? `<p>— ${name}</p>` : ""}`,
        6000,
      );
      break;
    case "speak": {
      // Words appear while grandma says them; the overlay stays until she's done.
      const el = document.createElement("div");
      el.className = "fx fx-speak";
      el.innerHTML = `<p class="fx-big">«${escapeHtml(event.text ?? "")}»</p>${name ? `<p>${name}…</p>` : ""}`;
      document.body.append(el);
      vibrate([60, 120, 60]);
      // Keep the words up long enough to read, even if the phone can't speak.
      const readMs = 3000 + (event.text ?? "").length * 80;
      const minimum = new Promise((r) => window.setTimeout(r, readMs));
      void Promise.all([speak(event.text ?? "", event.audio), minimum]).then(() => {
        el.classList.add("fx-out");
        window.setTimeout(() => el.remove(), 1200);
      });
      break;
    }
  }
}
