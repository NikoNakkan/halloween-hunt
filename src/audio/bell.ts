// A distant church bell: inharmonic partials (hum, prime, minor third, fifth, nominal…)
// each decaying at its own rate, slightly detuned so it beats. Works in live and
// offline audio contexts, so the apps and the tape share it.

const PARTIALS: [ratio: number, gain: number, decay: number][] = [
  [0.5, 0.5, 6.0], // hum note
  [1.0, 0.8, 4.5], // prime
  [1.19, 0.45, 3.5], // minor third: what makes a bell sound mournful
  [1.5, 0.3, 3.0], // fifth
  [2.0, 0.35, 2.5], // nominal
  [2.52, 0.15, 1.6],
  [3.0, 0.12, 1.2],
];

export function tollBell(ctx: BaseAudioContext, dest: AudioNode, at: number, volume = 0.5, pitch = 147): void {
  const out = ctx.createGain();
  out.gain.value = volume;
  out.connect(dest);
  for (const [ratio, gain, decay] of PARTIALS) {
    for (const detune of [-4, 4]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = pitch * ratio;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(gain / 2, at + 0.008); // the clapper strike
      g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
      osc.connect(g).connect(out);
      osc.start(at);
      osc.stop(at + decay + 0.05);
    }
  }
}
