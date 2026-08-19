import type { Observation, TrapDocument } from "./domain";

export interface ObservationSummary {
  overview: Array<Record<string, unknown>>;
  byActor: Array<Record<string, unknown>>;
  byTrap: Array<Record<string, unknown>>;
  primaryAttention: Array<Record<string, unknown>>;
  convergence: Array<Record<string, unknown>>;
  calibrationRecall: Array<Record<string, unknown>>;
}

export interface CalibrationAttempt {
  id: string;
  attemptedAt: string;
  actorFamily: string;
  product: string;
  trapId: string;
  promptClass: "direct_url" | "natural_question";
  expectedMode: "user_fetcher" | "search_indexer";
}

export interface ObservationStore {
  record(trap: TrapDocument, observation: Observation): Promise<void>;
  summary(since: string): Promise<ObservationSummary>;
  providerRanges(actorFamily: string, actorMode: string): Promise<string[]>;
  deleteObservationsBefore(cutoff: string): Promise<number>;
  recordCalibrationAttempt(trap: TrapDocument, attempt: CalibrationAttempt): Promise<void>;
}

export class D1ObservationStore implements ObservationStore {
  constructor(private readonly db: D1Database) {}

  async record(trap: TrapDocument, observation: Observation): Promise<void> {
    await this.db.batch([
      ...this.upsertTrapStatements(trap, observation.observedAt),
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

  private upsertTrapStatements(trap: TrapDocument, createdAt: string): D1PreparedStatement[] {
    return [
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
          createdAt,
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
    ];
  }

  async summary(since: string): Promise<ObservationSummary> {
    const [overview, byActor, byTrap, primaryAttention, convergence, calibrationRecall] = await this.db.batch([
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
      this.db.prepare(
        `SELECT a.actor_family, a.product, a.prompt_class,
                COUNT(*) AS attempts,
                SUM(CASE WHEN EXISTS (
                  SELECT 1 FROM observations o
                  WHERE o.experiment_source = 'calibration'
                    AND o.trap_id = a.trap_id
                    AND o.actor_family = a.actor_family
                    AND unixepoch(o.observed_at) BETWEEN unixepoch(a.attempted_at, '-5 minutes') AND unixepoch(a.attempted_at, '+30 minutes')
                ) THEN 1 ELSE 0 END) AS matched_attempts
         FROM calibration_attempts a
         WHERE a.attempted_at >= ?
         GROUP BY a.actor_family, a.product, a.prompt_class
         ORDER BY attempts DESC`,
      ).bind(since),
    ]);

    return {
      overview: rows(overview),
      byActor: rows(byActor),
      byTrap: rows(byTrap),
      primaryAttention: rows(primaryAttention),
      convergence: rows(convergence),
      calibrationRecall: rows(calibrationRecall),
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

  async recordCalibrationAttempt(trap: TrapDocument, attempt: CalibrationAttempt): Promise<void> {
    await this.db.batch([
      ...this.upsertTrapStatements(trap, attempt.attemptedAt),
      this.db
        .prepare(
          `INSERT INTO calibration_attempts (
             id, attempted_at, actor_family, product, trap_id, prompt_class, expected_mode
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          attempt.id,
          attempt.attemptedAt,
          attempt.actorFamily,
          attempt.product,
          attempt.trapId,
          attempt.promptClass,
          attempt.expectedMode,
        ),
    ]);
  }
}

function rows(result: D1Result): Array<Record<string, unknown>> {
  return result.results as Array<Record<string, unknown>>;
}
