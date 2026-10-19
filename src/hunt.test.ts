import { describe, expect, it } from "vitest";
import { ALL_CLUES, CLUES, START } from "./content";
import { foundCount, isComplete, resolveScan, TOTAL } from "./hunt";

const hidden = CLUES[0];

describe("resolveScan", () => {
  it("shows home without a code", () => {
    expect(resolveScan(null, {})).toEqual({ kind: "home" });
  });

  it("rejects unknown codes", () => {
    expect(resolveScan("nope", {})).toEqual({ kind: "unknown" });
  });

  it("locks hidden clues until the start is found", () => {
    expect(resolveScan(hidden.code, {})).toEqual({ kind: "locked" });
  });

  it("opens the start clue any time", () => {
    expect(resolveScan(START.code, {})).toEqual({ kind: "clue", clue: START, isNew: true });
  });

  it("opens hidden clues after the start, case-insensitively", () => {
    const r = resolveScan(` ${hidden.code.toUpperCase()} `, { start: true });
    expect(r).toEqual({ kind: "clue", clue: hidden, isNew: true });
  });

  it("marks rescans as not new", () => {
    const r = resolveScan(hidden.code, { start: true, [hidden.id]: true });
    expect(r).toMatchObject({ kind: "clue", isNew: false });
  });
});

describe("progress", () => {
  it("has five clues with unique codes", () => {
    expect(TOTAL).toBe(5);
    expect(new Set(ALL_CLUES.map((c) => c.code)).size).toBe(5);
  });

  it("counts only known clues and detects completion", () => {
    expect(foundCount({ start: true, bogus: true })).toBe(1);
    const all = Object.fromEntries(ALL_CLUES.map((c) => [c.id, true as const]));
    expect(isComplete(all)).toBe(true);
  });
});
