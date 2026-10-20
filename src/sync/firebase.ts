// Live hunt store on Firebase Realtime Database. Layout:
//   /found/<clueId> = server timestamp of the first scan
//   /event          = last broadcast scare (overwritten each time)
//   /names          = admin's list of player names
import type { FirebaseOptions } from "firebase/app";
import { onValue, ref, remove, runTransaction, serverTimestamp, set } from "firebase/database";
import { database } from "./db";
import { eventChannel } from "./events";
import type { HuntStore } from "./types";

export function createFirebaseStore(config: FirebaseOptions): HuntStore {
  const db = database(config);

  return {
    ...eventChannel(db, "event"),
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
