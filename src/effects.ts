// Full-screen scares triggered by the admin (and ambient lightning).
import { playLaugh, playScream, playThunder } from "./audio/sfx";
import { speak } from "./audio/voice";
import type { HuntEvent } from "./sync";

const FACE_SVG = `
<svg viewBox="0 0 200 240" class="face" aria-hidden="true">
  <path d="M100 8C45 8 18 60 22 120c3 52 30 108 78 112 48-4 75-60 78-112C182 60 155 8 100 8z" fill="#d9d4c7"/>
  <path d="M30 90Q100 20 170 90L178 60Q100-10 22 60z" fill="#3b3b3b"/>
  <ellipse cx="68" cy="112" rx="24" ry="30" fill="#000"/>
  <ellipse cx="132" cy="112" rx="24" ry="30" fill="#000"/>
  <circle cx="70" cy="116" r="5" fill="#c00"/><circle cx="130" cy="116" r="5" fill="#c00"/>
  <path d="M100 135l-10 28h20z" fill="#8a8578"/>
  <ellipse cx="100" cy="196" rx="34" ry="26" fill="#000"/>
  <path d="M70 186l8 12 6-12 8 12 8-12 8 12 6-12 8 12" stroke="#d9d4c7" stroke-width="5" fill="none"/>
  <path d="M60 140q-4 40 6 70M140 140q4 40-6 70" stroke="#7a0000" stroke-width="4" fill="none"/>
</svg>`;

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
    case "laugh":
      void playLaugh();
      vibrate([100, 60, 100, 60, 100]);
      overlay(
        "fx-laugh",
        `<p class="fx-big">ΧΑ ΧΑ ΧΑ</p>${name ? `<p>ΣΕ ΒΛΕΠΩ, ${name}…</p>` : ""}`,
        3500,
      );
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
