import { describe, expect, it } from "vitest";
import { clueUrl } from "./qr";

describe("clueUrl", () => {
  it("points at the player page next to the admin page", () => {
    expect(clueUrl("abc", "https://nikonakkan.github.io/halloween-hunt/grimoire.html")).toBe(
      "https://nikonakkan.github.io/halloween-hunt/?c=abc",
    );
  });
});
