// Turn whatever a QR contains into a clue code: our links carry it as ?c=<code>.
export function codeFromQr(text: string): string | null {
  const raw = text.trim();
  if (!raw) return null;
  try {
    return new URL(raw).searchParams.get("c");
  } catch {
    // Not a URL: treat the text itself as the code.
    return raw;
  }
}
