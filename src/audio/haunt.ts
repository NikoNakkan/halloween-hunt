// Makes a recorded voice sound haunted: lower and slower, raspy distortion,
// a trembling old-woman wobble, and a cold room echo.
import { audio } from "./engine";

/** Soft-clipping curve: adds grit/rasp without harsh digital breakup. */
function raspCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 2048;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

/** Synthetic reverb tail: decaying noise, like an empty stone hallway. */
function roomImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return buf;
}

/** Play the clip through the haunted chain; resolves when it has finished. */
export function playHaunted(buffer: AudioBuffer): Promise<void> {
  const { ctx, out } = audio();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = 0.9; // a bit deeper and slower

  const rasp = ctx.createWaveShaper();
  rasp.curve = raspCurve(6);
  rasp.oversample = "4x";

  const thin = ctx.createBiquadFilter(); // drop the boom: old, thin voice
  thin.type = "highpass";
  thin.frequency.value = 180;

  const crackle = ctx.createBiquadFilter(); // push the throaty rasp forward
  crackle.type = "peaking";
  crackle.frequency.value = 2600;
  crackle.Q.value = 1.2;
  crackle.gain.value = 7;

  const tremble = ctx.createGain(); // shaky, frail wobble
  tremble.gain.value = 0.8;
  const lfo = ctx.createOscillator();
  const depth = ctx.createGain();
  lfo.frequency.value = 5.5;
  depth.gain.value = 0.18;
  lfo.connect(depth).connect(tremble.gain);

  const echo = ctx.createConvolver();
  echo.buffer = roomImpulse(ctx, 2.8);
  const wet = ctx.createGain();
  wet.gain.value = 0.45;

  src.connect(rasp).connect(thin).connect(crackle).connect(tremble);
  tremble.connect(out);
  tremble.connect(echo).connect(wet).connect(out);

  return new Promise((resolve) => {
    src.onended = () => {
      lfo.stop();
      // Let the echo ring out before saying we're done.
      window.setTimeout(resolve, 1500);
    };
    lfo.start();
    src.start();
  });
}
