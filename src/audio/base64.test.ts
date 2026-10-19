import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64 } from "./base64";

describe("base64", () => {
  it("round-trips binary data larger than one chunk", () => {
    const bytes = new Uint8Array(100_000).map((_, i) => (i * 31) % 256);
    const back = new Uint8Array(base64ToBytes(bytesToBase64(bytes.buffer)));
    expect(back).toEqual(bytes);
  });
});
