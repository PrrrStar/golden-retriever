import type { RequestContext } from "./domain";

export function getRequestContext(request: Request): RequestContext {
  const cf = request.cf as IncomingRequestCfProperties | undefined;
  const botManagement = cf && "botManagement" in cf ? (cf.botManagement as { verifiedBot?: boolean }) : undefined;
  return {
    ip: bounded(request.headers.get("CF-Connecting-IP"), 64),
    country: bounded(typeof cf?.country === "string" ? cf.country : undefined, 2),
    colo: bounded(typeof cf?.colo === "string" ? cf.colo : undefined, 8),
    cfVerifiedBot: botManagement?.verifiedBot === true,
  };
}

export async function dailyClientHash(ip: string | undefined, secret: string | undefined, observedAt: Date): Promise<string | undefined> {
  if (!ip || !secret) return undefined;
  const day = observedAt.toISOString().slice(0, 10);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${day}:${ip}`));
  return [...new Uint8Array(digest).slice(0, 16)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function refererHost(request: Request): string | undefined {
  const value = request.headers.get("Referer");
  if (!value) return undefined;
  try {
    return bounded(new URL(value).hostname.toLowerCase(), 253);
  } catch {
    return undefined;
  }
}

export function bounded(value: string | null | undefined, maxLength: number): string | undefined {
  if (!value) return undefined;
  return value.slice(0, maxLength);
}
