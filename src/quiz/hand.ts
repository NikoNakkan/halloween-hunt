// Grandma's hand: reaches in from the edge, grips an answer card and drags it away.
import { audio, noiseBuffer } from "../audio/engine";
import { wait } from "./anim";

// Drawn reaching right: wrist on the left, long bony fingers curling over the card.
const HAND = `
<svg viewBox="0 0 220 120" aria-hidden="true">
  <defs>
    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c9c2ad"/><stop offset="1" stop-color="#8f8873"/>
    </linearGradient>
  </defs>
  <path d="M0 40 C40 30 70 28 98 34 L120 40 C126 44 126 72 120 78 L96 86 C70 92 36 92 0 84 Z" fill="url(#skin)"/>
  <g fill="url(#skin)" stroke="#5c5646" stroke-width="1.2">
    <path d="M110 38 C140 30 168 30 186 38 C196 44 196 52 188 54 C170 50 146 50 118 54 Z"/>
    <path d="M114 52 C146 48 176 50 198 60 C206 66 204 74 196 74 C176 68 148 66 118 68 Z"/>
    <path d="M114 66 C144 66 170 70 190 80 C196 86 192 92 186 90 C168 84 144 82 116 80 Z"/>
    <path d="M110 78 C134 82 156 88 172 98 C176 104 172 108 166 106 C150 98 130 94 108 90 Z"/>
    <path d="M96 30 C110 20 128 14 142 16 C148 18 146 24 140 26 C126 28 112 34 104 40 Z"/>
  </g>
  <g fill="#d6c98f" stroke="#6b5a2a" stroke-width="1">
    <path d="M186 38 L206 44 L190 52 Z"/><path d="M198 60 L218 68 L198 74 Z"/>
    <path d="M190 80 L208 90 L188 90 Z"/><path d="M172 98 L188 108 L168 106 Z"/>
    <path d="M142 16 L158 18 L144 26 Z"/>
  </g>
  <g stroke="#6e6857" stroke-width="1" fill="none" opacity="0.7">
    <path d="M20 50 C40 46 60 46 80 50"/><path d="M24 70 C44 66 66 68 86 72"/>
    <path d="M134 40 l4 8 M150 40 l4 10 M140 56 l4 8 M160 56 l3 10 M138 72 l4 8 M156 74 l3 8"/>
    <path d="M30 60 C50 58 58 64 74 60" stroke="#6a7a8a"/>
  </g>
</svg>`;

/** A dull grab, then cloth dragging across a table. */
function grabSound(drag: boolean): void {
  const { ctx, out } = audio();
  const t = ctx.currentTime;
  if (!drag) {
    const thud = ctx.createOscillator();
    thud.frequency.setValueAtTime(110, t);
    thud.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    thud.connect(g).connect(out);
    thud.start(t);
    thud.stop(t + 0.22);
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.6);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(250, t + 0.45);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.45, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  src.connect(lp).connect(g).connect(out);
  src.start(t);
}

/** The hand takes the card off screen; resolves once it (and the gap) is gone. */
export async function handAway(el: HTMLElement): Promise<void> {
  if (el.dataset.gone) return;
  el.dataset.gone = "1";
  const r = el.getBoundingClientRect();
  const fromLeft = Math.random() < 0.5;
  const handH = r.height * 1.5;
  const handW = handH * (220 / 120);
  const hand = document.createElement("div");
  hand.className = "grandma-hand";
  hand.innerHTML = HAND;
  Object.assign(hand.style, { width: `${handW}px`, height: `${handH}px`, top: `${r.top + r.height / 2 - handH / 2}px` });
  document.body.append(hand);

  // Fingers end up over the near edge of the card.
  const grip = fromLeft ? r.left - handW * 0.62 : r.right - handW * 0.38;
  const start = fromLeft ? -handW : innerWidth;
  const flip = fromLeft ? "" : " scaleX(-1)";
  await hand.animate(
    [
      { transform: `translateX(${start}px)${flip}` },
      { transform: `translateX(${grip}px)${flip}`, easing: "cubic-bezier(.2,.9,.3,1)" },
    ],
    { duration: 700, fill: "forwards" },
  ).finished;
  grabSound(false);
  el.classList.add("grabbed");
  await wait(350); // holds it a moment…

  const away = fromLeft ? -(r.right + 80) : innerWidth - r.left + 80;
  grabSound(true);
  const yank = { duration: 480, easing: "cubic-bezier(.6,0,.9,.4)", fill: "forwards" as const };
  await Promise.all([
    el.animate([{ transform: "none" }, { transform: `translateX(${away}px) rotate(${fromLeft ? -7 : 7}deg)` }], yank).finished,
    hand.animate(
      [{ transform: `translateX(${grip}px)${flip}` }, { transform: `translateX(${grip + away}px)${flip}` }],
      yank,
    ).finished,
  ]);
  hand.remove();
  el.style.opacity = "0";
  const h = el.offsetHeight;
  await el.animate([{ height: `${h}px` }, { height: "0px" }], { duration: 260, easing: "ease-in", fill: "forwards" }).finished;
  el.hidden = true;
}
