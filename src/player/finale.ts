// The hunt's ending, shown on every phone at once when the last code is found:
// only the quiz password, nothing else.
import { TEXT } from "../content";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel) as T;

export function renderFinale(): void {
  $("#code-label").textContent = TEXT.codeLabel;
  $("#code-word").textContent = TEXT.code;
}

/** Switch this phone between the hunt and the finale (which hides everything else). */
export function showFinale(done: boolean): void {
  $("#done").hidden = !done;
  $("#card").hidden = done;
  $("#progress").hidden = done;
  const scan = document.querySelector<HTMLButtonElement>("#scan");
  if (scan && scan.textContent) scan.hidden = done; // only once the hunt has started
}
