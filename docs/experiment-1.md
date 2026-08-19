# Experiment 1 — can public traps attract AI retrieval?

Duration: 14 days after public deployment and indexability confirmation.

Execution checklist: [Experiment 1 operations](experiment-1-operations.md).

## Primary hypothesis

Different public information utilities can attract observable AI retrieval traffic, including user- or agent-directed fetches rather than only training and indexing crawlers.

## Secondary hypothesis

Trap kind affects the likelihood of retrieval, and independent operator families sometimes converge on the same subject during emerging attention.

## Non-goals

- predicting trends
- measuring model training
- maximizing crawler request count
- proving individual user intent
- ranking every Korean internet trend
- building a production knowledge graph

## Phase 0 — instrumentation calibration

Use only traps labeled `calibration`.

For each available product, execute a controlled request at a recorded time:

- register the attempt through the authenticated calibration endpoint; store only operator, product, trap, timestamp, expected mode, and prompt class
- ask it to fetch a calibration URL directly
- ask a natural-language question whose answer is on that URL
- repeat at most three times per operator
- record operator, product, timestamp, URL, and prompt class outside the HTTP telemetry

Calibration observations never enter organic usage or convergence metrics.

The aggregate endpoint matches an attempt to a same-family observation on the same trap from five minutes before through thirty minutes after the registered attempt. This makes the calibration denominator explicit without storing prompt text.

Pass condition: at least 80% of known fetch attempts that actually issue HTTP requests appear in storage with the expected trap and a plausible actor classification.

## Phase 1 — content set

Prepare 24–40 sourced Korean subjects. Use a balanced set:

- currently emerging subjects
- recently emerged subjects
- stable obscure controls
- stable popular controls

Do not publish invented definitions or synthetic rumors. Every factual claim needs evidence and an update timestamp.

Assign subjects across four primary trap kinds using a balanced rotation:

- dictionary
- current context
- relation
- timeline

Expose a JSON representation for every content trap. JSON is a representation-level factor, not a separate subject.

## Phase 2 — discoverability

- server-rendered HTML with a descriptive title and summary
- JSON-LD where semantically appropriate
- stable URLs
- `Last-Modified`, `ETag`, and cache headers
- linked catalog page
- XML sitemap with `lastmod`
- RSS/Atom feed when real subjects begin changing
- allow search and user fetchers in `robots.txt`
- disallow known training crawlers
- submit sitemap to available search consoles

`llms.txt` may be included as a low-cost treatment but is not assumed to drive retrieval.

## Phase 3 — passive window

After indexability is confirmed, run at least ten passive days. Do not prompt products with organic URLs during this window. If a manual check is necessary, use a calibration URL or label the affected event `self_eval`.

Content updates happen in a fixed batch window to preserve a known intervention time.

## Metrics

### Instrumentation

- known calibration fetch recall
- classification coverage
- verified versus UA-only ratio
- storage failure rate

### Discoverability

- search/index crawler presence by operator
- indexed trap count
- time from publish to first indexer observation

### Primary attention

- user-fetcher observations
- user-fetcher operator-family diversity
- subjects with two or more user-fetcher families in 6h, 24h, and 72h
- repeated daily fingerprints, reported only in aggregate
- trap-normalized observations

### Guardrail metrics

- training crawler traffic
- unknown automation traffic
- calibration and self-eval traffic
- spoof-suspected or UA-only traffic

## Success criteria

The first experiment is promising when all of the following hold:

1. Calibration recall is at least 80% for products that issue an HTTP fetch.
2. Search/index visibility is confirmed for a meaningful portion of published traps.
3. At least one organic user-directed fetch is observed after calibration traffic is excluded.
4. At least one subject receives user-directed observations from two independent operator families within 72 hours, or the experiment produces enough user-directed traffic to estimate how far this threshold is from current volume.
5. The signal is not explained solely by one crawler repeatedly scanning the catalog.

## Failure and pivot criteria

- Indexing succeeds but organic user fetches remain zero: passive public traps are not validated; test distribution and authority before adding modeling.
- Only training/index crawlers appear: crawler telemetry is valid but the attention hypothesis is not.
- Most claimed AI traffic remains UA-only: invest in IP/detection verification, not more traps.
- Traffic is too sparse for trap comparison: extend observation time or improve distribution; do not fit a prediction model.
- Calibration fetches are missing: repair instrumentation before interpreting organic data.

## Daily checklist

1. Check health and storage errors.
2. Review calibration/self-eval isolation.
3. Review new actor signatures without automatically promoting them.
4. Check sitemap/indexing status.
5. Export aggregate counts and note content interventions.
6. Avoid changing classification rules without incrementing `classifier_version`.

## End-of-experiment decision

Choose one:

- proceed: user-directed retrieval and cross-operator evidence justify broader content and external sensors
- iterate: instrumentation works but distribution or verification is insufficient
- stop: no user-directed retrieval signal after confirmed discoverability and a passive window

Do not select “proceed” based on total crawler requests alone.
