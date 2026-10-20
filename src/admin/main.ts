// Admin page: PIN, names, soundboard broadcast, live progress, reset, QR sheet.
import "../styles.css";
import "./admin.css";
import { ALL_CLUES } from "../content";
import { FIREBASE_CONFIG } from "../config";
import { createStore, type HuntStore } from "../sync";
import { requirePin } from "./gate";
import { renderQrSheet } from "./qr";
import { mountSoundboard } from "./soundboard";

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

function wire(store: HuntStore): void {
  $("#mode").textContent = FIREBASE_CONFIG ? "🟢 Live" : "🟡 Τοπική δοκιμή";
  mountSoundboard($("#soundboard"), { send: (e) => store.sendEvent(e), name: () => selected });

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

requirePin(async () => wire(await createStore()));
