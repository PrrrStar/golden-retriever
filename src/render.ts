import type { TrapDocument } from "./domain";
import { traps } from "./traps";

const commonHeaders = {
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export function renderTrap(trap: TrapDocument, format: "html" | "json", method = "GET"): Response {
  if (format === "json") {
    const payload = {
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      name: trap.subject.canonicalName,
      alternateName: trap.subject.aliases,
      description: trap.summary,
      datePublished: trap.publishedAt,
      dateModified: trap.updatedAt,
      experimentSource: trap.experimentSource,
      trapKind: trap.kind,
    };
    return response(method === "HEAD" ? null : JSON.stringify(payload, null, 2), {
      ...commonHeaders,
      "Content-Type": "application/ld+json; charset=utf-8",
      ...cacheHeaders(trap),
    });
  }

  const structured = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: trap.title,
    description: trap.summary,
    datePublished: trap.publishedAt,
    dateModified: trap.updatedAt,
    about: { "@type": "DefinedTerm", name: trap.subject.canonicalName },
  }).replace(/</g, "\\u003c");

  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(trap.title)}</title><meta name="description" content="${escapeHtml(trap.summary)}">
<script type="application/ld+json">${structured}</script>
<style>body{max-width:48rem;margin:4rem auto;padding:0 1.25rem;font:17px/1.7 system-ui,sans-serif;color:#20231f}header{border-bottom:1px solid #d9ddd5;margin-bottom:2rem}small{color:#667064}a{color:#295f31}code{background:#f1f4ef;padding:.15rem .35rem}footer{margin-top:3rem;color:#667064}</style></head>
<body><header><small>Golden Retriever · ${escapeHtml(trap.kind)} · ${escapeHtml(trap.experimentSource)}</small><h1>${escapeHtml(trap.title)}</h1><p>${escapeHtml(trap.summary)}</p></header>
<main>${trap.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}<h2>관련 문서</h2><ul>${trap.related.map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`).join("")}</ul></main>
<footer><p>이 문서는 공개 retrieval 측정 실험의 캘리브레이션 자료입니다. 개인 프롬프트나 원 IP를 저장하지 않습니다.</p></footer></body></html>`;

  return response(method === "HEAD" ? null : html, {
    ...commonHeaders,
    "Content-Type": "text/html; charset=utf-8",
    ...cacheHeaders(trap),
  });
}
export function renderIndex(origin: string): Response {
  const links = traps.map((trap) => {
    const prefix = { dictionary: "concept", current_context: "now", relation: "relation", timeline: "timeline", structured_data: "api/concepts" }[trap.kind];
    return `<li><a href="/${prefix}/${escapeHtml(trap.slug)}">${escapeHtml(trap.title)}</a></li>`;
  }).join("");
  return response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Golden Retriever</title></head><body><main><h1>Golden Retriever</h1><p>AI retrieval attention sensor 실험입니다.</p><ul>${links}</ul><p><a href="${escapeHtml(origin)}/api/concepts/golden-retriever-calibration.json">JSON-LD</a></p></main></body></html>`, {
    ...commonHeaders,
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=300",
  });
}

export function renderRobots(origin: string): Response {
  const body = `User-agent: *
Allow: /

User-agent: GPTBot
Disallow: /
User-agent: ClaudeBot
Disallow: /
User-agent: Google-CloudVertexBot
Disallow: /

User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /

Sitemap: ${origin}/sitemap.xml
`;
  return response(body, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" });
}

export function renderSitemap(origin: string): Response {
  const urls = traps.map((trap) => {
    const prefix = { dictionary: "concept", current_context: "now", relation: "relation", timeline: "timeline", structured_data: "api/concepts" }[trap.kind];
    return `<url><loc>${escapeXml(`${origin}/${prefix}/${trap.slug}`)}</loc><lastmod>${trap.updatedAt.slice(0, 10)}</lastmod></url>`;
  });
  urls.push(`<url><loc>${escapeXml(`${origin}/api/concepts/golden-retriever-calibration.json`)}</loc><lastmod>2026-08-19</lastmod></url>`);
  return response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`, {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  });
}

function cacheHeaders(trap: TrapDocument): Record<string, string> {
  return {
    "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    ETag: `W/\"${trap.id}:${trap.updatedAt}\"`,
    "Last-Modified": new Date(trap.updatedAt).toUTCString(),
  };
}

function response(body: BodyInit | null, headers: HeadersInit): Response {
  return new Response(body, { status: 200, headers });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function escapeXml(value: string): string {
  return escapeHtml(value);
}
