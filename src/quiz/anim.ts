// Quiz animations and the little sounds that go with them.
import { audio, noiseBuffer } from "../audio/engine";

export const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/** Claw-scratch sound: a noise burst sweeping down through a narrow filter. */
function scratch(): void {
  const { ctx, out } = audio();
  const t = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const at = t + i * 0.07;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.25);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 6;
    band.frequency.setValueAtTime(4200, at);
    band.frequency.exponentialRampToValueAtTime(900, at + 0.18);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.7, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
    src.connect(band).connect(gain).connect(out);
    src.start(at);
  }
}

/** Short clock tick for the last seconds of a question. */
export function tick(urgent: boolean): void {
  const { ctx, out } = audio();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.frequency.value = urgent ? 1300 : 900;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + 0.07);
}

/** Claw marks rip across the answer, it drops into the dark, then the gap closes. */
export async function clawAway(el: HTMLElement): Promise<void> {
  if (el.dataset.gone) return;
  el.dataset.gone = "1";
  el.classList.add("clawed");
  scratch();
  await wait(380);
  await el.animate(
    [
      { transform: "none", opacity: 1, filter: "none" },
      { transform: "translate(6px, -4px) rotate(2deg)", opacity: 1, offset: 0.15 },
      { transform: "translateY(140px) rotate(-14deg) scale(0.85)", opacity: 0, filter: "blur(4px) brightness(0.3)" },
    ],
    { duration: 850, easing: "cubic-bezier(.5,0,.8,.3)", fill: "forwards" },
  ).finished;
  const h = el.offsetHeight;
  await el.animate([{ height: `${h}px`, marginBottom: "10px" }, { height: "0px", marginBottom: "0px" }], {
    duration: 280,
    easing: "ease-in",
    fill: "forwards",
  }).finished;
  el.hidden = true;
}

/** Remove without animation (state already known when the page loads). */
export function goneQuietly(el: HTMLElement): void {
  el.dataset.gone = "1";
  el.hidden = true;
}
