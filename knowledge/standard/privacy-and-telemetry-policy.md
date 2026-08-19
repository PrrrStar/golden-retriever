---
id: gr:standard:privacy-and-telemetry-policy
title: "Privacy and telemetry policy"
domain: agent
topology: standard
tags: [golden-retriever, privacy, telemetry, retention, classification]
status: stable
last_updated: 2026-08-20
author: jeemin.kim
schema_version: 1
summary: "Golden Retriever telemetry의 수집 최소화, 보존 기간과 분류 한계 정책"
describes: [policy:golden-retriever-privacy-and-telemetry]
governs: [gr:project:research-and-design, gr:project:experiment-1, gr:playbook:experiment-1-operations]
---

# Privacy and telemetry policy

Golden Retriever measures aggregate retrieval attention. It does not seek personal prompts or individual identity.

## Collected

- observation timestamp
- requested trap path without query values
- normalized actor classification and matched-signature evidence, not the raw User-Agent
- coarse country and Cloudflare colo when available
- referrer hostname without path or query
- optional daily rotating HMAC of source IP
- classifier version and experiment source
- controlled calibration attempt metadata: operator family, product, trap, timestamp, expected mode, and prompt class

## Not collected

- raw IP address in storage
- raw User-Agent and Accept headers
- cookies or authorization headers
- request body
- user prompt
- complete referrer URL
- query-string values
- browser fingerprinting attributes

## Daily fingerprint

When `TELEMETRY_HMAC_KEY` is configured, the Worker computes:

```text
HMAC-SHA256(secret, YYYY-MM-DD + ":" + source IP)
```

Only a truncated digest is stored. The day is part of the input, preventing long-term linkage across days. The raw IP is discarded after request processing.

The fingerprint supports coarse repeated-access aggregation. It must not be presented as a person, account, or stable AI-agent identity.

## Retention

Initial experiment policy:

- raw privacy-minimized observations: 30 days
- exported daily aggregate snapshots: up to 180 days
- calibration records: 30 days
- any exported research dataset: aggregate-only

The scheduled Worker job deletes raw observations older than 30 days. Aggregate export automation is deferred until the public experiment has a deployment target; any manual export must remain aggregate-only.

## Classification limitations

User-Agent is a claim, not proof. UA-only classifications remain explicitly labeled. Stronger verification requires Cloudflare verified-bot evidence or matching a provider-published IP range.

Inference results must not overwrite raw observations. Reclassification creates a new classifier version or derived result.
