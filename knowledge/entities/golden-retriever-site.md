---
id: gr:entity:golden-retriever-site
title: "Golden Retriever public site"
domain: agent
topology: entity
tags: [golden-retriever, service, sites, cloudflare-workers, d1]
status: stable
last_updated: 2026-08-20
author: jeemin.kim
schema_version: 1
summary: "Golden Retriever Trap과 telemetry endpoint를 제공하는 공개 서비스 identity card"
describes: [entity:golden-retriever-site]
entity_type: service
entity_id: golden-retriever-site
live_state_query: "curl --fail --silent https://golden-retriever.jmeef0802.chatgpt.site/healthz"
implements: [gr:project:research-and-design, gr:project:experiment-1]
governed_by: [gr:standard:privacy-and-telemetry-policy]
source_urls: [https://golden-retriever.jmeef0802.chatgpt.site, https://github.com/PrrrStar/golden-retriever]
---

# Golden Retriever public site

## Identity

- Canonical service ID: `golden-retriever-site`
- Public URL: `https://golden-retriever.jmeef0802.chatgpt.site`
- Source repository: `https://github.com/PrrrStar/golden-retriever`
- Runtime: Cloudflare Workers-compatible OpenAI Sites deployment
- Persistent store: D1 binding `DB`

## Responsibility

The service publishes public information Traps, captures privacy-minimized HTTP observations, classifies requester evidence deterministically, stores raw observations in D1, and exposes protected aggregates.

The entity card records stable identity only. Deployment version, observation counts, and experiment status belong in time-bound event documents or live queries.
