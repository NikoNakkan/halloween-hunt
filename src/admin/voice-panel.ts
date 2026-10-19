// Settings form for grandma's ElevenLabs voice on the admin page.
import { generateClip, loadSettings, MODELS, saveSettings } from "./eleven";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel) as T;

function showStatus(text: string): void {
  $("#voice-status").textContent = text;
}

export function wireVoicePanel(): void {
  const key = $<HTMLInputElement>("#voice-key");
  const voice = $<HTMLInputElement>("#voice-id");
  const model = $<HTMLSelectElement>("#voice-model");
  model.innerHTML = MODELS.map((m) => `<option value="${m.id}">${m.label}</option>`).join("");

  const saved = loadSettings();
  if (saved) {
    key.value = saved.apiKey;
    voice.value = saved.voiceId;
    model.value = saved.model;
  }
  showStatus(saved ? "✅ Η φωνή είναι έτοιμη." : "Χωρίς ρυθμίσεις: τα κινητά θα μιλάνε με την ενσωματωμένη φωνή.");

  $("#voice-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const settings = { apiKey: key.value.trim(), voiceId: voice.value.trim(), model: model.value };
    showStatus("Δοκιμή…");
    try {
      await generateClip("Γεια.", settings); // tiny test so mistakes show up now, not at the party
      saveSettings(settings);
      showStatus("✅ Αποθηκεύτηκε και δουλεύει.");
    } catch (err) {
      showStatus(`❌ ${(err as Error).message}`);
    }
  });
}

/** Clip for a speak event, or undefined (with a visible reason) to fall back to built-in speech. */
export async function clipFor(text: string): Promise<string | undefined> {
  const settings = loadSettings();
  if (!settings) return undefined;
  showStatus("🧙‍♀️ Η γιαγιά ετοιμάζεται να μιλήσει…");
  try {
    const clip = await generateClip(text, settings);
    showStatus("✅ Η φωνή είναι έτοιμη.");
    return clip;
  } catch (err) {
    showStatus(`❌ ${(err as Error).message}. Στάλθηκε με την ενσωματωμένη φωνή.`);
    return undefined;
  }
}
