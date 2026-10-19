// Stand-in store for development: localStorage + BroadcastChannel.
// Only syncs tabs of the same browser, which is enough to test without Firebase.
import type { Found } from "../hunt";
import type { HuntEvent, HuntStore, Unsubscribe } from "./types";

const KEY_FOUND = "hunt.found";
const KEY_NAMES = "hunt.names";

type Message = { type: "found" } | { type: "names" } | { type: "event"; event: HuntEvent };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked (private mode): the session still works in memory.
  }
}

export function createLocalStore(): HuntStore {
  const channel = new BroadcastChannel("hunt");
  const listeners = new Set<(m: Message) => void>();
  // BroadcastChannel skips the sender, so deliver to this tab's listeners too.
  const emit = (m: Message) => {
    channel.postMessage(m);
    listeners.forEach((l) => l(m));
  };
  channel.onmessage = (e: MessageEvent<Message>) => listeners.forEach((l) => l(e.data));

  const listen = (fn: (m: Message) => void): Unsubscribe => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  return {
    onFound(cb) {
      cb(read<Found>(KEY_FOUND, {}));
      return listen((m) => m.type === "found" && cb(read<Found>(KEY_FOUND, {})));
    },
    async markFound(clueId) {
      write(KEY_FOUND, { ...read<Found>(KEY_FOUND, {}), [clueId]: true });
      emit({ type: "found" });
    },
    onEvent(cb) {
      return listen((m) => m.type === "event" && cb(m.event));
    },
    async sendEvent(event) {
      emit({ type: "event", event: { ...event, id: crypto.randomUUID(), at: Date.now() } });
    },
    async reset() {
      write(KEY_FOUND, {});
      emit({ type: "found" });
    },
    onNames(cb) {
      cb(read<string[]>(KEY_NAMES, []));
      return listen((m) => m.type === "names" && cb(read<string[]>(KEY_NAMES, [])));
    },
    async setNames(names) {
      write(KEY_NAMES, names);
      emit({ type: "names" });
    },
  };
}
