// The cursed tape, second by second. Picture and soundtrack both read a Cut.

export const FPS = 30;
const FRAME = 1 / FPS;

export interface FilmShot {
  kind: "film";
  start: number;
  end: number;
  /** Where in the source film this shot begins. */
  from: number;
  /** Playback speed at the start and end of the shot (end < start = tape slowing). */
  rate: [number, number];
  /** Slow zoom from 1 to this factor over the shot (marks "the stare"). */
  zoom?: number;
}

export type Shot =
  | FilmShot
  | { kind: "play"; start: number; end: number }
  | { kind: "static"; start: number; end: number }
  | { kind: "face"; start: number; end: number }
  | { kind: "outro"; start: number; end: number };

export interface Flash {
  start: number;
  end: number;
  text: string;
}

/** A few frames of the masked man, barely there. */
export interface Subliminal {
  start: number;
  end: number;
  style: "plain" | "negative" | "red";
  /** The final scare: the scream lands on this one. */
  scare?: boolean;
}

export interface Cut {
  duration: number;
  shots: Shot[];
  flashes: Flash[];
  stare: Flash;
  subliminals: Subliminal[];
}

const sub = (start: number, frames: number, style: Subliminal["style"], scare = false): Subliminal => ({
  start,
  end: start + frames * FRAME,
  style,
  ...(scare ? { scare } : {}),
});

/** The original 9-second tape. */
export const SHORT: Cut = {
  duration: 9,
  shots: [
    { kind: "play", start: 0, end: 0.7 },
    { kind: "film", start: 0.7, end: 2.0, from: 70.5, rate: [1, 1] }, // church graveyard
    { kind: "film", start: 2.0, end: 4.0, from: 120.5, rate: [1, 1] }, // skeleton climbs out
    { kind: "film", start: 4.0, end: 5.2, from: 181.0, rate: [1, 1] }, // four skeletons dance
    { kind: "film", start: 5.2, end: 6.6, from: 272.0, rate: [1, 0], zoom: 1.35 }, // stares, tape dies
    { kind: "static", start: 6.6, end: 7.0 },
    { kind: "face", start: 7.0, end: 8.0 },
    { kind: "outro", start: 8.0, end: 9 },
  ],
  flashes: [
    { start: 3.05, end: 3.22, text: "ΜΗΝ ΚΟΙΤΑΣ ΠΙΣΩ ΣΟΥ" },
    { start: 4.6, end: 4.7, text: "" },
  ],
  stare: { start: 5.5, end: 6.6, text: "Η ΓΙΑΓΙΑ ΣΕ ΒΛΕΠΕΙ" },
  subliminals: [],
};

/** The 30-second edition: more of the film, and the masked man creeping in. */
export const LONG: Cut = {
  duration: 30,
  shots: [
    { kind: "play", start: 0, end: 0.7 },
    { kind: "film", start: 0.7, end: 3.2, from: 46.0, rate: [1, 1] }, // owl against the moon
    { kind: "film", start: 3.2, end: 5.2, from: 71.0, rate: [1, 1] }, // church graveyard
    { kind: "film", start: 5.2, end: 7.2, from: 98.0, rate: [1, 1] }, // cats on the tombstones
    { kind: "film", start: 7.2, end: 9.7, from: 118.5, rate: [1, 1] }, // skeleton climbs out
    { kind: "film", start: 9.7, end: 12.0, from: 131.0, rate: [1, 1] }, // skeleton in the graveyard
    { kind: "film", start: 12.0, end: 14.5, from: 181.0, rate: [1, 1] }, // four skeletons dance
    { kind: "film", start: 14.5, end: 16.5, from: 213.0, rate: [1, 1] }, // stretched skeleton
    { kind: "film", start: 16.5, end: 19.5, from: 252.0, rate: [1, 1] }, // playing a spine like a xylophone
    { kind: "film", start: 19.5, end: 21.5, from: 278.0, rate: [1, 1] }, // falls to pieces
    { kind: "static", start: 21.5, end: 21.8 },
    { kind: "film", start: 21.8, end: 25.2, from: 272.0, rate: [1, 0], zoom: 1.4 }, // stares, tape dies
    { kind: "static", start: 25.2, end: 26.4 }, // the masked man breaks through here (final scare)
    { kind: "outro", start: 26.4, end: 30 },
  ],
  flashes: [
    { start: 8.9, end: 9.07, text: "ΜΗΝ ΚΟΙΤΑΣ ΠΙΣΩ ΣΟΥ" },
    { start: 18.3, end: 18.4, text: "" },
    { start: 20.6, end: 20.76, text: "ΕΙΝΑΙ ΗΔΗ ΕΚΕΙ" },
  ],
  stare: { start: 23.0, end: 25.2, text: "Η ΓΙΑΓΙΑ ΣΕ ΒΛΕΠΕΙ" },
  // Only ever seen through a filter. Rare at first, then more often (and longer)
  // as the tape falls apart; the last one is the scare.
  subliminals: [
    sub(4.3, 7, "negative"),
    sub(11.1, 7, "red"),
    sub(14.0, 8, "negative"),
    sub(16.0, 7, "red"),
    sub(19.0, 8, "negative"),
    sub(20.9, 7, "red"),
    sub(21.5, 9, "negative"),
    sub(24.0, 7, "red"),
    sub(24.65, 7, "negative"),
    sub(25.5, 12, "red", true),
  ],
};

export const CUTS = { short: SHORT, long: LONG } as const;
export type CutName = keyof typeof CUTS;

export function shotAt(cut: Cut, t: number): Shot {
  return cut.shots.find((s) => t >= s.start && t < s.end) ?? cut.shots[cut.shots.length - 1];
}

export function subliminalAt(cut: Cut, t: number): Subliminal | undefined {
  return cut.subliminals.find((s) => t >= s.start && t < s.end);
}

/** When the scream hits: grandma's face if the cut has one, else the scare flash. */
export function scareTime(cut: Cut): number | undefined {
  const face = cut.shots.find((s) => s.kind === "face");
  return face?.start ?? cut.subliminals.find((s) => s.scare)?.start;
}

/** The shot that slows to a stop. */
export function stareShot(cut: Cut): FilmShot | undefined {
  return cut.shots.find((s): s is FilmShot => s.kind === "film" && s.zoom !== undefined);
}

export function shotOfKind(cut: Cut, kind: Shot["kind"]): Shot | undefined {
  return cut.shots.find((s) => s.kind === kind);
}

/** Source-film time for shot-local time, integrating a linearly changing speed. */
export function filmTime(shot: FilmShot, t: number): number {
  const local = t - shot.start;
  const len = shot.end - shot.start;
  const [r0, r1] = shot.rate;
  return shot.from + r0 * local + ((r1 - r0) * local * local) / (2 * len);
}
