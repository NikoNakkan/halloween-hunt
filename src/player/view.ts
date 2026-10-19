// What the main card says for each scan outcome.
import { TEXT } from "../content";
import type { ScanResult } from "../hunt";

export interface CardContent {
  title: string;
  text: string;
  badge?: string;
  tone: "clue" | "locked" | "info";
}

export function cardFor(result: ScanResult, started: boolean): CardContent {
  switch (result.kind) {
    case "home":
      return { title: TEXT.homeTitle, text: started ? TEXT.homeText : TEXT.notStarted, tone: "info" };
    case "unknown":
      return { title: TEXT.unknownTitle, text: TEXT.unknownText, tone: "locked" };
    case "locked":
      return { title: TEXT.lockedTitle, text: TEXT.lockedText, tone: "locked" };
    case "clue":
      return {
        title: result.clue.title,
        text: result.clue.text,
        badge: result.isNew ? TEXT.newFind : TEXT.alreadyFound,
        tone: "clue",
      };
  }
}

let typing = 0;

/** Reveal text letter by letter; tapping the card shows it all at once. */
export function typeText(el: HTMLElement, text: string, msPerChar = 35): void {
  const run = ++typing;
  el.textContent = "";
  let i = 0;
  const finish = () => {
    if (run === typing) el.textContent = text;
    i = text.length;
  };
  el.addEventListener("click", finish, { once: true });
  const step = () => {
    if (run !== typing || i >= text.length) return;
    el.textContent = text.slice(0, ++i);
    window.setTimeout(step, text[i - 1] === "\n" ? msPerChar * 8 : msPerChar);
  };
  step();
}
