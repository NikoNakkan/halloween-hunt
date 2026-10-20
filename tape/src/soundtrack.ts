// Offline mix of the tape's sound, sample-accurate to the timeline.
import { FOOTAGE_URL } from "./footage";
import { shotOfKind, stareShot, type Cut, type FilmShot } from "./timeline";

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

/** A short low thump under a subliminal frame: felt more than heard. */
function thump(ctx: OfflineAudioContext, at: number, strength: number): void {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(70, at);
  osc.frequency.exponentialRampToValueAtTime(35, at + 0.35);
  const g = ctx.createGain();
  g.gain.setValueAtTime(strength, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.4);
  osc.connect(g).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.45);
}

export async function mixSoundtrack(cut: Cut): Promise<AudioBuffer> {
  const DURATION = cut.duration;
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

  for (const shot of cut.shots.filter((s): s is FilmShot => s.kind === "film")) {
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
  const bursts = [
    ...cut.flashes.map((f) => [f.start, f.end]),
    ...cut.shots.filter((s) => s.kind === "static").map((s) => [s.start, s.end]),
    [0, 0.12],
  ];
  for (const [s, e] of bursts) clip(ctx, hissBuf, ctx.destination, s, e, 0.35, s);
  // Subliminal frames: a sharper crackle and a thump that grows as the tape decays.
  cut.subliminals.forEach((g, i) => {
    clip(ctx, hissBuf, ctx.destination, g.start, g.end + 0.03, 0.5, g.start);
    thump(ctx, g.start, 0.3 + (0.5 * i) / Math.max(1, cut.subliminals.length - 1));
  });

  const stare = stareShot(cut);
  const face = shotOfKind(cut, "face");
  const outro = shotOfKind(cut, "outro");
  if (!stare || !face || !outro) throw new Error("cut needs a stare, a face and an outro");

  // Low drone swelling under the stare.
  const drone = ctx.createOscillator();
  drone.type = "sawtooth";
  const droneStart = stare.start - 0.2;
  drone.frequency.setValueAtTime(55, droneStart);
  drone.frequency.linearRampToValueAtTime(41, stare.end);
  const droneLp = ctx.createBiquadFilter();
  droneLp.type = "lowpass";
  droneLp.frequency.value = 220;
  const droneGain = ctx.createGain();
  droneGain.gain.setValueAtTime(0, droneStart);
  droneGain.gain.linearRampToValueAtTime(0.35, stare.end - 0.05);
  droneGain.gain.linearRampToValueAtTime(0, stare.end);
  drone.connect(droneLp).connect(droneGain).connect(ctx.destination);
  drone.start(droneStart);
  drone.stop(stare.end);

  // Jumpscare: scream + sub-bass hit.
  const hit = face.start;
  clip(ctx, scream, ctx.destination, hit, hit + scream.duration, 1);
  const boom = ctx.createOscillator();
  boom.frequency.setValueAtTime(90, hit);
  boom.frequency.exponentialRampToValueAtTime(30, hit + 0.8);
  const boomGain = ctx.createGain();
  boomGain.gain.setValueAtTime(0.9, hit);
  boomGain.gain.exponentialRampToValueAtTime(0.001, hit + 0.9);
  boom.connect(boomGain).connect(ctx.destination);
  boom.start(hit);
  boom.stop(hit + 1);

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
  cackle.start(outro.start + 0.15);

  return ctx.startRendering();
}
