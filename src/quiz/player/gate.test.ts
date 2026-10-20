import { describe, expect, it } from "vitest";
import { isPassword } from "./gate";

describe("isPassword", () => {
  it("accepts NEPHEW in any case and with spaces", () => {
    expect(isPassword("NEPHEW")).toBe(true);
    expect(isPassword(" nephew ")).toBe(true);
  });

  it("accepts the same keys typed on a Greek keyboard", () => {
    expect(isPassword("ΝΕΠΗΕς")).toBe(true);
    expect(isPassword("νεπηες")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isPassword("NEPHE")).toBe(false);
    expect(isPassword("GRANDMA")).toBe(false);
  });
});
