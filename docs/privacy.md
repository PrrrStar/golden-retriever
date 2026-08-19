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
