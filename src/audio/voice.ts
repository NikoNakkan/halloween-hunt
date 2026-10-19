// Grandma's voice: an ElevenLabs clip (sent by the admin) played through the haunted
// effect chain, or the phone's built-in text-to-speech as a fallback.
import { base64ToBytes } from "./base64";
import { audio, isMuted } from "./engine";
import { playHaunted } from "./haunt";
import { duckMusic } from "./music";

const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;

function greekVoice(): SpeechSynthesisVoice | undefined {
  const voices = synth?.getVoices() ?? [];
  // Prefer a female Greek voice (iOS "Melina", Google "el-GR"), else any Greek one.
  const greek = voices.filter((v) => v.lang.toLowerCase().startsWith("el"));
  return greek.find((v) => /melina|female|γυναίκ/i.test(v.name)) ?? greek[0];
}

/** iOS only allows speech after a tap: call this inside the enter-button handler. */
export function unlockVoice(): void {
  if (!synth) return;
  const silent = new SpeechSynthesisUtterance(" ");
  silent.volume = 0;
  synth.speak(silent);
}

/** Say the line: the recorded clip if there is one, else built-in speech. */
export async function speak(text: string, clip?: string): Promise<void> {
  if (clip && !isMuted()) {
    try {
      const buffer = await audio().ctx.decodeAudioData(base64ToBytes(clip));
      duckMusic(true);
      await playHaunted(buffer);
      duckMusic(false);
      return;
    } catch {
      duckMusic(false); // undecodable clip: fall through to built-in speech
    }
  }
  return speakBuiltIn(text);
}

/** Phone text-to-speech; resolves when finished (or right away if unavailable). */
function speakBuiltIn(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!synth || isMuted() || !text.trim()) return resolve();
    synth.cancel();
    const line = new SpeechSynthesisUtterance(text);
    line.lang = "el-GR";
    const voice = greekVoice();
    if (voice) line.voice = voice;
    line.pitch = 0.1; // as low as browsers go
    line.rate = 0.7; // slow and deliberate
    line.volume = 1;
    const done = () => {
      duckMusic(false);
      resolve();
    };
    line.onend = done;
    line.onerror = done;
    duckMusic(true);
    synth.speak(line);
  });
}
