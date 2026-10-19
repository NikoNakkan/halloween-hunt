// Light PIN gate for the admin page. Fine among friends; not real security.
import { ADMIN_PIN_HASH } from "../config";

const KEY = "hunt.admin";

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function checkPin(pin: string): Promise<boolean> {
  const ok = (await sha256(`hunt:${pin.trim()}`)) === ADMIN_PIN_HASH;
  if (ok) {
    try {
      localStorage.setItem(KEY, ADMIN_PIN_HASH);
    } catch {
      // Storage blocked: the PIN is simply asked again next time.
    }
  }
  return ok;
}

export function isUnlocked(): boolean {
  try {
    return localStorage.getItem(KEY) === ADMIN_PIN_HASH;
  } catch {
    return false;
  }
}
