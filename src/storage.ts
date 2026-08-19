import type { Observation, TrapDocument } from "./domain";

export interface ObservationSummary {
  overview: Array<Record<string, unknown>>;
  byActor: Array<Record<string, unknown>>;
  byTrap: Array<Record<string, unknown>>;
  primaryAttention: Array<Record<string, unknown>>;
  convergence: Array<Record<string, unknown>>;
}

export interface ObservationStore {
  record(trap: TrapDocument, observation: Observation): Promise<void>;
  summary(since: string): Promise<ObservationSummary>;
  providerRanges(actorFamily: string, actorMode: string): Promise<string[]>;
  deleteObservationsBefore(cutoff: string): Promise<number>;
}

export class D1ObservationStore implements ObservationStore {
  constructor(private readonly db: D1Database) {}

  async record(trap: TrapDocument, observation: Observation): Promise<void> {
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO subjects (id, slug, kind, canonical_name, aliases_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             slug = excluded.slug,
             kind = excluded.kind,
             canonical_name = excluded.canonical_name,
             aliases_json = excluded.aliases_json`,
        )
        .bind(
          trap.subject.id,
          trap.subject.slug,
          trap.subject.kind,
          trap.subject.canonicalName,
          JSON.stringify(trap.subject.aliases),
          observation.observedAt,
        ),
      this.db
        .prepare(
          `INSERT INTO traps (id, subject_id, slug, kind, experiment_source, published_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             subject_id = excluded.subject_id,
             slug = excluded.slug,
             kind = excluded.kind,
             experiment_source = excluded.experiment_source,
             published_at = excluded.published_at,
             updated_at = excluded.updated_at`,
        )
        .bind(
          trap.id,
          trap.subject.id,
          trap.slug,
          trap.kind,
          trap.experimentSource,
          trap.publishedAt,
          trap.updatedAt,
        ),
      this.db
        .prepare(
          `INSERT INTO observations (
             id, observed_at, subject_id, trap_id, trap_kind, experiment_source,
             actor_family, actor_mode, verification_level, classifier_version,
             request_method, response_format, country, colo, referer_host,
             client_hash, evidence_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          observation.id,
          observation.observedAt,
          observation.subjectId,
          observation.trapId,
          observation.trapKind,
          observation.experimentSource,
          observation.actorFamily,
          observation.actorMode,
          observation.verificationLevel,
          observation.classifierVersion,
          observation.requestMethod,
          observation.responseFormat,
          observation.country ?? null,
          observation.colo ?? null,
          observation.refererHost ?? null,
          observation.clientHash ?? null,
          JSON.stringify(observation.evidence),
        ),
    ]);
  }

  async summary(since: string): Promise<ObservationSummary> {
    const [overview, byActor, byTrap, primaryAttention, convergence] = await this.db.batch([
      this.db.prepare(
        `SELECT experiment_source, COUNT(*) AS requests,
                COUNT(DISTINCT client_hash) AS daily_clients,
                COUNT(DISTINCT actor_family) AS actor_families
         FROM observations WHERE observed_at >= ?
         GROUP BY experiment_source ORDER BY requests DESC`,
      ).bind(since),
      this.db.prepare(
        `SELECT actor_family, actor_mode, verification_level, COUNT(*) AS requests,
                COUNT(DISTINCT client_hash) AS daily_clients
         FROM observations WHERE observed_at >= ?
         GROUP BY actor_family, actor_mode, verification_level ORDER BY requests DESC`,
      ).bind(since),
      this.db.prepare(
        `SELECT trap_kind, experiment_source, COUNT(*) AS requests,
                COUNT(DISTINCT actor_family) AS actor_families
         FROM observations WHERE observed_at >= ?
         GROUP BY trap_kind, experiment_source ORDER BY requests DESC`,
      ).bind(since),
      this.db.prepare(
        `SELECT subject_id, trap_kind, actor_family, COUNT(*) AS requests,
                COUNT(DISTINCT client_hash) AS daily_clients
         FROM observations
         WHERE observed_at >= ?
           AND experiment_source = 'organic'
           AND actor_mode = 'user_fetcher'
           AND verification_level IN ('cf_verified', 'provider_ip_verified')
         GROUP BY subject_id, trap_kind, actor_family
         ORDER BY requests DESC`,
      ).bind(since),
      this.db.prepare(
        `SELECT subject_id, COUNT(DISTINCT actor_family) AS actor_families,
                COUNT(*) AS requests
         FROM observations
         WHERE observed_at >= ?
           AND experiment_source = 'organic'
           AND actor_mode = 'user_fetcher'
           AND verification_level IN ('cf_verified', 'provider_ip_verified')
         GROUP BY subject_id HAVING actor_families >= 2
         ORDER BY actor_families DESC, requests DESC`,
      ).bind(since),
    ]);

    return {
      overview: rows(overview),
      byActor: rows(byActor),
      byTrap: rows(byTrap),
      primaryAttention: rows(primaryAttention),
      convergence: rows(convergence),
    };
  }

  async providerRanges(actorFamily: string, actorMode: string): Promise<string[]> {
    const result = await this.db
      .prepare(
        `SELECT prefix FROM provider_network_ranges
         WHERE actor_family = ? AND actor_mode = ?`,
      )
      .bind(actorFamily, actorMode)
      .all<{ prefix: string }>();
    return result.results.map(({ prefix }) => prefix);
  }

  async deleteObservationsBefore(cutoff: string): Promise<number> {
    const result = await this.db.prepare("DELETE FROM observations WHERE observed_at < ?").bind(cutoff).run();
    return result.meta.changes;
  }
}

function rows(result: D1Result): Array<Record<string, unknown>> {
  return result.results as Array<Record<string, unknown>>;
}
