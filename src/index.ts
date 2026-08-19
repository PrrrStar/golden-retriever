import { classifyRequest, withProviderVerification } from "./classifier";
import { matchesAnyCidr } from "./cidr";
import type { Observation } from "./domain";
import { dailyClientHash, getRequestContext, refererHost } from "./privacy";
import { renderIndex, renderRobots, renderSitemap, renderTrap } from "./render";
import { D1ObservationStore } from "./storage";
import { findTrap } from "./traps";
import { syncProviderRanges } from "./provider-ranges";

export interface Env {
  DB: D1Database;
  ADMIN_TOKEN?: string;
  TELEMETRY_HMAC_KEY?: string;
  CLASSIFIER_VERSION?: string;
  SITE_ORIGIN?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = env.SITE_ORIGIN && !env.SITE_ORIGIN.includes("localhost") ? env.SITE_ORIGIN : url.origin;

    if (url.pathname === "/api/admin/provider-ranges/sync" && request.method === "POST") {
      if (!authorized(request, env.ADMIN_TOKEN)) return json({ error: "unauthorized" }, 401);
      const results = await syncProviderRanges(env.DB);
      return json({ generatedAt: new Date().toISOString(), results }, results.some(({ ok }) => !ok) ? 207 : 200);
    }

    if (url.pathname === "/api/admin/calibration-attempts" && request.method === "POST") {
      if (!authorized(request, env.ADMIN_TOKEN)) return json({ error: "unauthorized" }, 401);
      const parsed = await parseCalibrationAttempt(request);
      if ("error" in parsed) return json({ error: "invalid_calibration_attempt", detail: parsed.error }, 400);
      const match = findTrap(parsed.path);
      if (!match || match.trap.experimentSource !== "calibration") return json({ error: "unknown_calibration_trap" }, 400);
      const attempt = {
        id: crypto.randomUUID(),
        attemptedAt: parsed.attemptedAt,
        actorFamily: parsed.actorFamily,
        product: parsed.product,
        trapId: match.trap.id,
        promptClass: parsed.promptClass,
        expectedMode: parsed.expectedMode,
      } as const;
      await new D1ObservationStore(env.DB).recordCalibrationAttempt(match.trap, attempt);
      return json({ attempt }, 201);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "method_not_allowed" }, 405, { Allow: "GET, HEAD" });
    }

    if (url.pathname === "/healthz") {
      try {
        await env.DB.prepare("SELECT 1 AS ok").first();
        const configured = Boolean(env.ADMIN_TOKEN && env.TELEMETRY_HMAC_KEY);
        return json({ ok: configured, database: true, secretsConfigured: configured }, configured ? 200 : 503);
      } catch {
        return json({ ok: false, database: false, secretsConfigured: Boolean(env.ADMIN_TOKEN && env.TELEMETRY_HMAC_KEY) }, 503);
      }
    }
    if (url.pathname === "/robots.txt") return renderRobots(origin);
    if (url.pathname === "/sitemap.xml") return renderSitemap(origin);
    if (url.pathname === "/") return renderIndex(origin);

    if (url.pathname === "/api/admin/summary") {
      if (!authorized(request, env.ADMIN_TOKEN)) return json({ error: "unauthorized" }, 401);
      const since = safeSince(url.searchParams.get("since"));
      const summary = await new D1ObservationStore(env.DB).summary(since);
      return json({ since, generatedAt: new Date().toISOString(), ...summary });
    }

    const match = findTrap(url.pathname);
    if (!match) return json({ error: "not_found" }, 404);

    const observedAt = new Date();
    const requestContext = getRequestContext(request);
    const store = new D1ObservationStore(env.DB);
    let classification = classifyRequest(request.headers.get("User-Agent") ?? "", requestContext);
    if (requestContext.ip && classification.verificationLevel === "ua_only") {
      try {
        const ranges = await store.providerRanges(classification.actorFamily, classification.actorMode);
        if (matchesAnyCidr(requestContext.ip, ranges)) classification = withProviderVerification(classification);
      } catch {
        classification = { ...classification, evidence: [...classification.evidence, "network:range-lookup-unavailable"] };
      }
    }
    const observation: Observation = {
      id: crypto.randomUUID(),
      observedAt: observedAt.toISOString(),
      subjectId: match.trap.subject.id,
      trapId: match.trap.id,
      trapKind: match.trap.kind,
      experimentSource: match.trap.experimentSource,
      actorFamily: classification.actorFamily,
      actorMode: classification.actorMode,
      verificationLevel: classification.verificationLevel,
      classifierVersion: env.CLASSIFIER_VERSION ?? classification.classifierVersion,
      requestMethod: request.method,
      responseFormat: match.format,
      country: requestContext.country,
      colo: requestContext.colo,
      refererHost: refererHost(request),
      clientHash: await dailyClientHash(requestContext.ip, env.TELEMETRY_HMAC_KEY, observedAt),
      evidence: classification.evidence,
    };

    ctx.waitUntil(store.record(match.trap, observation).catch((error) => {
      console.error("observation write failed", { observationId: observation.id, error });
    }));
    return renderTrap(match.trap, match.format, request.method);
  },
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    ctx.waitUntil(Promise.all([
      syncProviderRanges(env.DB).then((results) => {
        const failed = results.filter(({ ok }) => !ok);
        if (failed.length > 0) console.error("provider range sync partially failed", failed);
      }),
      new D1ObservationStore(env.DB).deleteObservationsBefore(cutoff).then((deleted) => {
        console.log("observation retention cleanup", { cutoff, deleted });
      }),
    ]).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;

function authorized(request: Request, token: string | undefined): boolean {
  if (!token) return false;
  const header = request.headers.get("Authorization");
  return header === `Bearer ${token}`;
}

function safeSince(value: string | null): string {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

function json(payload: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

interface ParsedCalibrationAttempt {
  actorFamily: string;
  product: string;
  path: string;
  promptClass: "direct_url" | "natural_question";
  expectedMode: "user_fetcher" | "search_indexer";
  attemptedAt: string;
}

async function parseCalibrationAttempt(request: Request): Promise<ParsedCalibrationAttempt | { error: string }> {
  try {
    const input = await request.json() as Record<string, unknown>;
    const actorFamily = shortString(input.actorFamily, 40);
    const product = shortString(input.product, 80);
    const path = shortString(input.path, 200);
    const promptClass = input.promptClass;
    const expectedMode = input.expectedMode;
    const attemptedAt = typeof input.attemptedAt === "string" ? new Date(input.attemptedAt) : new Date();
    if (!actorFamily || !product || !path) return { error: "actorFamily, product, and path are required" };
    if (promptClass !== "direct_url" && promptClass !== "natural_question") return { error: "invalid promptClass" };
    if (expectedMode !== "user_fetcher" && expectedMode !== "search_indexer") return { error: "invalid expectedMode" };
    if (Number.isNaN(attemptedAt.getTime())) return { error: "invalid attemptedAt" };
    return { actorFamily, product, path: new URL(path, "https://calibration.invalid").pathname, promptClass, expectedMode, attemptedAt: attemptedAt.toISOString() };
  } catch {
    return { error: "body must be valid JSON" };
  }
}

function shortString(value: unknown, length: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, length) : undefined;
}
