// Live quiz state on Firebase. Layout:
//   /quiz/game                  = the current Game (written by the admin)
//   /quiz/votes/<round>/<voter> = slot 0–3; rules allow each voter one write per round
//   /quiz/event                 = quiz-only scare channel
//   /quiz/unlocked              = true once anyone typed the password (opens every phone)
import { onValue, ref, set, update } from "firebase/database";
import { FIREBASE_CONFIG } from "../config";
import { database } from "../sync/db";
import { eventChannel, type EventChannel } from "../sync/events";
import type { Unsubscribe } from "../sync/types";
import type { Game } from "./logic";

export interface QuizStore extends EventChannel {
  onGame(cb: (game: Game | null) => void): Unsubscribe;
  setGame(game: Game): Promise<void>;
  /** Partial update; keys may be paths like "removed/s2". */
  patchGame(changes: Record<string, unknown>): Promise<void>;
  onVotes(round: string, cb: (votes: Record<string, number>) => void): Unsubscribe;
  /** Cast this device's vote; false if it already voted this round. */
  vote(round: string, voter: string, slot: number): Promise<boolean>;
  /** Shared password state: one correct password opens the quiz on every phone. */
  onUnlocked(cb: (unlocked: boolean) => void): Unsubscribe;
  setUnlocked(unlocked: boolean): Promise<void>;
}

export function createQuizStore(): QuizStore {
  if (!FIREBASE_CONFIG) throw new Error("The quiz needs FIREBASE_CONFIG in src/config.ts");
  const db = database(FIREBASE_CONFIG);

  return {
    ...eventChannel(db, "quiz/event"),
    onGame(cb) {
      return onValue(ref(db, "quiz/game"), (snap) => cb((snap.val() as Game | null) ?? null));
    },
    async setGame(game) {
      await set(ref(db, "quiz/game"), game);
    },
    async patchGame(changes) {
      await update(ref(db, "quiz/game"), changes);
    },
    onVotes(round, cb) {
      return onValue(ref(db, `quiz/votes/${round}`), (snap) =>
        cb((snap.val() as Record<string, number> | null) ?? {}),
      );
    },
    onUnlocked(cb) {
      return onValue(ref(db, "quiz/unlocked"), (snap) => cb(snap.val() === true));
    },
    async setUnlocked(unlocked) {
      await set(ref(db, "quiz/unlocked"), unlocked);
    },
    async vote(round, voter, slot) {
      try {
        await set(ref(db, `quiz/votes/${round}/${voter}`), slot);
        return true;
      } catch {
        return false; // rules reject a second vote from the same device
      }
    },
  };
}

/** Stable id for this phone, so a refresh can't vote again. */
export function voterId(): string {
  const KEY = "quiz.voter";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  }
}
