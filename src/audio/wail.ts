// A hollow, sinister wail: the scream recording slowed right down, sent through a
// resonant "tube" (comb filter) so it sounds like it comes from inside the walls,
// darkened and drowned in a long cold echo, over a low swell.
import { audio, loadSample, noiseBuffer } from "./engine";

/** Long dark reverb tail: decaying noise, smoothed so the top end dies first. */
export function darkHall(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      smooth = smooth * 0.82 + (Math.random() * 2 - 1) * 0.18; // gentle low-pass
      d[i] = smooth * (1 - i / length) ** 2.5;
    }
  }
  return buf;
}

let hall: AudioBuffer | null = null;

export async function playWail(volume = 0.8): Promise<void> {
  const { ctx, out } = audio();
  const t = ctx.currentTime + 0.02;
  const scream = await loadSample("scream");

  const src = ctx.createBufferSource();
  if (scream) {
    src.buffer = scream;
    src.playbackRate.setValueAtTime(0.5, t); // an octave down: no longer human
    src.playbackRate.linearRampToValueAtTime(0.42, t + scream.duration * 2); // sags as it dies
  } else {
    src.buffer = noiseBuffer(3); // no recording: a breathy howl instead
  }

  // Hollow tube: a short delay fed back into itself rings like a pipe.
  const tube = ctx.createDelay(0.05);
  tube.delayTime.value = 0.0115;
  const ring = ctx.createGain();
  ring.gain.value = 0.72;
  tube.connect(ring).connect(tube);

  const dark = ctx.createBiquadFilter();
  dark.type = "lowpass";
  dark.frequency.value = 1500;
  dark.Q.value = 2;

  const echo = ctx.createConvolver();
  hall ??= darkHall(ctx, 5);
  echo.buffer = hall;
  const wet = ctx.createGain();
  wet.gain.value = 0.9;
  const dry = ctx.createGain();
  dry.gain.value = 0.35;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t);
  master.gain.exponentialRampToValueAtTime(volume, t + 0.25); // swells in rather than bursts
  master.gain.setTargetAtTime(0.0001, t + 3.5, 1.2);

  src.connect(tube);
  src.connect(dark);
  tube.connect(dark);
  dark.connect(dry).connect(master);
  dark.connect(echo).connect(wet).connect(master);
  master.connect(out);

  // Low swell underneath: felt in the chest.
  const sub = ctx.createOscillator();
  sub.frequency.setValueAtTime(48, t);
  sub.frequency.linearRampToValueAtTime(36, t + 4);
  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.0001, t);
  subGain.gain.exponentialRampToValueAtTime(0.35 * volume, t + 1.2);
  subGain.gain.exponentialRampToValueAtTime(0.0001, t + 5);
  sub.connect(subGain).connect(out);

  src.start(t);
  src.stop(t + 6);
  sub.start(t);
  sub.stop(t + 5.2);
}
