// The shared "N/5" progress: one candle per clue, lit when anyone finds it.
import { ALL_CLUES, TEXT } from "../content";
import { foundCount, TOTAL, type Found } from "../hunt";

export function renderProgress(root: HTMLElement, found: Found): void {
  const count = foundCount(found);
  root.innerHTML = `
    <p class="progress-label">${TEXT.progressLabel}</p>
    <ol class="candles" aria-label="${count} / ${TOTAL}">
      ${ALL_CLUES.map(
        (c) => `<li class="candle ${found[c.id] ? "lit" : ""}"><span class="flame"></span><span class="wax"></span></li>`,
      ).join("")}
    </ol>
    <div class="bar"><div class="bar-fill" style="width:${(count / TOTAL) * 100}%"></div></div>
    <p class="progress-count"><strong>${count}</strong> / ${TOTAL}</p>`;
}
