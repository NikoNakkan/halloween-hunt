import { describe, expect, it } from "vitest";
import { CUTS, FPS, filmTime, shotAt, stareShot, subliminalAt } from "./timeline";

describe.each(Object.entries(CUTS))("%s cut", (_, cut) => {
  it("covers the whole clip without gaps", () => {
    expect(cut.shots[0].start).toBe(0);
    expect(cut.shots[cut.shots.length - 1].end).toBe(cut.duration);
    cut.shots.slice(1).forEach((s, i) => expect(s.start).toBe(cut.shots[i].end));
  });

  it("opens on PLAY and jumps out with the face", () => {
    expect(shotAt(cut, 0.1).kind).toBe("play");
    expect(cut.shots.some((s) => s.kind === "face")).toBe(true);
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
      expect((s.end - s.start) * FPS).toBeLessThanOrEqual(5.01);
      expect(s.end).toBeLessThan(cut.duration);
      expect(subliminalAt(cut, s.start + 0.001)).toBe(s);
    }
  });
});

it("the long cut is 30 seconds with the masked man in it", () => {
  expect(CUTS.long.duration).toBe(30);
  expect(CUTS.long.subliminals.length).toBeGreaterThan(5);
});
