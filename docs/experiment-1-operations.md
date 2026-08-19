# Experiment 1 operations

This runbook turns the design in `experiment-1.md` into a repeatable 14-day operation. It intentionally avoids a dashboard, request-time LLM calls, and new infrastructure.

## Current deployment state

- Sites project and D1 binding are provisioned.
- Version 1 passed a production health, Trap response, observation-write, and aggregate-read smoke test.
- Provider-published OpenAI, Anthropic, and Perplexity network ranges were loaded successfully.
- Access is public. The experiment clock started after anonymous retrieval and production D1 writes were verified; see `experiment-1-log.md`.

## Operator environment

Keep the production URL and admin token outside the repository:

```bash
export GOLDEN_RETRIEVER_URL='https://golden-retriever.jmeef0802.chatgpt.site'
export GOLDEN_RETRIEVER_ADMIN_TOKEN='the-same-value-configured-as-the-hosted-secret'
```

Never put the admin token in a URL, commit, issue, or captured experiment artifact.
Hosted secrets are write-only. If the original value is unavailable, rotate `ADMIN_TOKEN` in Sites and use the new value locally.

## T-1 — before public access

1. Confirm the deployed version matches GitHub `main`.
2. Confirm `/healthz` returns HTTP 200 and all readiness fields are true.
3. Refresh official provider ranges:

   ```bash
   curl --fail-with-body -X POST \
     -H "Authorization: Bearer $GOLDEN_RETRIEVER_ADMIN_TOKEN" \
     "$GOLDEN_RETRIEVER_URL/api/admin/provider-ranges/sync"
   ```

4. Verify `/robots.txt`, `/sitemap.xml`, all four HTML calibration Traps, and JSON-LD return HTTP 200 anonymously.
5. Confirm the site is public before treating any request as experiment traffic. A signed-in or bypass-token request is calibration, not organic attention.

The Worker has a Wrangler cron for direct Cloudflare Workers deployment. The current Sites packaging does not prove that cron is attached, so provider-range refresh is an explicit daily operation for Experiment 1. The 30-day raw retention limit does not expire data during a 14-day run; perform cleanup before extending the experiment.

## Phase 0 — calibration

Register each controlled attempt immediately before asking a product to fetch a calibration Trap:

```bash
curl --fail-with-body -X POST \
  -H "Authorization: Bearer $GOLDEN_RETRIEVER_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{
    "actorFamily": "openai",
    "product": "ChatGPT",
    "path": "/concept/golden-retriever-calibration",
    "promptClass": "direct_url",
    "expectedMode": "user_fetcher"
  }' \
  "$GOLDEN_RETRIEVER_URL/api/admin/calibration-attempts"
```

Allowed prompt classes are `direct_url` and `natural_question`. Do not record prompt text. Run at most three attempts per product and condition.

Read the result:

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $GOLDEN_RETRIEVER_ADMIN_TOKEN" \
  "$GOLDEN_RETRIEVER_URL/api/admin/summary?since=2026-08-20T00:00:00%2B09:00"
```

Proceed only when products that actually issue HTTP fetches reach at least 80% matched calibration attempts. A product that answers without fetching is recorded in the operator log but excluded from HTTP instrumentation recall.

## Public day 0

Record these timestamps in the experiment log:

- access policy changed to public
- first anonymous health and Trap smoke tests
- sitemap submission time for each search console
- content batch publication time
- provider-range refresh time

Do not count signed-in owner smoke requests as organic observations.

## Daily checks

Run once in a fixed KST window:

1. Check `/healthz`.
2. Refresh provider ranges and record partial failures.
3. Export `/api/admin/summary` from the experiment start time.
4. Check `calibrationRecall`, `byActor`, `byTrap`, `primaryAttention`, and `convergence` separately.
5. Treat `ua_only` as unverified. It may support debugging but cannot satisfy primary attention or convergence criteria.
6. Record content changes, sitemap actions, outages, classifier changes, and controlled requests in the operator log.
7. Do not change the classifier without incrementing `classifier_version` and recording the intervention time.

## Decision rules

- A verified `user_fetcher` observation may count as primary attention.
- Training crawlers and search indexers are discoverability or guardrail signals, not primary attention.
- Convergence requires at least two verified user-fetcher operator families on one organic subject inside the selected window.
- Calibration and self-evaluation never count as organic convergence.
- Total crawler requests alone cannot produce a proceed decision.

## Incident handling

- Health fails: stop interpreting traffic until D1 and secrets are healthy again.
- Observation writes fail: preserve application logs, mark the time range invalid, and repair instrumentation before continuing.
- Provider refresh partially fails: retain the last good snapshot, report the failed source, and retry once later in the daily window.
- UA-only traffic dominates: improve verification; do not publish more Traps to compensate.
- Suspected token leak: rotate the hosted `ADMIN_TOKEN` immediately and do not rewrite Git history unless a token was committed.

## Day 14 closeout

1. Freeze the experiment end timestamp.
2. Export aggregate-only results for 6h, 24h, 72h, and full-run windows.
3. Record indexed Trap count and time-to-first-indexer observation.
4. Apply the proceed, iterate, or stop criteria from `experiment-1.md`.
5. If the run extends beyond 30 days, verify raw-observation retention cleanup before extension.
