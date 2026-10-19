import type { Found } from "../hunt";

export type EffectKind = "scream" | "thunder" | "laugh" | "message";

/** A scare the admin broadcasts to every phone. */
export interface HuntEvent {
  id: string;
  kind: EffectKind;
  name?: string;
  text?: string;
  at: number;
}

export type Unsubscribe = () => void;

/** Shared state for the whole group: found clues + broadcast scares. */
export interface HuntStore {
  onFound(cb: (found: Found) => void): Unsubscribe;
  markFound(clueId: string): Promise<void>;
  onEvent(cb: (event: HuntEvent) => void): Unsubscribe;
  sendEvent(event: Omit<HuntEvent, "id" | "at">): Promise<void>;
  reset(): Promise<void>;
  /** Names the admin set up; shared so any admin device sees them. */
  onNames(cb: (names: string[]) => void): Unsubscribe;
  setNames(names: string[]): Promise<void>;
}
