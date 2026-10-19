// Admin page: PIN, names, soundboard broadcast, live progress, reset, QR sheet.
import "../styles.css";
import "./admin.css";
import { unlock } from "../audio/engine";
import { ALL_CLUES } from "../content";
import { runEffect } from "../effects";
import { FIREBASE_CONFIG } from "../config";
import { createStore, type EffectKind, type HuntStore } from "../sync";
import { checkPin, isUnlocked } from "./pin";
import { renderQrSheet } from "./qr";
import { clipFor, wireVoicePanel } from "./voice-panel";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel) as T;

let names: string[] = [];
let selected: string | null = null;

function renderNames(store: HuntStore): void {
  const root = $("#names");
  root.replaceChildren(
    ...names.map((name) => {
      const chip = document.createElement("span");
      chip.className = `chip ${name === selected ? "on" : ""}`;
      const pick = document.createElement("button");
      pick.type = "button";
      pick.textContent = name;
      pick.onclick = () => {
        selected = selected === name ? null : name;
        renderNames(store);
      };
      const del = document.createElement("button");
      del.type = "button";
      del.className = "del";
      del.textContent = "×";
      del.ariaLabel = `Διαγραφή ${name}`;
      del.onclick = () => {
        if (selected === name) selected = null;
        void store.setNames(names.filter((n) => n !== name));
      };
      chip.append(pick, del);
      return chip;
    }),
  );
}

async function fire(store: HuntStore, kind: EffectKind, text?: string): Promise<void> {
  const audio = kind === "speak" && text ? await clipFor(text) : undefined;
  const event = { kind, name: selected ?? undefined, text, audio };
  if ($<HTMLInputElement>("#preview").checked) {
    await unlock();
    runEffect(event);
  }
  await store.sendEvent(event);
  $("#sent").textContent = `Στάλθηκε: ${kind}${selected ? ` → ${selected}` : ""} (${new Date().toLocaleTimeString("el-GR")})`;
}

function wire(store: HuntStore): void {
  $("#mode").textContent = FIREBASE_CONFIG ? "🟢 Live" : "🟡 Τοπική δοκιμή";
  wireVoicePanel();

  store.onNames((list) => {
    names = list;
    renderNames(store);
  });
  $("#name-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>("#name-input");
    const name = input.value.trim();
    if (name && !names.includes(name)) void store.setNames([...names, name]);
    input.value = "";
  });

  document.querySelectorAll<HTMLButtonElement>(".fx-btn").forEach((btn) => {
    btn.addEventListener("click", () => void fire(store, btn.dataset.kind as EffectKind));
  });
  $("#msg-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>("#msg-input");
    if (!input.value.trim()) return;
    // "Στείλε" shows the text; "Μίλα" also has grandma say it out loud.
    const button = (e as SubmitEvent).submitter as HTMLButtonElement | null;
    const kind: EffectKind = button?.value === "speak" ? "speak" : "message";
    void fire(store, kind, input.value.trim());
    input.value = "";
  });

  store.onFound((found) => {
    $("#found").innerHTML = ALL_CLUES.map(
      (c, i) => `<li class="${found[c.id] ? "yes" : ""}">${found[c.id] ? "🕯️" : "▫️"} ${i + 1}. ${c.title}</li>`,
    ).join("");
  });
  $("#reset").addEventListener("click", () => {
    if (confirm("Σίγουρα; Η πρόοδος θα μηδενιστεί για όλους.")) void store.reset();
  });

  void renderQrSheet($("#qr-sheet"));
  $("#print").addEventListener("click", () => window.print());
}

async function open(): Promise<void> {
  $("#pin-form").hidden = true;
  $("#panel").hidden = false;
  wire(await createStore());
}

function init(): void {
  if (isUnlocked()) {
    void open();
    return;
  }
  const form = $("#pin-form");
  form.hidden = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (await checkPin($<HTMLInputElement>("#pin").value)) await open();
    else $("#pin-error").hidden = false;
  });
}

init();
