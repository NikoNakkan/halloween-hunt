// GRANDDAUGHTER quiz player: password, then live rounds driven by the admin through Firebase.
import "../../styles.css";
import "../quiz.css";
import { duckMusic } from "../../audio/music";
import { playThunder, startAmbientThunder } from "../../audio/sfx";
import { playWail } from "../../audio/wail";
import { lightning, runEffect } from "../../effects";
import { serverNow } from "../../sync/db";
import type { Unsubscribe } from "../../sync/types";
import { playTape, stopTape } from "../cinema";
import { roundKey, type Game } from "../logic";
import { createQuizStore, voterId, type QuizStore } from "../store";
import { startTimer, stopTimer } from "../timer";
import { setupEntry } from "./entry";
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
/** Nothing of the game (rounds, scares, the finale tape) runs until the quiz is open
 *  and this phone has tapped for sound. */
let open = false;

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

/** Game id whose finale (tape or ending) is on screen right now, if any. */
let finaleOn = "";

/** A new game while the tape or the ending is up: cut it and bring the night back. */
function leaveFinale(): void {
  finaleOn = "";
  stopTape();
  duckMusic(false);
  startAmbientThunder(lightning);
}

function render(g: Game | null): void {
  game = g;
  if (!open) return; // locked, or sound not on yet: catch up once ready
  if (finaleOn && g?.id !== finaleOn) leaveFinale();
  if (!g || g.phase === "lobby") {
    stopTimer();
    show("lobby");
    return;
  }
  if (finaleDone === g.id) return showEnd(g);
  if (g.phase === "end") {
    // Only the Crypt decides when it's over (players never see how many are left).
    stopTimer();
    void finale(g);
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
    void reveal(g, fresh);
  }
  refreshVotes();
}

/** The cursed tape, once per game, then the ending. */
async function finale(g: Game): Promise<void> {
  if (finaleStarted === g.id) return;
  finaleStarted = g.id;
  finaleOn = g.id;
  stopTimer();
  await playTape();
  if (game?.id !== g.id) return; // cut short by a new game: render() already moved on
  finaleDone = g.id;
  showEnd(game);
}

function showEnd(g: Game): void {
  stopTimer();
  show("end");
  if (endedFor === g.id) return;
  endedFor = g.id;
  // In time with "ΚΟΙΤΑ ΠΙΣΩ ΣΟΥ" flickering in (CSS delay 1 s).
  window.setTimeout(() => {
    if (finaleOn !== g.id) return; // a new game started in the meantime
    lightning();
    void playThunder();
    window.setTimeout(() => finaleOn === g.id && void playWail(0.9), 900);
  }, 1000);
}

function init(): void {
  store = createQuizStore();
  setupEntry(store, (ready) => {
    const was = open;
    open = ready;
    if (open && !was) render(game);
  });
  store.onGame(render);
  store.onEvent((event) => open && runEffect(event));
}

init();
