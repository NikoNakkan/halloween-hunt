import { describe, expect, it } from "vitest";
import { CUTS, FPS, filmTime, scareTime, shotAt, stareShot, subliminalAt } from "./timeline";

describe.each(Object.entries(CUTS))("%s cut", (_, cut) => {
  it("covers the whole clip without gaps", () => {
    expect(cut.shots[0].start).toBe(0);
    expect(cut.shots[cut.shots.length - 1].end).toBe(cut.duration);
    cut.shots.slice(1).forEach((s, i) => expect(s.start).toBe(cut.shots[i].end));
  });

  it("opens on PLAY and has a scare for the scream", () => {
    expect(shotAt(cut, 0.1).kind).toBe("play");
    expect(scareTime(cut)).toBeDefined();
  });

  it("slows the stare down to a stop", () => {
    const stare = stareShot(cut);
    expect(stare).toBeDefined();
    if (!stare) return;
    const len = stare.end - stare.start;
    // Average speed of a 1 → 0 ramp is 0.5.
    expect(filmTime(stare, stare.end)).toBeCloseTo(stare.from + len / 2);
  });

  it("keeps subliminal flashes to a few frames inside the clip", () => {
    for (const s of cut.subliminals) {
      expect((s.end - s.start) * FPS).toBeLessThanOrEqual(20.01);
      expect(s.end).toBeLessThan(cut.duration);
      expect(subliminalAt(cut, s.start + 0.001)).toBe(s);
    }
  });
});

it("the long cut shows the masked man only through filters, and no face", () => {
  expect(CUTS.long.duration).toBe(30);
  expect(CUTS.long.subliminals.length).toBeGreaterThan(5);
  expect(CUTS.long.subliminals.every((s) => s.style !== "plain")).toBe(true);
  expect(CUTS.long.shots.some((s) => s.kind === "face")).toBe(false);
  expect(scareTime(CUTS.long)).toBe(CUTS.long.subliminals.at(-1)?.start);
});
