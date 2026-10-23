// Sound effects: real CC0 recordings from public/sounds (see CREDITS.md),
// with synthesized fallbacks if a file is missing or the browser can't decode it.
import { audio, loadSample, noiseBuffer, playBuffer, type Clip } from "./engine";

type Synth = () => void;

async function play(name: string, synth: Synth, clips: Clip[] = [{}]): Promise<void> {
  const file = await loadSample(name);
  if (file) clips.forEach((clip) => playBuffer(file, clip));
  else synth();
}

function envelope(gain: GainNode, at: number, peak: number, attack: number, decay: number): void {
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

function thunderSynth(): void {
  const { ctx, out } = audio();
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(6);
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.setValueAtTime(1800, t); // sharp crack…
  low.frequency.exponentialRampToValueAtTime(120, t + 1.2); // …rolling into rumble
  const gain = ctx.createGain();
  envelope(gain, t, 1.2, 0.02, 5.5);
  src.connect(low).connect(gain).connect(out);
  src.start(t);
}

/** A human-ish vowel: buzzy source through "ah" formant filters. */
function voice(at: number, length: number, pitch: (t: number, osc: OscillatorNode) => void, peak: number): void {
  const { ctx, out } = audio();
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  pitch(at, osc);
  const gain = ctx.createGain();
  envelope(gain, at, peak, 0.02, length);
  for (const [freq, q] of [
    [800, 6],
    [1150, 8],
    [2900, 10],
  ]) {
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    osc.connect(f).connect(gain);
  }
  gain.connect(out);
  osc.start(at);
  osc.stop(at + length + 0.1);
}

function screamSynth(): void {
  const { ctx } = audio();
  const t = ctx.currentTime;
  voice(t, 1.8, (at, osc) => {
    osc.frequency.setValueAtTime(500, at);
    osc.frequency.exponentialRampToValueAtTime(1100, at + 0.25);
    osc.frequency.exponentialRampToValueAtTime(700, at + 1.8);
    const wobble = ctx.createOscillator();
    const depth = ctx.createGain();
    wobble.frequency.value = 9;
    depth.gain.value = 60;
    wobble.connect(depth).connect(osc.frequency);
    wobble.start(at);
    wobble.stop(at + 2);
  }, 3);
}

// thunder.ogg is 44 s of rain; the crack hits at ~21 s, so play just that part.
export const playThunder = (volume = 1) =>
  play("thunder", thunderSynth, [{ offset: 20.8, duration: 12, volume }]);
export const playScream = () => play("scream", screamSynth, [{ volume: 0.6 }]);

let thunderTimer: number | undefined;

/** Random distant thunder every 25–60 s while the hunt is open. */
export function startAmbientThunder(onStrike: () => void): void {
  if (thunderTimer !== undefined) return;
  const next = () => {
    thunderTimer = window.setTimeout(() => {
      void playThunder(0.6);
      onStrike();
      next();
    }, 25_000 + Math.random() * 35_000);
  };
  next();
}

/** Silence the random thunder (e.g. while the cursed tape plays). */
export function stopAmbientThunder(): void {
  window.clearTimeout(thunderTimer);
  thunderTimer = undefined;
}
