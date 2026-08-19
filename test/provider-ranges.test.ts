import { describe, expect, it, vi } from "vitest";
import { extractPrefixes, PROVIDER_SOURCES, syncProviderRanges } from "../src/provider-ranges";

class Statement {
  constructor(readonly query: string) {}
  bind(..._values: unknown[]): Statement { return this; }
}

class Database {
  batches: Statement[][] = [];
  prepare(query: string): Statement { return new Statement(query); }
  async batch(statements: Statement[]): Promise<D1Result[]> {
    this.batches.push(statements);
    return [];
  }
}

describe("provider ranges", () => {
  it("parses published IPv4 and IPv6 prefix objects", () => {
    expect(extractPrefixes({ prefixes: [
      { ipv4Prefix: "192.0.2.0/24" },
      { ipv6Prefix: "2001:db8::/32" },
      { ipv4Prefix: "192.0.2.0/24" },
      { invalid: "ignored" },
    ] })).toEqual(["192.0.2.0/24", "2001:db8::/32"]);
  });

  it("keeps the last good snapshot when a source fails", async () => {
    const database = new Database();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("upstream failure", { status: 503 }));
    const results = await syncProviderRanges(database as unknown as D1Database, fetcher);
    expect(results).toHaveLength(PROVIDER_SOURCES.length);
    expect(results.every(({ ok }) => !ok)).toBe(true);
    expect(database.batches).toHaveLength(0);
  });

  it("replaces a source snapshot only after valid prefixes arrive", async () => {
    const database = new Database();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ prefixes: [{ ipv4Prefix: "192.0.2.0/24" }] }));
    const results = await syncProviderRanges(database as unknown as D1Database, fetcher, new Date("2026-08-20T00:00:00Z"));
    expect(results.every(({ ok, prefixes }) => ok && prefixes === 1)).toBe(true);
    expect(database.batches).toHaveLength(PROVIDER_SOURCES.length);
    expect(database.batches.every((batch) => batch.length === 2)).toBe(true);
  });
});
