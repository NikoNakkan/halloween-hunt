import { describe, expect, it } from "vitest";
import { vcrClock } from "./vhs";

describe("vcrClock", () => {
  it("starts a few seconds before midnight on Halloween", () => {
    expect(vcrClock(0)).toEqual({ date: "ΣΑΒ 31 ΟΚΤ 1987", time: "23:59:41:00" });
    expect(vcrClock(18.5).time).toBe("23:59:59:15");
  });

  it("rolls over into 1 November at 19 s", () => {
    expect(vcrClock(19)).toEqual({ date: "ΚΥΡ 01 ΝΟΕ 1987", time: "00:00:00:00" });
    expect(vcrClock(29.5).time).toBe("00:00:10:15");
  });
});
