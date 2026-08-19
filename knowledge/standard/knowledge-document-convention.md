---
id: gr:standard:knowledge-document-convention
title: "Knowledge document convention"
domain: agent
topology: standard
tags: [golden-retriever, knowledge, frontmatter, ontology, provenance]
status: stable
last_updated: 2026-08-20
author: jeemin.kim
schema_version: 1
summary: "Golden Retriever 문서를 향후 Knowledge Graph로 적재하기 위한 구조와 frontmatter 규칙"
describes: [policy:golden-retriever-knowledge-document-convention]
governs: [collection:golden-retriever-knowledge]
derived_from: [source:yanolja-devops-mcp-knowledge-graph]
---

# Knowledge document convention

`knowledge/` is the canonical home for project knowledge. Do not keep a second copy under `docs/`.

## Topology and physical folders

Topology describes the document genre, not every real-world object mentioned by the document.

| `topology` | Folder | Purpose |
|---|---|---|
| `event` | `knowledge/event/` | Time-bound observations, interventions, incidents, and experiment records |
| `playbook` | `knowledge/playbook/` | Repeatable operating procedures |
| `project` | `knowledge/project/<project>/` | Research, design, plans, and project outcomes |
| `standard` | `knowledge/standard/` | Policies and living conventions |
| `entity` | `knowledge/entities/` | Stable identity cards with a live-state query |

The object axis is represented separately with fields such as `describes`, `affected_entities`, and `produces`. For example, an event document may describe an event and affect a service entity without becoming an entity document.

## Required frontmatter

Every Markdown document requires:

- `id`, `title`, `domain`, `topology`, `tags`, `status`, `last_updated`, and `author`
- `schema_version`, `summary`, and `describes`
- `occurred_at` and `actions` for an event
- `entity_type`, `entity_id`, and `live_state_query` for an entity card

IDs are stable graph identifiers and must remain unique even when a file is renamed. `last_updated` is transaction time; it must not replace `occurred_at` for a time-bound event.

## Relations and provenance

Use semantic relation fields such as `implements`, `evidences`, `governs`, `derived_from`, and `affected_entities`. Do not use a generic `related` field because it loses why two nodes are connected.

Raw observations and operator records remain evidence. Derived classifications, scores, and graph edges must retain their classifier version and evidence instead of overwriting raw facts.

External sources belong in `source_urls`. Repository-local relationships use stable document IDs rather than file paths, so links survive file moves.

## Validation

Run `npm run knowledge:lint`. The same check is included in `npm run check` and CI. There is no hand-maintained index file; a future KG loader should discover frontmatter documents directly.
