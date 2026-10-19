// Offline mix of the tape's sound, sample-accurate to the timeline.
import { FOOTAGE_URL } from "./footage";
import { DURATION, FLASHES, SHOTS, type FilmShot } from "./timeline";

export const SAMPLE_RATE = 48000;

async function decode(ctx: BaseAudioContext, url: string): Promise<AudioBuffer> {
  return ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
}

function noise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Plays `buf` from `offset` between `start` and `end` with an envelope. */
function clip(ctx: OfflineAudioContext, buf: AudioBuffer, dest: AudioNode, start: number, end: number, gain: number, offset = 0): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.setValueAtTime(gain, Math.max(start + 0.01, end - 0.02));
  g.gain.linearRampToValueAtTime(0, end);
  src.connect(g).connect(dest);
  src.start(start, offset);
  src.stop(end);
  return src;
}

export async function mixSoundtrack(): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(SAMPLE_RATE * DURATION), SAMPLE_RATE);
  const [film, scream, laugh] = await Promise.all([
    decode(ctx, FOOTAGE_URL),
    decode(ctx, "/sounds/scream.ogg"),
    decode(ctx, "/sounds/laugh.ogg"),
  ]);
  const hissBuf = noise(ctx, DURATION);

  // Old-tape tone for the film's music: band-limited, a little warm.
  const tape = ctx.createBiquadFilter();
  tape.type = "lowpass";
  tape.frequency.value = 3800;
  const lowCut = ctx.createBiquadFilter();
  lowCut.type = "highpass";
  lowCut.frequency.value = 90;
  tape.connect(lowCut).connect(ctx.destination);

  for (const shot of SHOTS.filter((s): s is FilmShot => s.kind === "film")) {
    const src = clip(ctx, film, tape, shot.start, shot.end, 0.9, shot.from);
    const [r0, r1] = shot.rate;
    // Wow & flutter: the speed (and pitch) wavers like a stretched tape...
    src.playbackRate.setValueAtTime(Math.max(r0, 0.001), shot.start);
    for (let t = shot.start; t < shot.end; t += 0.05) {
      const p = (t - shot.start) / (shot.end - shot.start);
      const base = r0 + (r1 - r0) * p;
      src.playbackRate.linearRampToValueAtTime(Math.max(0.02, base * (1 + 0.012 * Math.sin(t * 2 * Math.PI * 1.3))), t);
    }
    // ...and the stare shot's ramp to 0 is a classic tape-stop groan.
  }

  // Constant tape hiss, plus loud static on glitches and the static shot.
  const hissFilter = ctx.createBiquadFilter();
  hissFilter.type = "highpass";
  hissFilter.frequency.value = 2500;
  hissFilter.connect(ctx.destination);
  clip(ctx, hissBuf, hissFilter, 0, DURATION - 0.25, 0.05);
  const bursts = [...FLASHES.map((f) => [f.start, f.end]), [6.6, 7.0], [0, 0.12]];
  for (const [s, e] of bursts) clip(ctx, hissBuf, ctx.destination, s, e, 0.35, s);

  // Low drone swelling under the stare.
  const drone = ctx.createOscillator();
  drone.type = "sawtooth";
  drone.frequency.setValueAtTime(55, 5.0);
  drone.frequency.linearRampToValueAtTime(41, 6.6);
  const droneLp = ctx.createBiquadFilter();
  droneLp.type = "lowpass";
  droneLp.frequency.value = 220;
  const droneGain = ctx.createGain();
  droneGain.gain.setValueAtTime(0, 5.0);
  droneGain.gain.linearRampToValueAtTime(0.35, 6.55);
  droneGain.gain.linearRampToValueAtTime(0, 6.6);
  drone.connect(droneLp).connect(droneGain).connect(ctx.destination);
  drone.start(5.0);
  drone.stop(6.6);

  // Jumpscare: scream + sub-bass hit.
  clip(ctx, scream, ctx.destination, 7.0, 7.0 + scream.duration, 1);
  const boom = ctx.createOscillator();
  boom.frequency.setValueAtTime(90, 7.0);
  boom.frequency.exponentialRampToValueAtTime(30, 7.8);
  const boomGain = ctx.createGain();
  boomGain.gain.setValueAtTime(0.9, 7.0);
  boomGain.gain.exponentialRampToValueAtTime(0.001, 7.9);
  boom.connect(boomGain).connect(ctx.destination);
  boom.start(7.0);
  boom.stop(8.0);

  // Outro cackle, slowed and echoing.
  const echo = ctx.createDelay(1);
  echo.delayTime.value = 0.28;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.45;
  echo.connect(feedback).connect(echo);
  echo.connect(ctx.destination);
  const cackle = ctx.createBufferSource();
  cackle.buffer = laugh;
  cackle.playbackRate.value = 0.8;
  const cackleGain = ctx.createGain();
  cackleGain.gain.value = 0.9;
  cackle.connect(cackleGain);
  cackleGain.connect(ctx.destination);
  cackleGain.connect(echo);
  cackle.start(8.15);

  return ctx.startRendering();
}
