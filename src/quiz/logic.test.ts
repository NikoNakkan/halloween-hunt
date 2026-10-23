import { describe, expect, it } from "vitest";
import { answersOf, correctSlot, drawGame, extraQuestion, resultFor, score, tally, teamPick, type Game } from "./logic";
import { QUESTIONS } from "./questions";
import { rng } from "../random";

const game = (over: Partial<Game> = {}): Game => ({ ...drawGame(3, 60, rng(42)), ...over });

describe("question bank", () => {
  it("has unique ids and four distinct answers each", () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const q of QUESTIONS) expect(new Set(q.a).size).toBe(4);
  });
});

describe("drawGame", () => {
  it("draws the requested number of distinct questions with shuffled answers", () => {
    const g = drawGame(10, 60, rng(1));
    expect(g.questions).toHaveLength(10);
    expect(new Set(g.questions.map((q) => q.id)).size).toBe(10);
    for (const q of g.questions) expect([...q.order].sort()).toEqual([0, 1, 2, 3]);
  });

  it("clamps the count to the bank size", () => {
    expect(drawGame(999, 60).questions).toHaveLength(QUESTIONS.length);
  });

  it("shows the correct answer at the correct slot", () => {
    const gq = game().questions[0];
    const bank = QUESTIONS.find((q) => q.id === gq.id);
    expect(answersOf(gq)[correctSlot(gq)]).toBe(bank?.a[0]);
  });
});

describe("extraQuestion", () => {
  it("adds a question the game hasn't used yet", () => {
    const g = drawGame(5, 60, rng(3));
    const extra = extraQuestion(g, rng(9));
    expect(extra).not.toBeNull();
    expect(g.questions.map((q) => q.id)).not.toContain(extra?.id);
    expect([...(extra?.order ?? [])].sort()).toEqual([0, 1, 2, 3]);
  });

  it("returns null once every question has been used", () => {
    expect(extraQuestion(drawGame(999, 60))).toBeNull();
  });
});

describe("voting", () => {
  it("ignores votes for removed answers", () => {
    const g = game({ removed: { s2: true } });
    expect(tally(g, { a: 2, b: 2, c: 0 })).toEqual([1, 0, 0, 0]);
  });

  it("picks the majority, and -1 when nobody voted", () => {
    expect(teamPick([0, 3, 1, 0])).toBe(1);
    expect(teamPick([0, 0, 0, 0])).toBe(-1);
  });

  it("breaks ties among the tied answers only", () => {
    for (let i = 0; i < 20; i++) expect([0, 2]).toContain(teamPick([2, 0, 2, 1]));
  });

  it("scores rounds whose team pick was correct", () => {
    const g = game();
    const right = correctSlot(g.questions[0]);
    const r = resultFor(g, { a: right, b: right, c: (right + 1) % 4 });
    expect(r.correct).toBe(true);
    expect(score({ ...g, results: { r0: r, r1: { pick: -1, correct: false, counts: [0, 0, 0, 0] } } })).toBe(1);
  });
});
