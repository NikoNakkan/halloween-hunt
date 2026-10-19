// Original creepy background loop: a music-box piano ostinato in 5/4 over a low drone.
// (Inspired by the feel of classic horror themes, not a copy of any melody.)
import { audio, loadSample } from "./engine";

const BEAT = 0.34; // seconds per note
// MIDI notes, 5 per bar, 4 bars; the flat second (Eb over D) gives the dread.
const PATTERN = [
  [74, 69, 75, 69, 74],
  [74, 69, 75, 69, 72],
  [73, 68, 74, 68, 73],
  [72, 67, 73, 67, 70],
];
const BASS = [50, 50, 49, 48];

let timer: number | undefined;

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function pianoNote(midi: number, at: number, volume: number, length = 1.6): void {
  const { ctx, out } = audio();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  gain.connect(out);
  // Fundamental plus a slightly detuned octave: a cold, music-box timbre.
  for (const [mult, type, detune] of [
    [1, "triangle", 0],
    [2, "sine", 6],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = hz(midi) * mult;
    osc.detune.value = detune;
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + length);
  }
}

function scheduleBars(start: number): number {
  let t = start;
  PATTERN.forEach((bar, i) => {
    pianoNote(BASS[i], t, 0.12, BEAT * 5);
    bar.forEach((note) => {
      pianoNote(note, t, 0.07);
      t += BEAT;
    });
  });
  return t;
}

export async function startMusic(): Promise<void> {
  if (timer !== undefined) return;
  const file = await loadSample("music");
  if (file) {
    loopFile(file);
    return;
  }
  const { ctx } = audio();
  let next = ctx.currentTime + 0.1;
  const tick = () => {
    // Keep ~one loop scheduled ahead; Web Audio timing stays exact even if timers lag.
    if (next - ctx.currentTime < BEAT * 20) next = scheduleBars(next);
  };
  tick();
  timer = window.setInterval(tick, 1000);
}

function loopFile(buffer: AudioBuffer): void {
  const { ctx, out } = audio();
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = 0.35;
  src.buffer = buffer;
  src.loop = true;
  src.connect(gain).connect(out);
  src.start();
  timer = -1;
}
