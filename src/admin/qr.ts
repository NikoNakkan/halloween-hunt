// Printable QR sheet. Links are built from wherever this admin page is hosted,
// so print them from the live GitHub Pages site, not from localhost.
import QRCode from "qrcode";
import { ALL_CLUES } from "../content";

export function clueUrl(code: string, base = location.href): string {
  const url = new URL("./", base);
  url.searchParams.set("c", code);
  return url.toString();
}

export async function renderQrSheet(root: HTMLElement): Promise<void> {
  const cards = await Promise.all(
    ALL_CLUES.map(async (clue, i) => {
      const url = clueUrl(clue.code);
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
      const label = i === 0 ? "ΑΡΧΗ (1)" : `${i + 1}. ${clue.title}`;
      return `<figure class="qr">${svg}<figcaption>${label}<small>${url}</small></figcaption></figure>`;
    }),
  );
  root.innerHTML = cards.join("");
}
