import { describe, expect, it } from "vitest";
import { greekCaps } from "./effects";

describe("greekCaps", () => {
  it("uppercases Greek names without accents", () => {
    expect(greekCaps("Νίκος")).toBe("ΝΙΚΟΣ");
    expect(greekCaps("Μαρία")).toBe("ΜΑΡΙΑ");
  });
});
