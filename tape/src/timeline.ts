// The cursed tape, second by second. Picture and soundtrack both read this.

export const FPS = 30;
export const DURATION = 9;

export interface FilmShot {
  kind: "film";
  start: number;
  end: number;
  /** Where in the source film this shot begins. */
  from: number;
  /** Playback speed at the start and end of the shot (end < start = tape slowing). */
  rate: [number, number];
  /** Slow zoom from 1 to this factor over the shot. */
  zoom?: number;
}

export type Shot =
  | FilmShot
  | { kind: "play"; start: number; end: number }
  | { kind: "static"; start: number; end: number }
  | { kind: "face"; start: number; end: number }
  | { kind: "outro"; start: number; end: number };

export const SHOTS: Shot[] = [
  { kind: "play", start: 0, end: 0.7 },
  { kind: "film", start: 0.7, end: 2.0, from: 70.5, rate: [1, 1] }, // church graveyard
  { kind: "film", start: 2.0, end: 4.0, from: 120.5, rate: [1, 1] }, // skeleton climbs out
  { kind: "film", start: 4.0, end: 5.2, from: 181.0, rate: [1, 1] }, // four skeletons dance
  { kind: "film", start: 5.2, end: 6.6, from: 272.0, rate: [1, 0], zoom: 1.35 }, // stares, tape dies
  { kind: "static", start: 6.6, end: 7.0 },
  { kind: "face", start: 7.0, end: 8.0 },
  { kind: "outro", start: 8.0, end: DURATION },
];

/** Short glitch flashes with a warning, inside the film shots. */
export const FLASHES = [
  { start: 3.05, end: 3.22, text: "ΜΗΝ ΚΟΙΤΑΣ ΠΙΣΩ ΣΟΥ" },
  { start: 4.6, end: 4.7, text: "" },
];

/** Typed in while the skeleton stares. */
export const STARE_TEXT = { start: 5.5, end: 6.6, text: "Η ΓΙΑΓΙΑ ΣΕ ΒΛΕΠΕΙ" };

export function shotAt(t: number): Shot {
  return SHOTS.find((s) => t >= s.start && t < s.end) ?? SHOTS[SHOTS.length - 1];
}

/** Source-film time for shot-local time, integrating a linearly changing speed. */
export function filmTime(shot: FilmShot, t: number): number {
  const local = t - shot.start;
  const len = shot.end - shot.start;
  const [r0, r1] = shot.rate;
  return shot.from + r0 * local + ((r1 - r0) * local * local) / (2 * len);
}
