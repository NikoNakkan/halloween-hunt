// One Firebase app per page, shared by every store that needs the database.
import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getDatabase, onValue, ref, type Database } from "firebase/database";

let db: Database | null = null;
let offset = 0;

export function database(config: FirebaseOptions): Database {
  if (!db) {
    db = getDatabase(initializeApp(config));
    // Difference between this device's clock and Firebase's, for shared timers.
    onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
      offset = Number(snap.val()) || 0;
    });
  }
  return db;
}

/** Current time on the Firebase server clock (ms). */
export function serverNow(): number {
  return Date.now() + offset;
}
