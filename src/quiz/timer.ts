// Countdown shared by every phone: driven by the server-clock deadline, not local time.
import { serverNow } from "../sync/db";
import { tick } from "./anim";

let frame = 0;
let lastSecond = -1;

export function stopTimer(): void {
  cancelAnimationFrame(frame);
  frame = 0;
}

export function startTimer(root: HTMLElement, deadline: number, seconds: number, onZero: () => void): void {
  stopTimer();
  const bar = root.querySelector(".timer-bar") as HTMLElement;
  const num = root.querySelector(".timer-num") as HTMLElement;
  const step = () => {
    const left = Math.max(0, deadline - serverNow());
    const secs = Math.ceil(left / 1000);
    bar.style.transform = `scaleX(${left / (seconds * 1000)})`;
    num.textContent = String(secs);
    root.classList.toggle("urgent", secs <= 10);
    if (secs !== lastSecond && secs > 0 && secs <= 10) tick(secs <= 3);
    lastSecond = secs;
    if (left <= 0) {
      frame = 0;
      onZero();
      return;
    }
    frame = requestAnimationFrame(step);
  };
  step();
}
