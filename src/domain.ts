export type SubjectKind = "concept" | "entity" | "event" | "story";

export type TrapKind =
  | "dictionary"
  | "current_context"
  | "relation"
  | "timeline"
  | "structured_data";

export type ExperimentSource = "organic" | "calibration" | "self_eval";

export type ActorMode =
  | "training_crawler"
  | "search_indexer"
  | "user_fetcher"
  | "generic_search"
  | "human_browser"
  | "unknown_bot"
  | "unknown";

export type VerificationLevel =
  | "cf_verified"
  | "provider_ip_verified"
  | "ua_only"
  | "unknown";

export interface Subject {
  id: string;
  slug: string;
  kind: SubjectKind;
  canonicalName: string;
  aliases: string[];
}
export interface TrapDocument {
  id: string;
  slug: string;
  kind: TrapKind;
  subject: Subject;
  title: string;
  summary: string;
  body: string[];
  related: Array<{ label: string; href: string }>;
  experimentSource: ExperimentSource;
  publishedAt: string;
  updatedAt: string;
}

export interface Classification {
  actorFamily: string;
  actorMode: ActorMode;
  verificationLevel: VerificationLevel;
  classifierVersion: string;
  evidence: string[];
}

export interface RequestContext {
  ip?: string;
  country?: string;
  colo?: string;
  cfVerifiedBot: boolean;
}

export interface Observation {
  id: string;
  observedAt: string;
  subjectId: string;
  trapId: string;
  trapKind: TrapKind;
  experimentSource: ExperimentSource;
  actorFamily: string;
  actorMode: ActorMode;
  verificationLevel: VerificationLevel;
  classifierVersion: string;
  requestMethod: string;
  responseFormat: "html" | "json";
  country?: string;
  colo?: string;
  refererHost?: string;
  clientHash?: string;
  evidence: string[];
}
