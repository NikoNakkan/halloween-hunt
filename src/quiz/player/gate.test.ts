import { describe, expect, it } from "vitest";
import { isPassword } from "./gate";

describe("isPassword", () => {
  it("accepts GRANDDAUGHTER in any case, with spaces, and the one-D spelling", () => {
    expect(isPassword("GRANDDAUGHTER")).toBe(true);
    expect(isPassword(" granddaughter ")).toBe(true);
    expect(isPassword("Grandaughter")).toBe(true);
  });

  it("accepts the Greek word the hunt reveals, with or without accents", () => {
    expect(isPassword("εγγονή")).toBe(true);
    expect(isPassword("ΕΓΓΟΝΗ")).toBe(true);
    expect(isPassword("Εγγονη ")).toBe(true);
  });

  it("rejects anything else, including the old password", () => {
    expect(isPassword("NEPHEW")).toBe(false);
    expect(isPassword("GRANDMA")).toBe(false);
    expect(isPassword("εγγονός")).toBe(false);
  });
});
