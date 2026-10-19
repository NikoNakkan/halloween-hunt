import { FIREBASE_CONFIG } from "../config";
import { createLocalStore } from "./local";
import type { HuntStore } from "./types";

/** Firebase when configured, otherwise the local stand-in. */
export async function createStore(): Promise<HuntStore> {
  if (!FIREBASE_CONFIG) return createLocalStore();
  // Loaded lazily so the local build doesn't pull in the Firebase SDK.
  const { createFirebaseStore } = await import("./firebase");
  return createFirebaseStore(FIREBASE_CONFIG);
}

export type { EffectKind, HuntEvent, HuntStore } from "./types";
