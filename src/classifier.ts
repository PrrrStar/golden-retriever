import type { Classification, RequestContext } from "./domain";

export const CLASSIFIER_VERSION = "2026-08-19.1";

interface Signature {
  pattern: RegExp;
  family: string;
  mode: Classification["actorMode"];
  evidence: string;
}

const SIGNATURES: Signature[] = [
  { pattern: /ChatGPT-User/i, family: "openai", mode: "user_fetcher", evidence: "ua:chatgpt-user" },
  { pattern: /OAI-SearchBot/i, family: "openai", mode: "search_indexer", evidence: "ua:oai-searchbot" },
  { pattern: /GPTBot/i, family: "openai", mode: "training_crawler", evidence: "ua:gptbot" },
  { pattern: /Claude-User/i, family: "anthropic", mode: "user_fetcher", evidence: "ua:claude-user" },
  { pattern: /Claude-SearchBot/i, family: "anthropic", mode: "search_indexer", evidence: "ua:claude-searchbot" },
  { pattern: /ClaudeBot/i, family: "anthropic", mode: "training_crawler", evidence: "ua:claudebot" },
  { pattern: /Perplexity-User/i, family: "perplexity", mode: "user_fetcher", evidence: "ua:perplexity-user" },
  { pattern: /PerplexityBot/i, family: "perplexity", mode: "search_indexer", evidence: "ua:perplexitybot" },
  { pattern: /Google-CloudVertexBot/i, family: "google", mode: "training_crawler", evidence: "ua:google-cloudvertexbot" },
  { pattern: /GoogleOther/i, family: "google", mode: "training_crawler", evidence: "ua:googleother" },
  { pattern: /Googlebot/i, family: "google", mode: "generic_search", evidence: "ua:googlebot" },
  { pattern: /bingbot/i, family: "microsoft", mode: "generic_search", evidence: "ua:bingbot" },
  { pattern: /meta-externalagent/i, family: "meta", mode: "training_crawler", evidence: "ua:meta-externalagent" },
  { pattern: /DuckAssistBot/i, family: "duckduckgo", mode: "search_indexer", evidence: "ua:duckassistbot" },
  { pattern: /MistralAI-User/i, family: "mistral", mode: "user_fetcher", evidence: "ua:mistralai-user" },
  { pattern: /Applebot-Extended/i, family: "apple", mode: "training_crawler", evidence: "ua:applebot-extended" },
  { pattern: /Applebot/i, family: "apple", mode: "generic_search", evidence: "ua:applebot" },
];

const AUTOMATION = /bot|crawler|spider|scrapy|curl|wget|python-requests|httpx|go-http-client/i;
const BROWSER = /mozilla\/5\.0|chrome\/|safari\/|firefox\//i;

export function classifyRequest(userAgent: string, context: RequestContext): Classification {
  const signature = SIGNATURES.find(({ pattern }) => pattern.test(userAgent));

  if (signature) {
    return {
      actorFamily: signature.family,
      actorMode: signature.mode,
      verificationLevel: context.cfVerifiedBot ? "cf_verified" : "ua_only",
      classifierVersion: CLASSIFIER_VERSION,
      evidence: [signature.evidence, ...(context.cfVerifiedBot ? ["cf:verified-bot"] : [])],
    };
  }

  if (AUTOMATION.test(userAgent)) {
    return {
      actorFamily: "unknown",
      actorMode: "unknown_bot",
      verificationLevel: context.cfVerifiedBot ? "cf_verified" : "unknown",
      classifierVersion: CLASSIFIER_VERSION,
      evidence: ["ua:generic-automation", ...(context.cfVerifiedBot ? ["cf:verified-bot"] : [])],
    };
  }

  return {
    actorFamily: BROWSER.test(userAgent) ? "browser" : "unknown",
    actorMode: BROWSER.test(userAgent) ? "human_browser" : "unknown",
    verificationLevel: "unknown",
    classifierVersion: CLASSIFIER_VERSION,
    evidence: [BROWSER.test(userAgent) ? "ua:browser" : "ua:unclassified"],
  };
}

export function isPrimaryAttentionSignal(classification: Classification): boolean {
  return classification.actorMode === "user_fetcher"
    && (classification.verificationLevel === "cf_verified" || classification.verificationLevel === "provider_ip_verified");
}

export function withProviderVerification(classification: Classification): Classification {
  return {
    ...classification,
    verificationLevel: "provider_ip_verified",
    evidence: [...classification.evidence, "network:provider-published-range"],
  };
}
