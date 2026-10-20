// One question on a player's screen: answers, voting, removals and the reveal.
import { playBell } from "../../audio/sfx";
import { runEffect } from "../../effects";
import { clawAway, goneQuietly, wait } from "../anim";
import { answersOf, correctSlot, currentResult, isRemoved, questionOf, roundKey, SLOTS, type Game } from "../logic";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel) as T;

let builtFor = "";
let revealedFor = "";

function answerButtons(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>("#answers .answer")];
}

/** Build the question and its four answers (once per round). Returns true if newly built. */
export function buildRound(game: Game, onVote: (slot: number) => void): boolean {
  const key = roundKey(game);
  if (builtFor === key) return false;
  builtFor = key;
  const gq = game.questions[game.index];
  $("#q-meta").textContent = `Ερώτηση ${game.index + 1} / ${game.questions.length}`;
  $("#q-text").textContent = questionOf(gq).q;
  $("#banner").hidden = true;
  $("#round").classList.remove("revealed");
  const list = $("#answers");
  list.replaceChildren(
    ...answersOf(gq).map((text, slot) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer";
      btn.dataset.slot = String(slot);
      btn.innerHTML = `<span class="letter">${SLOTS[slot]}</span><span class="text"></span><span class="count"></span><span class="fill"></span>`;
      (btn.querySelector(".text") as HTMLElement).textContent = text;
      btn.addEventListener("click", () => onVote(slot));
      if (isRemoved(game, slot)) goneQuietly(btn);
      return btn;
    }),
  );
  return true;
}

/** Animate answers the admin removed since the last update. */
export function applyRemovals(game: Game): void {
  for (const btn of answerButtons()) {
    if (isRemoved(game, Number(btn.dataset.slot))) void clawAway(btn);
  }
}

/** Show this device's vote and lock the buttons once it has voted or time is up. */
export function showVoteState(myVote: number | undefined, total: number, open: boolean): void {
  for (const btn of answerButtons()) {
    btn.classList.toggle("mine", Number(btn.dataset.slot) === myVote);
    btn.disabled = !open || myVote !== undefined;
  }
  const mine = myVote === undefined ? (open ? "Διάλεξε απάντηση…" : "Δεν ψήφισες.") : `Ψήφισες ${SLOTS[myVote]}`;
  $("#vote-status").textContent = `👥 ${total} ${total === 1 ? "ψήφος" : "ψήφοι"} · ${mine}`;
}

/** The reveal: vote bars, team pick, wrong answers clawed away, verdict, maybe a scare. */
export async function reveal(game: Game, quiet: boolean): Promise<void> {
  const key = roundKey(game);
  const result = currentResult(game);
  if (!result || revealedFor === key) return;
  revealedFor = key;
  const right = correctSlot(game.questions[game.index]);
  const total = result.counts.reduce((a, b) => a + b, 0) || 1;
  // The admin may start the next question mid-animation: from then on this reveal
  // must not touch the screen (the new question owns it).
  const stale = () => builtFor !== key;
  const buttons = answerButtons();
  $("#round").classList.add("revealed");
  for (const btn of buttons) {
    const slot = Number(btn.dataset.slot);
    btn.disabled = true;
    (btn.querySelector(".count") as HTMLElement).textContent = String(result.counts[slot]);
    (btn.querySelector(".fill") as HTMLElement).style.transform = `scaleX(${result.counts[slot] / total})`;
    btn.classList.toggle("team-pick", slot === result.pick);
  }
  const banner = $("#banner");
  if (quiet) {
    // Joined mid-reveal: show the outcome without replaying the drama.
    buttons.forEach((b) => Number(b.dataset.slot) !== right && goneQuietly(b));
    buttons[right]?.classList.add("correct");
  } else {
    await wait(1600);
    for (const btn of buttons) {
      if (stale()) return;
      if (Number(btn.dataset.slot) === right || btn.hidden) continue;
      void clawAway(btn);
      await wait(550);
    }
    await wait(700);
    if (stale()) return;
    buttons[right]?.classList.add("correct");
  }
  banner.className = `banner ${result.correct ? "win" : "lose"}`;
  banner.textContent = result.correct
    ? "ΣΩΣΤΑ! Ένα κερί ανάβει… 🕯️"
    : result.pick < 0
      ? "Καμία ψήφος; Η γιαγιά δεν συγχωρεί…"
      : `ΛΑΘΟΣ! Η ομάδα διάλεξε ${SLOTS[result.pick]}…`;
  banner.hidden = false;
  if (quiet) return;
  if (result.correct) playBell();
  else {
    await wait(900);
    if (!stale()) runEffect({ kind: "scream" });
  }
}
