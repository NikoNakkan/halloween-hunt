import { describe, expect, it } from "vitest";
import { DURATION, filmTime, SHOTS, shotAt, type FilmShot } from "./timeline";

describe("timeline", () => {
  it("covers the whole clip without gaps", () => {
    expect(SHOTS[0].start).toBe(0);
    expect(SHOTS[SHOTS.length - 1].end).toBe(DURATION);
    SHOTS.slice(1).forEach((s, i) => expect(s.start).toBe(SHOTS[i].end));
  });

  it("finds the shot playing at a time", () => {
    expect(shotAt(0.1).kind).toBe("play");
    expect(shotAt(7.5).kind).toBe("face");
  });

  it("slows the tape down to a stop", () => {
    const stare = SHOTS.find((s) => s.kind === "film" && s.rate[1] === 0) as FilmShot;
    const len = stare.end - stare.start;
    // Average speed of a 1 → 0 ramp is 0.5.
    expect(filmTime(stare, stare.end)).toBeCloseTo(stare.from + len / 2);
  });
});
