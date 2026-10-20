// An old radio playing in the next room, under the whole tape: old Greek records
// through a small speaker, with the dial drifting between stations.
import { rng } from "../../src/random";

/** Files in tape/footage/ played as the background radio (any that exist are used). */
export const RADIO_FILES = ["radio-1.ogg", "radio-2.ogg", "radio-3.mp3"];

export async function loadRadio(ctx: BaseAudioContext): Promise<AudioBuffer[]> {
  const found: AudioBuffer[] = [];
  for (const name of RADIO_FILES) {
    try {
      const res = await fetch(`./footage/${name}`);
      if (!res.ok || (res.headers.get("content-type") ?? "").includes("html")) continue;
      found.push(await ctx.decodeAudioData(await res.arrayBuffer()));
    } catch {
      // Missing or undecodable: the tape simply has less radio.
    }
  }
  return found;
}

/** Dial between stations: a whistle sliding through static. */
function tuning(ctx: OfflineAudioContext, dest: AudioNode, at: number, noise: AudioBuffer, rand: () => number): void {
  const len = 0.5 + rand() * 0.4;
  const hiss = ctx.createBufferSource();
  hiss.buffer = noise;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.5;
  band.frequency.setValueAtTime(800, at);
  band.frequency.linearRampToValueAtTime(2400, at + len);
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0, at);
  hg.gain.linearRampToValueAtTime(0.5, at + 0.05);
  hg.gain.linearRampToValueAtTime(0, at + len);
  hiss.connect(band).connect(hg).connect(dest);
  hiss.start(at, rand() * 5);
  hiss.stop(at + len);

  const whistle = ctx.createOscillator();
  whistle.frequency.setValueAtTime(1800 + rand() * 1500, at);
  whistle.frequency.exponentialRampToValueAtTime(300 + rand() * 400, at + len);
  const wg = ctx.createGain();
  wg.gain.setValueAtTime(0, at);
  wg.gain.linearRampToValueAtTime(0.06, at + 0.1);
  wg.gain.linearRampToValueAtTime(0, at + len);
  whistle.connect(wg).connect(dest);
  whistle.start(at);
  whistle.stop(at + len);
}

/**
 * Lay the radio under [start, end): segments of each record, retuning between them.
 * `level` is how loud the radio sits under the film (it's in another room).
 */
export function radioBed(
  ctx: OfflineAudioContext,
  dest: AudioNode,
  records: AudioBuffer[],
  noise: AudioBuffer,
  start: number,
  end: number,
  level = 0.16,
): void {
  if (!records.length) return;
  const rand = rng(77);
  // Small speaker in another room: telephone band, a bit boxy.
  const speaker = ctx.createBiquadFilter();
  speaker.type = "bandpass";
  speaker.frequency.value = 1300;
  speaker.Q.value = 0.7;
  const box = ctx.createBiquadFilter();
  box.type = "peaking";
  box.frequency.value = 650;
  box.gain.value = 4;
  const out = ctx.createGain();
  out.gain.value = level;
  speaker.connect(box).connect(out).connect(dest);

  let t = start;
  let i = 0;
  while (t < end - 1) {
    const rec = records[i % records.length];
    const len = Math.min(end - t, 5 + rand() * 4);
    const from = 8 + rand() * Math.max(1, rec.duration - len - 16); // skip intros and run-outs
    const src = ctx.createBufferSource();
    src.buffer = rec;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 0.3);
    g.gain.setValueAtTime(1, t + len - 0.4);
    g.gain.linearRampToValueAtTime(0, t + len);
    src.connect(g).connect(speaker);
    src.start(t, from);
    src.stop(t + len);
    tuning(ctx, speaker, t + len - 0.35, noise, rand);
    t += len + 0.2;
    i++;
  }
}
