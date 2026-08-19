import { describe, expect, it } from "vitest";
import { bounded, dailyClientHash, refererHost } from "../src/privacy";

describe("privacy helpers", () => {
  it("creates a stable hash within a day and rotates it the next day", async () => {
    const first = await dailyClientHash("203.0.113.10", "test-secret", new Date("2026-08-19T01:00:00Z"));
    const sameDay = await dailyClientHash("203.0.113.10", "test-secret", new Date("2026-08-19T23:00:00Z"));
    const nextDay = await dailyClientHash("203.0.113.10", "test-secret", new Date("2026-08-20T01:00:00Z"));
    expect(first).toHaveLength(32);
    expect(first).toBe(sameDay);
    expect(first).not.toBe(nextDay);
  });

  it("stores only the referer hostname", () => {
    const request = new Request("https://example.test", {
      headers: { Referer: "https://search.example/private/query?q=secret" },
    });
    expect(refererHost(request)).toBe("search.example");
  });

  it("drops invalid referrers and bounds fields", () => {
    expect(refererHost(new Request("https://example.test", { headers: { Referer: "not a url" } }))).toBeUndefined();
    expect(bounded("abcdef", 3)).toBe("abc");
  });
});
