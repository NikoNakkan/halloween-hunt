// NEPHEW quiz admin: new game, run rounds, remove answers, reveal, scares.
import "../../styles.css";
import "../../admin/admin.css";
import "./crypt.css";
import { requirePin } from "../../admin/gate";
import { mountSoundboard } from "../../admin/soundboard";
import { serverNow } from "../../sync/db";
import type { Unsubscribe } from "../../sync/types";
import {
  answersOf,
  correctSlot,
  currentResult,
  drawGame,
  isLastQuestion,
  isRemoved,
  questionOf,
  removedKey,
  resultFor,
  resultKey,
  roundKey,
  score,
  SLOTS,
  tally,
  type Game,
} from "../logic";
import { createQuizStore, type QuizStore } from "../store";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel) as T;
/** Extra time after the deadline so late votes still land before the reveal. */
const GRACE_MS = 800;

let store: QuizStore;
let game: Game | null = null;
let votes: Record<string, number> = {};
let votesFor = "";
let stopVotes: Unsubscribe | null = null;
let revealing = "";

async function startQuestion(g: Game, index: number): Promise<void> {
  await store.patchGame({ index, phase: "question", deadline: serverNow() + g.seconds * 1000, removed: null });
}

async function revealNow(g: Game): Promise<void> {
  const key = roundKey(g);
  if (revealing === key || currentResult(g)) return;
  revealing = key;
  await store.patchGame({ phase: "reveal", [`results/${resultKey(g.index)}`]: resultFor(g, votes) });
}

async function primaryAction(): Promise<void> {
  if (!game) return;
  if (game.phase === "lobby") await startQuestion(game, 0);
  else if (game.phase === "question") await revealNow(game);
  else if (game.phase === "reveal") {
    if (isLastQuestion(game)) await store.patchGame({ phase: "end" });
    else await startQuestion(game, game.index + 1);
  }
}

function primaryLabel(g: Game | null): string {
  if (!g || g.phase === "end") return "—";
  if (g.phase === "lobby") return "▶ Πρώτη ερώτηση";
  if (g.phase === "question") return "👁 Αποκάλυψη τώρα";
  return isLastQuestion(g) ? "🏁 Τελικό σκορ" : "⏭ Επόμενη ερώτηση";
}

function watchVotes(g: Game): void {
  const key = roundKey(g);
  if (votesFor === key) return;
  votesFor = key;
  stopVotes?.();
  votes = {};
  stopVotes = store.onVotes(key, (v) => {
    votes = v;
    render();
  });
}

function renderAnswers(g: Game): void {
  const gq = g.questions[g.index];
  const counts = tally(g, votes);
  const right = correctSlot(gq);
  const list = $("#live-answers");
  list.replaceChildren(
    ...answersOf(gq).map((text, slot) => {
      const li = document.createElement("li");
      const removed = isRemoved(g, slot);
      li.className = `${slot === right ? "right" : ""} ${removed ? "removed" : ""}`;
      li.innerHTML = `<b>${SLOTS[slot]}</b><span></span><em>${removed ? "—" : counts[slot]}</em>`;
      (li.querySelector("span") as HTMLElement).textContent = `${text}${slot === right ? " ✅" : ""}`;
      if (g.phase === "question" && slot !== right && !removed) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "🗑";
        btn.title = "Βγάλ' την από όλα τα κινητά";
        btn.onclick = () => void store.patchGame({ [`removed/${removedKey(slot)}`]: true });
        li.append(btn);
      }
      return li;
    }),
  );
}

function render(): void {
  const g = game;
  $("#primary").textContent = primaryLabel(g);
  ($("#primary") as HTMLButtonElement).disabled = !g || g.phase === "end";
  if (!g) {
    $("#live-status").textContent = "Κανένα παιχνίδι. Φτιάξε ένα παρακάτω.";
    $("#live-question").textContent = "";
    $("#live-answers").replaceChildren();
    $("#live-votes").textContent = "";
    $("#score-now").textContent = "";
    return;
  }
  $("#score-now").textContent = `Σκορ ${score(g)} / ${g.questions.length}`;
  if (g.phase === "lobby" || g.phase === "end") {
    $("#live-status").textContent = g.phase === "lobby" ? `Αναμονή · ${g.questions.length} ερωτήσεις έτοιμες` : "Τέλος παιχνιδιού";
    $("#live-question").textContent = "";
    $("#live-answers").replaceChildren();
    $("#live-votes").textContent = "";
    return;
  }
  watchVotes(g);
  const left = Math.max(0, Math.ceil((g.deadline - serverNow()) / 1000));
  const result = currentResult(g);
  $("#live-status").textContent =
    g.phase === "question"
      ? `Ερώτηση ${g.index + 1}/${g.questions.length} · ⏳ ${left}s`
      : `Ερώτηση ${g.index + 1}/${g.questions.length} · ${result?.correct ? "✅ Σωστά" : "❌ Λάθος"}`;
  $("#live-question").textContent = questionOf(g.questions[g.index]).q;
  renderAnswers(g);
  $("#live-votes").textContent = `👥 ${Object.keys(votes).length} ψήφοι`;
}

function wire(): void {
  store = createQuizStore();
  store.onGame((g) => {
    game = g;
    render();
  });
  mountSoundboard($("#soundboard"), { send: (e) => store.sendEvent(e) });

  $("#primary").addEventListener("click", () => void primaryAction());
  $("#end-game").addEventListener("click", () => {
    if (game && confirm("Τέλος παιχνιδιού τώρα;")) void store.patchGame({ phase: "end" });
  });
  $("#new-game").addEventListener("submit", (e) => {
    e.preventDefault();
    const running = game && game.phase !== "end" && game.phase !== "lobby";
    if (running && !confirm("Υπάρχει παιχνίδι σε εξέλιξη. Νέο παιχνίδι;")) return;
    const count = Number($<HTMLSelectElement>("#count").value);
    const seconds = Number($<HTMLSelectElement>("#seconds").value);
    void store.setGame(drawGame(count, seconds));
  });

  // Countdown display + automatic reveal when time is up (keep this page open!).
  window.setInterval(() => {
    if (game?.phase !== "question") return;
    if (serverNow() >= game.deadline + GRACE_MS) void revealNow(game);
    else render();
  }, 500);
}

requirePin(wire);
