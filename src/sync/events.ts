// Broadcast scares through one database path (each game has its own channel).
import { onValue, push, ref, serverTimestamp, set, type Database } from "firebase/database";
import type { HuntEvent, Unsubscribe } from "./types";

export interface EventChannel {
  onEvent(cb: (event: HuntEvent) => void): Unsubscribe;
  sendEvent(event: Omit<HuntEvent, "id" | "at">): Promise<void>;
}

export function eventChannel(db: Database, path: string): EventChannel {
  return {
    onEvent(cb) {
      // The first value is whatever was sent before this page opened: skip it.
      let primed = false;
      return onValue(ref(db, path), (snap) => {
        const event = snap.val() as HuntEvent | null;
        if (primed && event) cb(event);
        primed = true;
      });
    },
    async sendEvent(event) {
      const id = push(ref(db, "ids")).key ?? String(Date.now());
      // Firebase rejects `undefined` fields, so drop empty optionals.
      const clean = Object.fromEntries(Object.entries(event).filter(([, v]) => v !== undefined));
      await set(ref(db, path), { ...clean, id, at: serverTimestamp() });
    },
  };
}
