// ElevenLabs voice for grandma. The API key lives only in this admin device's
// localStorage and goes only to api.elevenlabs.io, never into the repo or Firebase.
import { bytesToBase64 } from "../audio/base64";

const KEY = "hunt.eleven";
const API = "https://api.elevenlabs.io/v1/text-to-speech";

export interface ElevenSettings {
  apiKey: string;
  voiceId: string;
  model: string;
}

export const MODELS = [
  { id: "eleven_v3", label: "v3 (πιο εκφραστικό)" },
  { id: "eleven_multilingual_v2", label: "Multilingual v2 (σταθερό)" },
  { id: "eleven_flash_v2_5", label: "Flash v2.5 (γρήγορο)" },
] as const;

export function loadSettings(): ElevenSettings | null {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as ElevenSettings) : null;
    return s?.apiKey && s.voiceId ? s : null;
  } catch {
    return null;
  }
}

export function saveSettings(s: ElevenSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage blocked: settings last only for this page visit.
  }
}

/** Generate grandma saying `text`; returns a small base64 MP3 (32 kbps). */
export async function generateClip(text: string, s: ElevenSettings): Promise<string> {
  const res = await fetch(`${API}/${encodeURIComponent(s.voiceId)}?output_format=mp3_22050_32`, {
    method: "POST",
    headers: { "xi-api-key": s.apiKey, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: s.model,
      language_code: "el",
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 160)}`);
  }
  return bytesToBase64(await res.arrayBuffer());
}
