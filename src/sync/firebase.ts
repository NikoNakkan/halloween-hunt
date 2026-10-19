// Live store on Firebase Realtime Database. Layout:
//   /found/<clueId> = server timestamp of the first scan
//   /event          = last broadcast scare (overwritten each time)
//   /names          = admin's list of player names
import { initializeApp, type FirebaseOptions } from "firebase/app";
import {
  getDatabase,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
} from "firebase/database";
import type { HuntEvent, HuntStore } from "./types";

export function createFirebaseStore(config: FirebaseOptions): HuntStore {
  const db = getDatabase(initializeApp(config));

  return {
    onFound(cb) {
      return onValue(ref(db, "found"), (snap) => {
        const raw = (snap.val() ?? {}) as Record<string, unknown>;
        cb(Object.fromEntries(Object.keys(raw).map((k) => [k, true as const])));
      });
    },
    async markFound(clueId) {
      // Transaction keeps the first finder's timestamp; rescans change nothing.
      await runTransaction(ref(db, `found/${clueId}`), (cur: unknown) =>
        cur ?? serverTimestamp(),
      );
    },
    onEvent(cb) {
      // The first value is whatever was sent before this page opened: skip it.
      let primed = false;
      return onValue(ref(db, "event"), (snap) => {
        const event = snap.val() as HuntEvent | null;
        if (primed && event) cb(event);
        primed = true;
      });
    },
    async sendEvent(event) {
      const id = push(ref(db, "ids")).key ?? String(Date.now());
      // Firebase rejects `undefined` fields, so drop empty optionals.
      const clean = Object.fromEntries(Object.entries(event).filter(([, v]) => v !== undefined));
      await set(ref(db, "event"), { ...clean, id, at: serverTimestamp() });
    },
    async reset() {
      await remove(ref(db, "found"));
    },
    onNames(cb) {
      return onValue(ref(db, "names"), (snap) => cb((snap.val() as string[] | null) ?? []));
    },
    async setNames(names) {
      await set(ref(db, "names"), names);
    },
  };
}
