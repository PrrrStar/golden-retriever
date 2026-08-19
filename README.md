# Golden Retriever

Golden Retriever is an experiment for measuring whether public information utilities attract real AI retrieval traffic.

The first milestone is deliberately small:

```text
Trap -> HTTP request -> observation -> classification -> D1 -> aggregation
```

It does not predict trends, call an LLM per request, or require a graph database.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:local
npm run check
npm run dev
```

The initial pages are calibration traps. Their traffic is labeled `calibration` and excluded from organic experiment metrics.

Useful endpoints:

- `/` — trap catalog
- `/concept/golden-retriever-calibration` — dictionary HTML trap
- `/now/golden-retriever-calibration` — current-context HTML trap
- `/relation/golden-retriever-calibration` — relation HTML trap
- `/timeline/golden-retriever-calibration` — timeline HTML trap
- `/api/concepts/golden-retriever-calibration.json` — structured JSON-LD trap
- `/robots.txt` — allow search/user fetchers, block training crawlers
- `/sitemap.xml` — discoverable trap URLs
- `/healthz` — health check
- `/api/admin/summary` — protected aggregate output
- `POST /api/admin/calibration-attempts` — record a controlled fetch attempt without prompt text
- `POST /api/admin/provider-ranges/sync` — refresh official provider IP ranges

For local development, copy `.dev.vars.example` to the ignored `.dev.vars` file and replace both values. For deployment, set `ADMIN_TOKEN` and `TELEMETRY_HMAC_KEY` as Worker secrets. The latter produces a daily rotating request fingerprint without retaining raw IP addresses.

```bash
printf '%s' 'local-admin-token' | npx wrangler secret put ADMIN_TOKEN
printf '%s' 'replace-with-a-long-random-secret' | npx wrangler secret put TELEMETRY_HMAC_KEY
```

Do not use those example values outside local development.

Before each controlled calibration fetch, register its denominator event:

```bash
curl -X POST http://localhost:8787/api/admin/calibration-attempts \
  -H 'Authorization: Bearer local-admin-token' \
  -H 'Content-Type: application/json' \
  --data '{"actorFamily":"openai","product":"ChatGPT","path":"/concept/golden-retriever-calibration","promptClass":"direct_url","expectedMode":"user_fetcher"}'
```

Only `direct_url` or `natural_question` prompt classes are accepted. Prompt text is intentionally not accepted or stored.

## Knowledge

Project knowledge is stored once under `knowledge/`, organized by document topology and validated for future Knowledge Graph ingestion.

- [Research and design](knowledge/project/golden-retriever/research-and-design.md)
- [Experiment 1](knowledge/project/golden-retriever/experiment-1.md)
- [Experiment 1 operations](knowledge/playbook/experiment-1-operations.md)
- [Experiment 1 public start](knowledge/event/experiment-1-public-start-20260820.md)
- [Privacy and telemetry policy](knowledge/standard/privacy-and-telemetry-policy.md)
- [Knowledge document convention](knowledge/standard/knowledge-document-convention.md)
- [Public site entity card](knowledge/entities/golden-retriever-site.md)

## Deployment boundary

The repository contains deployable Cloudflare Workers and D1 configuration, but creating a Cloudflare database, setting production secrets, attaching a domain, and deploying are separate operational actions.

The same Worker can be packaged for OpenAI Sites. `.openai/hosting.json` declares the logical `DB` binding, `npm run build` emits the Worker-compatible Sites entrypoint, and `drizzle/` contains the ordered D1 migrations.
