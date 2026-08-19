import type { ActorMode } from "./domain";

interface ProviderSource {
  actorFamily: string;
  actorMode: ActorMode;
  url: string;
}

interface ProviderRange {
  actorFamily: string;
  actorMode: ActorMode;
  prefix: string;
  sourceUrl: string;
  fetchedAt: string;
}

export interface ProviderSyncResult {
  source: string;
  actorFamily: string;
  actorMode: ActorMode;
  prefixes: number;
  ok: boolean;
  error?: string;
}

export const PROVIDER_SOURCES: ProviderSource[] = [
  { actorFamily: "openai", actorMode: "search_indexer", url: "https://openai.com/searchbot.json" },
  { actorFamily: "openai", actorMode: "training_crawler", url: "https://openai.com/gptbot.json" },
  { actorFamily: "openai", actorMode: "user_fetcher", url: "https://openai.com/chatgpt-user.json" },
  { actorFamily: "anthropic", actorMode: "training_crawler", url: "https://claude.com/crawling/bots.json" },
  { actorFamily: "anthropic", actorMode: "search_indexer", url: "https://claude.com/crawling/bots.json" },
  { actorFamily: "anthropic", actorMode: "user_fetcher", url: "https://claude.com/crawling/bots.json" },
  { actorFamily: "perplexity", actorMode: "search_indexer", url: "https://www.perplexity.com/perplexitybot.json" },
  { actorFamily: "perplexity", actorMode: "user_fetcher", url: "https://www.perplexity.com/perplexity-user.json" },
];

export async function syncProviderRanges(
  db: D1Database,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<ProviderSyncResult[]> {
  return Promise.all(PROVIDER_SOURCES.map(async (source) => {
    try {
      const response = await fetcher(source.url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const prefixes = extractPrefixes(await response.json());
      if (prefixes.length === 0) throw new Error("no valid prefixes");
      const ranges: ProviderRange[] = prefixes.map((prefix) => ({
        actorFamily: source.actorFamily,
        actorMode: source.actorMode,
        prefix,
        sourceUrl: source.url,
        fetchedAt: now.toISOString(),
      }));
      await replaceSourceRanges(db, source, ranges);
      return { source: source.url, actorFamily: source.actorFamily, actorMode: source.actorMode, prefixes: ranges.length, ok: true };
    } catch (error) {
      return {
        source: source.url,
        actorFamily: source.actorFamily,
        actorMode: source.actorMode,
        prefixes: 0,
        ok: false,
        error: error instanceof Error ? error.message : "unknown error",
      };
    }
  }));
}

export function extractPrefixes(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const candidates = (payload as { prefixes?: unknown }).prefixes;
  if (!Array.isArray(candidates)) return [];
  return [...new Set(candidates.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (!entry || typeof entry !== "object") return [];
    const object = entry as Record<string, unknown>;
    return [object.ipv4Prefix, object.ipv6Prefix, object.prefix].filter((value): value is string => typeof value === "string");
  }).filter(isCidr))].sort();
}

async function replaceSourceRanges(db: D1Database, source: ProviderSource, ranges: ProviderRange[]): Promise<void> {
  const statements = [
    db.prepare("DELETE FROM provider_network_ranges WHERE actor_family = ? AND actor_mode = ?")
      .bind(source.actorFamily, source.actorMode),
    ...ranges.map((range) => db.prepare(
      `INSERT INTO provider_network_ranges (actor_family, actor_mode, prefix, source_url, fetched_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(range.actorFamily, range.actorMode, range.prefix, range.sourceUrl, range.fetchedAt)),
  ];
  await db.batch(statements);
}

function isCidr(value: string): boolean {
  const [address, prefix] = value.split("/");
  return Boolean(address && prefix && /^\d{1,3}$/.test(prefix) && (address.includes(":") || /^\d{1,3}(\.\d{1,3}){3}$/.test(address)));
}
