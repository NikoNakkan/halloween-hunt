import { describe, expect, it } from "vitest";
import { codeFromQr } from "./scan-code";

describe("codeFromQr", () => {
  it("reads the code from a hunt link", () => {
    expect(codeFromQr("https://nikonakkan.github.io/halloween-hunt/?c=skia-2fjn")).toBe("skia-2fjn");
  });

  it("returns null for links without a code", () => {
    expect(codeFromQr("https://example.com/menu")).toBeNull();
  });

  it("accepts a bare code", () => {
    expect(codeFromQr("  skia-2fjn ")).toBe("skia-2fjn");
    expect(codeFromQr("   ")).toBeNull();
  });
});
