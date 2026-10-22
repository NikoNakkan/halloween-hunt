// Player page: tap-to-enter gate, then the scanned clue, live shared progress and scares.
import "../styles.css";
import { isMuted, setMuted, unlock } from "../audio/engine";
import { startMusic } from "../audio/music";
import { startAmbientThunder } from "../audio/sfx";
import { playWail } from "../audio/wail";
import { unlockVoice } from "../audio/voice";
import { START, TEXT } from "../content";
import { lightning, runEffect } from "../effects";
import { startSpooky } from "../spooky";
import { isComplete, resolveScan, type Found } from "../hunt";
import { createStore, type HuntStore } from "../sync";
import { renderFinale, showFinale } from "./finale";
import { renderProgress } from "./progress";
import { codeFromQr } from "./scan-code";
import { scanQr } from "./scanner";
import { cardFor, typeText } from "./view";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel) as T;

const storePromise = createStore();
let latest: Found = {};

function firstFound(store: HuntStore): Promise<Found> {
  return new Promise((resolve) => {
    const stop = store.onFound((found) => {
      queueMicrotask(() => stop());
      resolve(found);
    });
  });
}

function showCard(code: string | null, found: Found): void {
  const result = resolveScan(code, found);
  const card = cardFor(result, Boolean(found[START.id]));
  const el = $("#card");
  el.className = `card tone-${card.tone}`;
  $("#card-title").textContent = card.title;
  const badge = $("#card-badge");
  badge.hidden = !card.badge;
  badge.textContent = card.badge ?? "";
  typeText($("#card-text"), card.text);
}

function showProgress(found: Found, wasComplete: boolean): void {
  renderProgress($("#progress"), found);
  const done = isComplete(found);
  showFinale(done); // shared: whoever finds the last code, every phone switches
  if (done && !wasComplete) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    void playWail();
    lightning();
  }
}

async function enter(): Promise<void> {
  unlockVoice(); // must run synchronously inside the tap for iOS
  await unlock();
  void startMusic();
  startAmbientThunder(lightning);
  startSpooky();
  $("#gate").hidden = true;
  $("#hunt").hidden = false;

  const store = await storePromise;
  latest = await firstFound(store);
  await openCode(store, new URLSearchParams(location.search).get("c"));

  let complete = isComplete(latest);
  store.onFound((found) => {
    latest = found;
    showProgress(found, complete);
    complete = isComplete(found);
  });
  store.onEvent(runEffect);

  const scanBtn = $<HTMLButtonElement>("#scan");
  scanBtn.textContent = TEXT.scanButton;
  scanBtn.hidden = isComplete(latest);
  scanBtn.addEventListener("click", () => void scanInApp(store));
}

/** Show a clue (from the URL or the in-app scanner) and count it if it's new. */
async function openCode(store: HuntStore, code: string | null): Promise<void> {
  const result = resolveScan(code, latest);
  showCard(code, latest);
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (result.kind === "clue" && result.isNew) await store.markFound(result.clue.id);
  if (result.kind === "clue" && result.clue.id === START.id) {
    window.setTimeout(() => void playWail(0.7), 1200);
  }
}

async function scanInApp(store: HuntStore): Promise<void> {
  const text = await scanQr();
  if (text === null) return;
  // A QR that isn't one of ours still lands on the "unknown" card.
  const code = codeFromQr(text) ?? text;
  const url = new URL(location.href);
  url.searchParams.set("c", code);
  history.replaceState(null, "", url);
  await openCode(store, code);
}

function init(): void {
  $("#gate-title").textContent = TEXT.enterTitle;
  $("#gate-hint").textContent = TEXT.enterHint;
  renderFinale();
  const enterBtn = $<HTMLButtonElement>("#enter");
  enterBtn.textContent = TEXT.enterButton;
  enterBtn.addEventListener("click", () => void enter(), { once: true });

  const mute = $<HTMLButtonElement>("#mute");
  const label = () => (mute.textContent = isMuted() ? TEXT.muteOn : TEXT.muteOff);
  label();
  mute.addEventListener("click", () => {
    setMuted(!isMuted());
    label();
  });
}

init();
