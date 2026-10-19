// Pure game rules: no DOM, no network. Shared progress is a set of found clue ids.
import { ALL_CLUES, START, type Clue } from "./content";

export type Found = Readonly<Record<string, true>>;

export type ScanResult =
  | { kind: "home" }
  | { kind: "unknown" }
  | { kind: "locked" }
  | { kind: "clue"; clue: Clue; isNew: boolean };

export function findByCode(code: string): Clue | undefined {
  const wanted = code.trim().toLowerCase();
  return ALL_CLUES.find((c) => c.code.toLowerCase() === wanted);
}

/** Decide what a scan shows. Hidden clues stay locked until the start code is found. */
export function resolveScan(code: string | null, found: Found): ScanResult {
  if (!code) return { kind: "home" };
  const clue = findByCode(code);
  if (!clue) return { kind: "unknown" };
  if (clue.id !== START.id && !found[START.id]) return { kind: "locked" };
  return { kind: "clue", clue, isNew: !found[clue.id] };
}

export function foundCount(found: Found): number {
  return ALL_CLUES.filter((c) => found[c.id]).length;
}

export function isComplete(found: Found): boolean {
  return foundCount(found) === ALL_CLUES.length;
}

export const TOTAL = ALL_CLUES.length;
