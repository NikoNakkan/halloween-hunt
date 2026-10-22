// Background unease for the player pages: spiders crawling and dangling, and dark
// silhouettes that fade in at the edges, barely visible. All purely visual.
import "./spooky.css";

const SPIDER = `
<svg viewBox="0 0 60 60" aria-hidden="true">
  <g class="legs-l" stroke="#4a3a34" stroke-width="2.4" fill="none" stroke-linecap="round">
    <path d="M26 26 L14 14 L6 16"/><path d="M25 29 L10 24 L2 30"/>
    <path d="M25 32 L10 36 L3 44"/><path d="M26 35 L15 46 L10 56"/>
  </g>
  <g class="legs-r" stroke="#4a3a34" stroke-width="2.4" fill="none" stroke-linecap="round">
    <path d="M34 26 L46 14 L54 16"/><path d="M35 29 L50 24 L58 30"/>
    <path d="M35 32 L50 36 L57 44"/><path d="M34 35 L45 46 L50 56"/>
  </g>
  <ellipse cx="30" cy="36" rx="8" ry="10" fill="#2a1d1a" stroke="#6d5a50" stroke-width="0.8"/>
  <path d="M27 31 Q30 29 33 31" stroke="#8a2020" stroke-width="1.6" fill="none"/>
  <circle cx="30" cy="24" r="5.5" fill="#2a1d1a" stroke="#6d5a50" stroke-width="0.8"/>
  <circle cx="28" cy="22.5" r="1.2" fill="#e01010"/><circle cx="32" cy="22.5" r="1.2" fill="#e01010"/>
</svg>`;

/** Dark shapes, made ambiguous by blur and low opacity in CSS. */
const SILHOUETTES = [
  // Hunched old woman: bun, shawl, cane.
  `<svg viewBox="0 0 100 220"><path d="M48 18c-9 0-14 7-13 15-11 3-18 14-21 28-5 22-6 52-2 80 3 20 8 40 7 60h52c-2-26 2-52 2-78 0-26-4-52-14-68 4-8 2-20-6-27 3-5 2-10-5-10z"/><circle cx="50" cy="12" r="7"/><path d="M78 96l14 120h-4L74 98z"/></svg>`,
  // Tall, too-thin figure with long arms.
  `<svg viewBox="0 0 80 260"><circle cx="40" cy="20" r="13"/><path d="M30 36h20l6 70 10 96-6 2-14-90-6 0-14 90-6-2 10-96z"/><path d="M30 42 6 150l4 2L34 60zM50 42l24 108-4 2L46 60z"/></svg>`,
  // A head and shoulder peeking in from the side.
  `<svg viewBox="0 0 120 160"><circle cx="70" cy="50" r="30"/><path d="M20 160c0-40 20-70 50-74s50 30 50 74z"/></svg>`,
];

const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
const between = (a: number, b: number) => a + Math.random() * (b - a);

function layer(): HTMLElement {
  let el = document.querySelector<HTMLElement>(".spooky-layer");
  if (!el) {
    el = document.createElement("div");
    el.className = "spooky-layer";
    el.setAttribute("aria-hidden", "true");
    document.body.prepend(el);
  }
  return el;
}

/** A spider runs from one edge to another, sometimes freezing halfway. */
export function crawl(): void {
  const w = innerWidth;
  const h = innerHeight;
  const size = between(24, 42);
  const spider = document.createElement("div");
  spider.className = "spider crawling";
  spider.style.width = spider.style.height = `${size}px`;
  spider.innerHTML = SPIDER;
  document.body.append(spider);
  const fromLeft = Math.random() < 0.5;
  const x0 = fromLeft ? -size : w + size;
  const x1 = fromLeft ? w + size : -size;
  const y0 = between(0.1, 0.9) * h;
  const y1 = between(0.1, 0.9) * h;
  const angle = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI + 90; // head first
  const mid = { x: (x0 + x1) / 2 + between(-60, 60), y: (y0 + y1) / 2 + between(-60, 60) };
  const at = (x: number, y: number) => `translate(${x}px, ${y}px) rotate(${angle}deg)`;
  const pause = Math.random() < 0.5;
  spider
    .animate(
      pause
        ? [
            { transform: at(x0, y0) },
            { transform: at(mid.x, mid.y), offset: 0.42 },
            { transform: at(mid.x, mid.y), offset: 0.62 }, // freezes… like it noticed you
            { transform: at(x1, y1) },
          ]
        : [{ transform: at(x0, y0) }, { transform: at(mid.x, mid.y) }, { transform: at(x1, y1) }],
      { duration: between(6000, 10000), easing: "linear" },
    )
    .finished.then(() => spider.remove(), () => spider.remove());
}

/** A spider drops from the top on a thread, bobs, then climbs back up. */
export function dangle(): void {
  const size = between(22, 34);
  const drop = between(0.15, 0.4) * innerHeight;
  const el = document.createElement("div");
  el.className = "spider dangling";
  el.style.left = `${between(0.08, 0.92) * innerWidth}px`;
  el.innerHTML = `<span class="thread"></span><div class="spider-body" style="width:${size}px;height:${size}px">${SPIDER}</div>`;
  document.body.append(el);
  el.animate(
    [
      { transform: "translateY(-60px)" },
      { transform: `translateY(${drop}px)`, offset: 0.35, easing: "ease-out" },
      { transform: `translateY(${drop - 14}px)`, offset: 0.45 },
      { transform: `translateY(${drop}px)`, offset: 0.55 },
      { transform: `translateY(${drop}px)`, offset: 0.75 },
      { transform: "translateY(-60px)" },
    ],
    { duration: between(7000, 10000) },
  ).finished.then(() => el.remove(), () => el.remove());
}

/** A silhouette fades in near an edge for a few seconds, barely there. */
export function apparition(): void {
  const el = document.createElement("div");
  el.className = "silhouette";
  el.innerHTML = pick(SILHOUETTES);
  const side = Math.random() < 0.5 ? "left" : "right";
  el.style[side] = `${between(-4, 10)}vw`;
  el.style.height = `${between(45, 75)}vh`;
  if (side === "right") el.style.transform = "scaleX(-1)";
  layer().append(el);
  const peak = between(0.06, 0.1);
  el.animate(
    [{ opacity: 0 }, { opacity: peak, offset: 0.3 }, { opacity: peak, offset: 0.7 }, { opacity: 0 }],
    { duration: between(4000, 7000), easing: "ease-in-out" },
  ).finished.then(() => el.remove(), () => el.remove());
}

function every(minMs: number, maxMs: number, fn: () => void): void {
  const next = () => window.setTimeout(() => {
    if (!document.hidden) fn();
    next();
  }, between(minMs, maxMs));
  next();
}

let started = false;

/** Start the background scares (once per page). */
export function startSpooky(): void {
  if (started || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  started = true;
  every(20_000, 45_000, crawl);
  every(40_000, 75_000, dangle);
  every(25_000, 50_000, apparition);
  window.setTimeout(apparition, 8000); // an early one, so it's noticed (or not)
}
