---
id: gr:event:experiment-1-public-start-20260820
title: "Experiment 1 public start and baseline"
domain: agent
topology: event
tags: [golden-retriever, experiment-1, public-launch, baseline, sites]
status: confirmed
last_updated: 2026-08-20
author: jeemin.kim
schema_version: 1
summary: "Golden Retriever 공개 전환, production smoke test와 최초 calibration 결과 기록"
describes: [event:golden-retriever-public-start]
occurred_at: "2026-08-20T00:26:56+09:00"
actions: [public-access-enabled, anonymous-smoke-tested, provider-ranges-refreshed, calibration-attempted]
evidences: [gr:project:experiment-1]
operated_by: [gr:playbook:experiment-1-operations]
affected_entities: [entity:golden-retriever-site]
---

# Experiment 1 public start and baseline

This is the append-only operator log for interventions and experiment boundaries. It contains no prompt text, raw IP address, secret, or personal identifier.

## 2026-08-20 — public start and baseline

All timestamps are KST unless explicitly marked otherwise.

### Public boundary

- Public access approved by the project owner.
- Sites access policy changed from owner-only to `public` at approximately 00:26.
- Sites version 2 deployed from Git commit `cb21a4cd849a5c64d80b67a8eb26cb1225d346b0`.
- Public URL: `https://golden-retriever.jmeef0802.chatgpt.site`
- Experiment clock starts at `2026-08-20T00:26:56+09:00`, the successful public deployment timestamp.

### Anonymous production smoke

At approximately 00:27, requests without a Sites authorization or bypass header returned:

- `/`: 200 HTML
- `/healthz`: 200 JSON with D1 and secret readiness true
- `/robots.txt`: 200 text
- `/sitemap.xml`: 200 XML
- four calibration HTML Trap routes: 200 HTML
- calibration structured Trap: 200 JSON-LD
- `/api/admin/summary`: 401 without the admin bearer token

The five Trap representations generated privacy-minimized calibration observations in production D1. No organic primary-attention or convergence signal existed at baseline.

### Provider verification baseline

The production D1 snapshot was refreshed from all configured official sources before public start:

- OpenAI search indexer: 35 prefixes
- OpenAI training crawler: 21 prefixes
- OpenAI user fetcher: 204 prefixes
- Anthropic common bot ranges: 23 prefixes for each of three modes
- Perplexity search indexer: 8 prefixes
- Perplexity user fetcher: 4 prefixes

All eight configured source/mode refresh operations succeeded.

### Calibration attempt 1

- Attempt ID: `df984362-5791-442b-9223-6f42ce63d92b`
- Product: Codex web retrieval
- Operator family: OpenAI
- Prompt class: direct URL
- Trap: dictionary calibration
- Result: unmatched (`0/1`)
- Reason observed by operator: the retrieval tool rejected the newly public `chatgpt.site` URL at its safe-URL gate before issuing an HTTP fetch.

This is an instrumentation/distribution result, not a retrieval miss. It demonstrates why products that do not issue HTTP must be separated from fetch recall.

### Search visibility baseline

A site-restricted search immediately after publication returned no results. This is the expected pre-index baseline; index visibility remains pending.
