// PIN screen shared by the admin pages: expects #pin-form, #pin, #pin-error and #panel.
import { checkPin, isUnlocked } from "./pin";

export function requirePin(open: () => void | Promise<void>): void {
  const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel) as T;
  const show = () => {
    $("#pin-form").hidden = true;
    $("#panel").hidden = false;
    void open();
  };
  if (isUnlocked()) return show();
  const form = $("#pin-form");
  form.hidden = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (await checkPin($<HTMLInputElement>("#pin").value)) show();
    else $("#pin-error").hidden = false;
  });
}
