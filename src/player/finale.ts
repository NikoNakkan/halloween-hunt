// The hunt's ending, shown on every phone at once when the last code is found:
// all five clues, then the password for the quiz.
import { ALL_CLUES, TEXT } from "../content";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel) as T;

export function renderFinale(): void {
  $("#done-title").textContent = TEXT.doneTitle;
  $("#done-text").textContent = TEXT.doneText;
  $("#done-clues").replaceChildren(
    ...ALL_CLUES.map((clue) => {
      const li = document.createElement("li");
      const h = document.createElement("h3");
      h.textContent = clue.title;
      const p = document.createElement("p");
      p.textContent = clue.text;
      li.append(h, p);
      return li;
    }),
  );
  $("#code-intro").textContent = TEXT.codeIntro;
  $("#code-label").textContent = TEXT.codeLabel;
  $("#code-word").textContent = TEXT.code;
}

/** Switch this phone between the hunt (card + scan) and the shared finale. */
export function showFinale(done: boolean): void {
  $("#done").hidden = !done;
  $("#card").hidden = done;
  const scan = document.querySelector<HTMLButtonElement>("#scan");
  if (scan && scan.textContent) scan.hidden = done; // only once the hunt has started
}
