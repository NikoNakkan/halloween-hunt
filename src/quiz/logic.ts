// Pure quiz rules: drawing a game, tallying the team's votes, scoring.
import { QUESTIONS, type Question } from "./questions";

export type Phase = "lobby" | "question" | "reveal" | "end";

/** A drawn question; `order[slot]` is the bank answer index shown in that slot (0 = correct). */
export interface GameQuestion {
  id: string;
  order: number[];
}

export interface RoundResult {
  /** Slot the team picked, or -1 if nobody voted. */
  pick: number;
  correct: boolean;
  counts: number[];
}

export interface Game {
  id: string;
  questions: GameQuestion[];
  index: number;
  phase: Phase;
  /** Server-time ms when voting closes. */
  deadline: number;
  seconds: number;
  /** Slots the admin removed this round, keyed by removedKey(slot). */
  removed?: Record<string, true>;
  /** Results keyed by resultKey(index). Prefixed keys stop Firebase turning these into arrays. */
  results?: Record<string, RoundResult>;
}

export const SLOTS = ["Α", "Β", "Γ", "Δ"] as const;

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function drawGame(count: number, seconds: number, rand = Math.random): Game {
  const picked = shuffle([...QUESTIONS], rand).slice(0, Math.max(1, Math.min(count, QUESTIONS.length)));
  return {
    id: Date.now().toString(36) + Math.floor(rand() * 1e6).toString(36),
    questions: picked.map((q) => ({ id: q.id, order: shuffle([0, 1, 2, 3], rand) })),
    index: 0,
    phase: "lobby",
    deadline: 0,
    seconds,
  };
}

export function questionOf(gq: GameQuestion): Question {
  const q = QUESTIONS.find((x) => x.id === gq.id);
  if (!q) throw new Error(`unknown question ${gq.id}`);
  return q;
}

/** Answer texts in display order. */
export function answersOf(gq: GameQuestion): string[] {
  const q = questionOf(gq);
  return gq.order.map((i) => q.a[i]);
}

export function correctSlot(gq: GameQuestion): number {
  return gq.order.indexOf(0);
}

export const removedKey = (slot: number) => `s${slot}`;
export const resultKey = (index: number) => `r${index}`;

export function isRemoved(game: Game, slot: number): boolean {
  return Boolean(game.removed?.[removedKey(slot)]);
}

export function currentResult(game: Game): RoundResult | undefined {
  return game.results?.[resultKey(game.index)];
}

/** Votes per slot; votes for removed slots don't count. */
export function tally(game: Game, votes: Record<string, number>): number[] {
  const counts = [0, 0, 0, 0];
  for (const slot of Object.values(votes)) {
    if (slot >= 0 && slot < 4 && !isRemoved(game, slot)) counts[slot]++;
  }
  return counts;
}

/** The team's answer: most votes; ties broken at random; -1 when nobody voted. */
export function teamPick(counts: number[], rand = Math.random): number {
  const best = Math.max(...counts);
  if (best === 0) return -1;
  const tied = counts.flatMap((c, i) => (c === best ? [i] : []));
  return tied[Math.floor(rand() * tied.length)];
}

export function resultFor(game: Game, votes: Record<string, number>, rand = Math.random): RoundResult {
  const counts = tally(game, votes);
  const pick = teamPick(counts, rand);
  return { pick, correct: pick === correctSlot(game.questions[game.index]), counts };
}

export function score(game: Game): number {
  return Object.values(game.results ?? {}).filter((r) => r.correct).length;
}

/** Unique id of the current round, so votes never leak between games or questions. */
export function roundKey(game: Game): string {
  return `${game.id}_${game.index}`;
}

export function isLastQuestion(game: Game): boolean {
  return game.index >= game.questions.length - 1;
}
