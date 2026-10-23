import { describe, expect, it } from "vitest";
import { rng } from "../random";
import { parseRadioPick, RADIO_CLIPS, randomRadioPick } from "./radio";

describe("radio picks", () => {
  it("picks a known record and a start that leaves room to play", () => {
    const rand = rng(5);
    for (let i = 0; i < 50; i++) {
      const { clip, from } = parseRadioPick(randomRadioPick(rand));
      expect(RADIO_CLIPS).toContain(clip);
      expect(from).toBeGreaterThanOrEqual(0);
      expect(from).toBeLessThanOrEqual(17);
    }
  });

  it("falls back safely on a missing or odd pick", () => {
    expect(parseRadioPick(undefined)).toEqual({ clip: "radio-1", from: 0 });
    expect(parseRadioPick("evil@x")).toEqual({ clip: "radio-1", from: 0 });
  });
});
