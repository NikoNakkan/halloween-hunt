// Makes the whole mix sound like it was dubbed onto a worn VHS tape:
// mono, wow & flutter, tape saturation, narrow band, mains hum and dropouts.
import { rng } from "../../src/random";

/** Soft tape saturation: rounds off peaks and adds warmth. */
function saturationCurve(drive: number): Float32Array<ArrayBuffer> {
  const n = 4096;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(drive * x) / Math.tanh(drive);
  }
  return curve;
}

/**
 * Build the tape chain; connect every source to the returned input.
 * Everything after it plays slightly unsteadily, like a stretched tape.
 */
export function tapeChain(ctx: OfflineAudioContext, duration: number, seed = 31): AudioNode {
  const rand = rng(seed);

  // VHS linear audio track: mono.
  const input = ctx.createGain();
  input.channelCount = 1;
  input.channelCountMode = "explicit";
  input.channelInterpretation = "speakers";

  // Wow (slow) & flutter (fast): a delay line whose length wobbles bends the pitch.
  const wobble = ctx.createDelay(0.1);
  wobble.delayTime.value = 0.02;
  for (const [hz, depth] of [
    [0.55, 0.0022],
    [7.5, 0.00018],
  ]) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = hz;
    const amount = ctx.createGain();
    amount.gain.value = depth;
    lfo.connect(amount).connect(wobble.delayTime);
    lfo.start(0);
  }

  const saturate = ctx.createWaveShaper();
  saturate.curve = saturationCurve(2.2);
  saturate.oversample = "2x";

  const lowCut = ctx.createBiquadFilter();
  lowCut.type = "highpass";
  lowCut.frequency.value = 75;
  const highCut = ctx.createBiquadFilter();
  highCut.type = "lowpass";
  highCut.frequency.value = 6500;
  highCut.Q.value = 0.5;
  const honk = ctx.createBiquadFilter(); // cheap-speaker midrange
  honk.type = "peaking";
  honk.frequency.value = 1100;
  honk.gain.value = 2.5;

  // Dropouts: worn oxide makes the level dip for a split second now and then.
  const dropouts = ctx.createGain();
  dropouts.gain.value = 1;
  for (let i = 0; i < Math.round(duration / 5); i++) {
    const at = 1 + rand() * (duration - 2);
    const len = 0.04 + rand() * 0.1;
    dropouts.gain.setValueAtTime(1, at);
    dropouts.gain.linearRampToValueAtTime(0.2 + rand() * 0.2, at + 0.01);
    dropouts.gain.setValueAtTime(0.25, at + len);
    dropouts.gain.linearRampToValueAtTime(1, at + len + 0.02);
  }

  input.connect(wobble).connect(saturate).connect(lowCut).connect(highCut).connect(honk).connect(dropouts);
  dropouts.connect(ctx.destination);

  // Greek mains are 50 Hz: a faint hum with its harmonics, under everything.
  for (const [hz, level] of [
    [50, 0.012],
    [100, 0.006],
    [150, 0.004],
  ]) {
    const hum = ctx.createOscillator();
    hum.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.value = level;
    hum.connect(g).connect(ctx.destination);
    hum.start(0);
    hum.stop(duration);
  }
  return input;
}
