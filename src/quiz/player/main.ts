// NEPHEW quiz player: password, then live rounds driven by the admin through Firebase.
import "../../styles.css";
import "../quiz.css";
import { isMuted, setMuted, unlock } from "../../audio/engine";
import { startMusic } from "../../audio/music";
import { playBell, playThunder, startAmbientThunder } from "../../audio/sfx";
import { unlockVoice } from "../../audio/voice";
import { TEXT } from "../../content";
import { lightning, runEffect } from "../../effects";
import { serverNow } from "../../sync/db";
import type { Unsubscribe } from "../../sync/types";
import { primeTape, playTape } from "../cinema";
import { isLastQuestion, roundKey, score, resultKey, type Game } from "../logic";
import { createQuizStore, voterId, type QuizStore } from "../store";
import { startTimer, stopTimer } from "../timer";
import { hasPassed, isPassword, rememberPassed } from "./gate";
import { applyRemovals, buildRound, reveal, showVoteState } from "./round";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel) as T;
const me = voterId();

let store: QuizStore;
let game: Game | null = null;
let votes: Record<string, number> = {};
let votesFor = "";
let stopVotes: Unsubscribe | null = null;
let endedFor = "";
/** Game id whose cursed tape has started / finished on this phone. */
let finaleStarted = "";
let finaleDone = "";

function show(section: "lobby" | "round" | "end"): void {
  for (const id of ["lobby", "round", "end"]) $(`#${id}`).hidden = id !== section;
}

function votingOpen(g: Game): boolean {
  return g.phase === "question" && serverNow() < g.deadline;
}

function refreshVotes(): void {
  if (!game || !["question", "reveal"].includes(game.phase)) return;
  showVoteState(votes[me], Object.keys(votes).length, votingOpen(game));
}

function watchVotes(g: Game): void {
  const key = roundKey(g);
  if (votesFor === key) return;
  votesFor = key;
  stopVotes?.();
  votes = {};
  stopVotes = store.onVotes(key, (v) => {
    votes = v;
    refreshVotes();
  });
}

async function vote(slot: number): Promise<void> {
  if (!game || !votingOpen(game) || votes[me] !== undefined) return;
  votes = { ...votes, [me]: slot }; // optimistic; Firebase confirms or rejects
  refreshVotes();
  await store.vote(roundKey(game), me, slot);
}

function renderScore(g: Game): void {
  $("#score").innerHTML = g.questions
    .map((_, i) => {
      const r = g.results?.[resultKey(i)];
      const cls = r ? (r.correct ? "lit" : "dead") : "";
      return `<li class="${cls}" title="${i + 1}">${r ? (r.correct ? "🕯️" : "💀") : "•"}</li>`;
    })
    .join("");
}

function render(g: Game | null): void {
  game = g;
  if (!g || g.phase === "lobby") {
    stopTimer();
    show("lobby");
    $("#score").innerHTML = "";
    return;
  }
  renderScore(g);
  if (finaleDone === g.id) return showEnd(g);
  if (g.phase === "end") {
    stopTimer();
    void finale(g); // admin ended before the tape ran: play it now
    return;
  }
  show("round");
  watchVotes(g);
  const fresh = buildRound(g, (slot) => void vote(slot));
  if (g.phase === "question") {
    applyRemovals(g);
    startTimer($("#timer"), g.deadline, g.seconds, refreshVotes);
  } else {
    stopTimer();
    // Joining (or reloading) during a reveal shouldn't replay the scare.
    void reveal(g, fresh).then(() => {
      // After the last answer: a breath, then the cursed tape.
      if (isLastQuestion(g) && !fresh) window.setTimeout(() => void finale(g), 2500);
    });
  }
  refreshVotes();
}

/** The cursed tape, once per game, then the ending. */
async function finale(g: Game): Promise<void> {
  if (finaleStarted === g.id) return;
  finaleStarted = g.id;
  stopTimer();
  await playTape();
  finaleDone = g.id;
  showEnd(game?.id === g.id ? game : g);
}

function showEnd(g: Game): void {
  stopTimer();
  show("end");
  renderScore(g);
  $("#end-score").textContent = `${score(g)} / ${g.questions.length}`;
  if (endedFor === g.id) return;
  endedFor = g.id;
  // In time with "ΚΟΙΤΑ ΠΙΣΩ ΣΟΥ" flickering in (CSS delay 2.5 s).
  window.setTimeout(() => {
    lightning();
    void playThunder();
    window.setTimeout(() => playBell(0.7), 900);
  }, 2500);
}

async function enter(): Promise<void> {
  unlockVoice(); // must run synchronously inside the tap for iOS
  primeTape(); // same: lets the finale video play with sound later
  await unlock();
  void startMusic();
  startAmbientThunder(lightning);
  $("#gate").hidden = true;
  $("#stage").hidden = false;
  store = createQuizStore();
  store.onGame(render);
  store.onEvent(runEffect);
}

function init(): void {
  const gate = $<HTMLFormElement>("#gate");
  const input = $<HTMLInputElement>("#password");
  if (hasPassed()) {
    // Already knows the secret: one tap to get back in (and unlock sound).
    input.hidden = true;
    $(".gate .title").textContent = "Καλώς ξαναήρθες…";
  }
  gate.addEventListener("submit", (e) => {
    e.preventDefault();
    if (hasPassed() || isPassword(input.value)) {
      rememberPassed();
      void enter();
      return;
    }
    $("#gate-error").hidden = false;
    gate.animate([{ transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "none" }], {
      duration: 300,
      iterations: 2,
    });
    void unlock().then(() => playThunder(0.7));
  });

  const mute = $<HTMLButtonElement>("#mute");
  const label = () => (mute.textContent = isMuted() ? TEXT.muteOn : TEXT.muteOff);
  label();
  mute.addEventListener("click", () => {
    setMuted(!isMuted());
    label();
  });
}

init();
