// A knife slashes across an answer card; it splits along the cut and the halves fall apart.
import { audio, noiseBuffer } from "../audio/engine";
import { wait } from "./anim";

const KNIFE = `
<svg viewBox="0 0 240 40" aria-hidden="true">
  <defs>
    <linearGradient id="blade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f6f8"/><stop offset="0.55" stop-color="#a9b0b8"/><stop offset="1" stop-color="#5d646c"/>
    </linearGradient>
  </defs>
  <path d="M70 12 L224 14 Q236 20 224 26 L70 28 Z" fill="url(#blade)"/>
  <path d="M120 22 L150 22" stroke="#7a1010" stroke-width="2.5" opacity="0.8"/>
  <rect x="60" y="8" width="12" height="24" rx="2" fill="#3a3a3a"/>
  <rect x="4" y="11" width="58" height="18" rx="6" fill="#2a1a12"/>
  <circle cx="20" cy="20" r="2.4" fill="#c9b27a"/><circle cx="42" cy="20" r="2.4" fill="#c9b27a"/>
</svg>`;

/** Metallic "shing": a bright noise sweep plus a ringing blade. */
function shing(): void {
  const { ctx, out } = audio();
  const t = ctx.currentTime;
  const swish = ctx.createBufferSource();
  swish.buffer = noiseBuffer(0.4);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 4;
  band.frequency.setValueAtTime(2500, t);
  band.frequency.exponentialRampToValueAtTime(7500, t + 0.18);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.0001, t);
  sg.gain.exponentialRampToValueAtTime(0.6, t + 0.03);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  swish.connect(band).connect(sg).connect(out);
  swish.start(t);
  for (const [hz, level] of [
    [3150, 0.12],
    [4720, 0.07],
  ]) {
    const ring = ctx.createOscillator();
    ring.frequency.value = hz;
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t + 0.12);
    rg.gain.exponentialRampToValueAtTime(level, t + 0.14);
    rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    ring.connect(rg).connect(out);
    ring.start(t + 0.12);
    ring.stop(t + 0.95);
  }
}

/** The knife cuts the card in two; resolves once both halves (and the gap) are gone. */
export async function knifeAway(el: HTMLElement): Promise<void> {
  if (el.dataset.gone) return;
  el.dataset.gone = "1";
  const r = el.getBoundingClientRect();

  // The blade flies across the card's middle, on a slight downward diagonal.
  const knife = document.createElement("div");
  knife.className = "quiz-knife";
  knife.innerHTML = KNIFE;
  const kw = Math.max(160, r.width * 0.45);
  const kh = kw * (40 / 240);
  Object.assign(knife.style, { width: `${kw}px`, height: `${kh}px`, top: `${r.top + r.height / 2 - kh / 2}px` });
  document.body.append(knife);
  shing();
  const fly = knife.animate(
    [
      { transform: `translate(${-kw}px, -14px) rotate(-6deg)` },
      { transform: `translate(${innerWidth + 20}px, 14px) rotate(-6deg)` },
    ],
    { duration: 380, easing: "cubic-bezier(.3,.1,.6,1)", fill: "forwards" },
  ).finished;
  await wait(170); // the edge reaches the card
  el.classList.add("slashed"); // red cut line appears
  await fly;
  knife.remove();
  await wait(220);

  // Split along the cut: this card keeps the top, a copy takes the bottom.
  const lower = el.cloneNode(true) as HTMLElement;
  lower.classList.add("slash-half");
  Object.assign(lower.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  document.body.append(lower);
  el.style.clipPath = "polygon(0 0, 100% 0, 100% 40%, 0 60%)";
  lower.style.clipPath = "polygon(0 60%, 100% 40%, 100% 100%, 0 100%)";
  const fall = { duration: 900, easing: "cubic-bezier(.5,0,.9,.5)", fill: "forwards" as const };
  await Promise.all([
    el.animate([{ transform: "none", opacity: 1 }, { transform: "translate(-30px, 70px) rotate(-9deg)", opacity: 0 }], fall)
      .finished,
    lower
      .animate([{ transform: "none", opacity: 1 }, { transform: "translate(40px, 160px) rotate(12deg)", opacity: 0 }], fall)
      .finished,
  ]);
  lower.remove();
  const h = el.offsetHeight;
  await el.animate([{ height: `${h}px` }, { height: "0px" }], { duration: 260, easing: "ease-in", fill: "forwards" }).finished;
  el.hidden = true;
}
