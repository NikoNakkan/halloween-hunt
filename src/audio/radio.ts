// 📻 A ghost radio: a few seconds of an old Greek record, as if from a broken set in an
// empty house: tuned in through static, slowed, distorted, drowned in a dark echo.
import { audio, loadSample, noiseBuffer } from "./engine";
import { duckMusic } from "./music";
import { darkHall } from "./wail";

export const RADIO_CLIPS = ["radio-1", "radio-2", "radio-3"] as const;
const CLIP_SECONDS = 25;
const PLAY_SECONDS = 7;

/** "radio-2@11.5": which record and where to start. Picked by the admin so every phone plays the same. */
export function randomRadioPick(rand = Math.random): string {
  const clip = RADIO_CLIPS[Math.floor(rand() * RADIO_CLIPS.length)];
  const from = Math.round(rand() * (CLIP_SECONDS - PLAY_SECONDS - 1) * 10) / 10;
  return `${clip}@${from}`;
}

export function parseRadioPick(pick: string | undefined): { clip: string; from: number } {
  const [clip, from] = (pick ?? "").split("@");
  const known = (RADIO_CLIPS as readonly string[]).includes(clip);
  return { clip: known ? clip : RADIO_CLIPS[0], from: Math.max(0, Number(from) || 0) };
}

/** Hard, ugly saturation: an overdriven valve set. */
function crushCurve(drive: number): Float32Array<ArrayBuffer> {
  const n = 2048;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    c[i] = Math.sign(x) * (1 - Math.exp(-drive * Math.abs(x)));
  }
  return c;
}

let hall: AudioBuffer | null = null;

export async function playRadio(pick?: string, volume = 0.9): Promise<void> {
  const { ctx, out } = audio();
  const { clip, from } = parseRadioPick(pick);
  const record = await loadSample(clip);
  if (!record) return;
  const t = ctx.currentTime + 0.05;
  const end = t + PLAY_SECONDS;

  const src = ctx.createBufferSource();
  src.buffer = record;
  // Slowed and dragging, like a dying motor; wavers as it plays.
  src.playbackRate.setValueAtTime(0.86, t);
  for (let s = 0; s < PLAY_SECONDS; s += 0.25) {
    src.playbackRate.linearRampToValueAtTime(0.86 + 0.03 * Math.sin(s * 2.1) - s * 0.012, t + s);
  }

  const speaker = ctx.createBiquadFilter(); // tiny radio speaker
  speaker.type = "bandpass";
  speaker.frequency.value = 1100;
  speaker.Q.value = 0.9;
  const drive = ctx.createWaveShaper();
  drive.curve = crushCurve(9);
  drive.oversample = "2x";
  const tame = ctx.createBiquadFilter(); // take the fizz off the distortion
  tame.type = "lowpass";
  tame.frequency.value = 3200;

  hall ??= darkHall(ctx, 6);
  const echo = ctx.createConvolver();
  echo.buffer = hall;
  const wet = ctx.createGain();
  wet.gain.value = 1.1; // more room than radio
  const dry = ctx.createGain();
  dry.gain.value = 0.45;

  // Fades in through static as if someone turned the dial, then dies away.
  const level = ctx.createGain();
  level.gain.setValueAtTime(0.0001, t);
  level.gain.exponentialRampToValueAtTime(volume * 0.5, t + 0.9);
  level.gain.setValueAtTime(volume * 0.5, end - 1.5);
  level.gain.exponentialRampToValueAtTime(0.0001, end);

  src.connect(speaker).connect(drive).connect(tame);
  tame.connect(dry).connect(level);
  tame.connect(echo).connect(wet).connect(level);
  level.connect(out);

  // Static and a tuning whistle around it.
  const hiss = ctx.createBufferSource();
  hiss.buffer = noiseBuffer(PLAY_SECONDS + 1);
  const hissBand = ctx.createBiquadFilter();
  hissBand.type = "bandpass";
  hissBand.frequency.value = 2500;
  hissBand.Q.value = 0.7;
  const hissGain = ctx.createGain();
  hissGain.gain.setValueAtTime(0.35 * volume, t);
  hissGain.gain.exponentialRampToValueAtTime(0.06 * volume, t + 1.2);
  hissGain.gain.setValueAtTime(0.06 * volume, end - 1.2);
  hissGain.gain.linearRampToValueAtTime(0.3 * volume, end - 0.3);
  hissGain.gain.linearRampToValueAtTime(0, end);
  hiss.connect(hissBand).connect(hissGain).connect(out);
  const whistle = ctx.createOscillator();
  whistle.frequency.setValueAtTime(2600, t);
  whistle.frequency.exponentialRampToValueAtTime(380, t + 0.8);
  const wg = ctx.createGain();
  wg.gain.setValueAtTime(0.05 * volume, t);
  wg.gain.linearRampToValueAtTime(0, t + 0.85);
  whistle.connect(wg).connect(out);

  duckMusic(true);
  src.start(t, from);
  src.stop(end + 0.1);
  hiss.start(t);
  hiss.stop(end + 0.1);
  whistle.start(t);
  whistle.stop(t + 0.9);
  // Let the echo ring out, then bring the music back.
  window.setTimeout(() => duckMusic(false), (PLAY_SECONDS + 3) * 1000);
}
