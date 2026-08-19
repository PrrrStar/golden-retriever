---
id: gr:project:research-and-design
title: "Golden Retriever research and design"
domain: agent
topology: project
tags: [golden-retriever, ai-retrieval, telemetry, experiment, architecture]
status: in-progress
last_updated: 2026-08-20
author: jeemin.kim
schema_version: 1
summary: "AI retrieval sensor 가설, 조사 결과, 최소 도메인 모델과 MVP 아키텍처 결정 기록"
describes: [project:golden-retriever]
informs: [gr:project:experiment-1, gr:playbook:experiment-1-operations]
governed_by: [gr:standard:privacy-and-telemetry-policy]
source_urls: [https://devops-mcp.yanolja.in/mcp, https://arxiv.org/abs/2604.02544]
---

# Golden Retriever research and design

Last reviewed: 2026-08-20

## Decision

Golden Retriever starts as a retrieval-sensor experiment, not a trend prediction product. The first system must establish whether public utilities can attract real AI retrieval traffic and whether that traffic can be distinguished from training and search indexing crawlers.

The minimum vertical slice is:

```text
Trap -> HTTP request -> Observation -> Classification -> D1 -> Aggregate result
```

No request-time LLM, graph database, dashboard framework, or prediction model is justified yet.

## Repository baseline

The repository began with one initial commit, a one-line README, an Apache 2.0 license, and no application code. There are no compatibility constraints or existing modules to preserve.

## DevOps MCP findings

The existing Yanolja DevOps MCP and its Knowledge Graph were queried before implementation. The reusable findings are design rules, not the DevOps domain ontology:

1. Separate document/content genre from real-world object type. One resource may describe an entity and an event without forcing either into a single exclusive enum.
2. Do not use a generic `RelatedTo` relation as a substitute for semantics. Relations must explain how two objects are related.
3. Keep raw observations separate from derived edges and scores. A derived edge must retain provenance and the classifier version that produced it.
4. Separate valid time from transaction/observation time. `last_updated` is not an event occurrence time.
5. Keep self-evaluation and calibration traffic out of usage metrics. Measurement traffic otherwise becomes the apparent demand signal.
6. Define competency questions and evaluation criteria before adding ontology or retrieval complexity.
7. Prefer narrow MCP tools with simple arguments, stable names, bounded results, and explicit provenance.

These rules directly shape the Golden Retriever domain and experiment schema.

## Current retrieval ecosystem

Major operators expose distinct access modes:

| Operator | Training | Search/index | User-directed fetch |
|---|---|---|---|
| OpenAI | GPTBot | OAI-SearchBot | ChatGPT-User |
| Anthropic | ClaudeBot | Claude-SearchBot | Claude-User |
| Perplexity | — | PerplexityBot | Perplexity-User |

Sources:

- OpenAI publisher guidance: https://help.openai.com/en/articles/12627856-publishers-and-developers-faq
- Anthropic crawler guidance: https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- Perplexity crawler documentation: https://docs.perplexity.ai/docs/resources/perplexity-crawlers
- Cloudflare AI crawler reference: https://developers.cloudflare.com/ai-crawl-control/reference/bots/

Provider-network verification refreshes the official OpenAI `searchbot.json`, `gptbot.json`, and `chatgpt-user.json`; Anthropic `bots.json`; and Perplexity bot/user JSON endpoints daily. Each successful source replaces only its own prior snapshot. Failed or empty refreshes preserve the last known-good ranges.

User-Agent alone is not identity. It is a claim made by the requester and is trivially spoofable. Classification therefore records a separate verification level:

```text
cf_verified > provider_ip_verified > ua_only > unknown
```

UA-only events remain raw observations but cannot silently become verified attention.

An empirical 2026 study of developer documentation access observed stable HTTP-level fingerprints across multiple agents, but only three trials per tool and a developer-documentation setting. It supports calibration work; it does not prove universal signatures. The same study found that agent retrieval often compresses consumption to one or two HTTP requests, making time-on-page, navigation depth, and bounce rate poor metrics. None of the tested tools automatically requested `llms.txt`.

Study: https://arxiv.org/abs/2604.02544

## Competency questions

The MVP schema must answer these questions without a graph database:

1. Did any user-directed AI fetch access a trap?
2. Which trap kinds and subjects were accessed?
3. Was the requester identity verified, UA-only, or unknown?
4. Did two or more independent operator families converge on the same subject within a time window?
5. Was the event organic, calibration, or self-evaluation traffic?
6. Can every aggregate be traced to immutable raw observations and a classifier version?
7. Can training crawlers be excluded without discarding their observations?

## Domain boundary

### Knowledge layer

- `Subject`: canonical concept, entity, event, or story.
- `Relation`: semantic relation with evidence and valid time. Deferred until real content requires it.
- `Trap`: a published view over one or more subjects.

### Attention layer

- `Observation`: an HTTP access event with classification evidence.
- `Actor`: operator family plus access mode; currently represented as observation dimensions.
- `Convergence`: a derived aggregate, never a raw fact.

The MVP stores Subjects, Traps, and Observations. Relation and Story projections are added only after content experiments demonstrate a need.

## Observation schema

Each observation stores:

- immutable event ID and `observed_at`
- trap and subject IDs
- actor family and mode
- verification level and classification evidence
- experiment source: `organic`, `calibration`, or `self_eval`
- daily rotating HMAC fingerprint, if configured
- coarse Cloudflare country and colo
- request method and response format; trap and subject IDs identify the path without storing query values
- normalized classification evidence derived from User-Agent; not the raw header
- referrer hostname only
- classifier version

It does not store raw IP addresses, raw User-Agent or Accept headers, cookies, request bodies, personal prompts, full referrer URLs, or query-string values.

## Trap interface

A trap has a stable ID, kind, subject, experiment source, timestamps, content version, evidence URLs, and renderable content. HTML and JSON are two representations of the same Trap rather than separate domain objects.

New trap kinds should be added to the registry without changing observation capture or storage. New sensors should emit the same Observation boundary without changing Trap rendering.

## Trap likelihood

Initial priority:

1. Current context: directly serves freshness questions.
2. Timeline: compresses scattered event history into a retrievable resource.
3. Relation: targets explicit “A and B” questions and emerging narrative edges.
4. Dictionary: useful for unknown or newly coined concepts.
5. Structured JSON: machine-readable representation of useful content.
6. Person/issue pages.
7. MCP: a separately seeded distribution experiment.

MCP is not comparable to passive web traps because a client must first install or register it. MCP traffic must carry a seeded distribution label.

## Architecture

Cloudflare Workers plus D1 is the minimum-cost fit:

- Worker serves static-like HTML/JSON and captures request metadata.
- Pure deterministic rules classify requests.
- D1 preserves low-volume raw observations and performs SQL aggregation.
- An authenticated endpoint exposes basic results.
- Cloudflare AI Crawl Control provides a separate operational cross-check.
- A daily scheduled job refreshes provider-published IP ranges; a failed refresh retains the last good snapshot.

Free-plan references:

- Workers: https://developers.cloudflare.com/workers/platform/pricing/
- D1: https://developers.cloudflare.com/d1/platform/pricing/
- AI Crawl Control: https://developers.cloudflare.com/ai-crawl-control/

Workers Analytics Engine is not the raw store because sampling can make an individual record unrecoverable. It can become an aggregate sink after volume justifies it.

## Deferred intentionally

- Neo4j or another graph database
- embeddings and semantic search
- LLM classification
- prediction models
- a visual dashboard
- community/news/search sensors
- automatic entity resolution
- automatic inference promotion
- MCP server deployment

Each remains contingent on observed retrieval traffic.
