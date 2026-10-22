// The GRANDDAUGHTER password check. Whether the quiz is open is shared state (see entry.ts).

/** What players may type: the English word (also the common one-D spelling) or the Greek one the hunt reveals. */
const PASSWORDS = ["GRANDDAUGHTER", "GRANDAUGHTER", "ΕΓΓΟΝΗ"];

/** Case-, space- and accent-insensitive: "εγγονή", " Granddaughter " and "ΕΓΓΟΝΉ" all count. */
export function isPassword(input: string): boolean {
  const typed = input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "")
    .toUpperCase();
  return PASSWORDS.includes(typed);
}
