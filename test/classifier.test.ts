import { describe, expect, it } from "vitest";
import { classifyRequest, isPrimaryAttentionSignal } from "../src/classifier";

const context = { cfVerifiedBot: false };

describe("classifyRequest", () => {
  it.each([
    ["ChatGPT-User/1.0", "openai", "user_fetcher"],
    ["OAI-SearchBot/1.0", "openai", "search_indexer"],
    ["GPTBot/1.2", "openai", "training_crawler"],
    ["Claude-User", "anthropic", "user_fetcher"],
    ["Claude-SearchBot", "anthropic", "search_indexer"],
    ["ClaudeBot", "anthropic", "training_crawler"],
    ["Perplexity-User/1.0", "perplexity", "user_fetcher"],
    ["PerplexityBot/1.0", "perplexity", "search_indexer"],
  ])("classifies %s", (userAgent, family, mode) => {
    expect(classifyRequest(userAgent, context)).toMatchObject({
      actorFamily: family,
      actorMode: mode,
      verificationLevel: "ua_only",
    });
  });

  it("keeps Cloudflare verification as separate evidence", () => {
    const result = classifyRequest("ChatGPT-User/1.0", { cfVerifiedBot: true });
    expect(result.verificationLevel).toBe("cf_verified");
    expect(result.evidence).toContain("cf:verified-bot");
  });

  it("requires identity verification for primary attention", () => {
    expect(isPrimaryAttentionSignal(classifyRequest("GPTBot/1.2", context))).toBe(false);
    expect(isPrimaryAttentionSignal(classifyRequest("ChatGPT-User/1.0", context))).toBe(false);
    expect(isPrimaryAttentionSignal(classifyRequest("ChatGPT-User/1.0", { cfVerifiedBot: true }))).toBe(true);
  });

  it("separates browsers and unknown automation", () => {
    expect(classifyRequest("Mozilla/5.0 Chrome/140.0", context).actorMode).toBe("human_browser");
    expect(classifyRequest("curl/8.0", context).actorMode).toBe("unknown_bot");
  });
});
