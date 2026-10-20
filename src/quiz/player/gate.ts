// The NEPHEW password screen. Also the tap that unlocks sound on phones.
const KEY = "quiz.passed";
const PASSWORD = "NEPHEW";

/**
 * Accept NEPHEW however it's typed, including on a Greek keyboard, where the same
 * keys produce "ΝΕΠΗΕς" (W is final sigma).
 */
export function isPassword(input: string): boolean {
  const greekKeys: Record<string, string> = { Ν: "N", Ε: "E", Π: "P", Η: "H", Σ: "W", Ω: "W" };
  const typed = input
    .trim()
    .toUpperCase()
    .replace(/[ΝΕΠΗΣΩ]/g, (ch) => greekKeys[ch] ?? ch);
  return typed === PASSWORD;
}

export function hasPassed(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberPassed(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Storage blocked: they'll type it again next time.
  }
}
