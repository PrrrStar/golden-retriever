import type { Subject, TrapDocument } from "./domain";

const subject: Subject = {
  id: "subject:golden-retriever-calibration",
  slug: "golden-retriever-calibration",
  kind: "concept",
  canonicalName: "Golden Retriever retrieval calibration",
  aliases: ["retriever calibration"],
};

const publishedAt = "2026-08-19T00:00:00.000Z";

export const traps: TrapDocument[] = [
  {
    id: "trap:dictionary:golden-retriever-calibration",
    slug: "golden-retriever-calibration",
    kind: "dictionary",
    subject,
    title: "Golden Retriever retrieval calibration이란?",
    summary: "AI 검색·에이전트의 공개 웹 retrieval 요청을 측정하기 위한 Golden Retriever의 공개 캘리브레이션 문서다.",
    body: [
      "이 페이지는 유행이나 사실을 주장하지 않는다. 서로 다른 정보 형식이 실제 AI retrieval 요청을 유발하는지 비교하기 위한 실험용 문서다.",
      "관측값은 콘텐츠 주제, Trap 형식, 요청 시각, 식별 가능한 자동화 주체 분류처럼 집계 가능한 신호로만 사용한다.",
    ],
    related: [
      { label: "왜 지금 이 개념을 확인하나요?", href: "/now/golden-retriever-calibration" },
      { label: "실험 타임라인", href: "/timeline/golden-retriever-calibration" },
    ],
    experimentSource: "calibration",
    publishedAt,
    updatedAt: publishedAt,
  },
  {
    id: "trap:current-context:golden-retriever-calibration",
    slug: "golden-retriever-calibration",
    kind: "current_context",
    subject,
    title: "왜 Golden Retriever retrieval calibration을 하나요?",
    summary: "실제 사용자 질문에 연동된 AI fetch와 대규모 학습 crawler를 분리해 측정할 수 있는지 검증하기 위해서다.",
    body: [
      "첫 가설은 공개 utility 문서의 형식에 따라 AI retrieval 주체의 접근 패턴이 달라진다는 것이다.",
      "캘리브레이션 트래픽은 organic trend 신호에서 분리되며 제품 성과로 보고하지 않는다.",
    ],
    related: [
      { label: "용어 정의", href: "/concept/golden-retriever-calibration" },
      { label: "구조화 데이터", href: "/api/concepts/golden-retriever-calibration.json" },
    ],
    experimentSource: "calibration",
    publishedAt,
    updatedAt: publishedAt,
  },
  {
    id: "trap:relation:golden-retriever-calibration",
    slug: "golden-retriever-calibration",
    kind: "relation",
    subject,
    title: "AI Retriever와 attention signal은 어떤 관계인가요?",
    summary: "Retriever의 공개 정보 접근은 관심의 약한 관측치이며, 독립 주체 수렴과 시간 변화가 함께 있을 때만 후보 신호가 된다.",
    body: [
      "단일 User-Agent 요청량은 관심을 증명하지 않는다. 주체 family, 동작 mode, 검증 수준과 Trap을 함께 보존한다.",
      "사실 관계인 Knowledge Graph와 관측 관계인 Attention Graph는 분리한다.",
    ],
    related: [{ label: "실험 타임라인", href: "/timeline/golden-retriever-calibration" }],
    experimentSource: "calibration",
    publishedAt,
    updatedAt: publishedAt,
  },
  {
    id: "trap:timeline:golden-retriever-calibration",
    slug: "golden-retriever-calibration",
    kind: "timeline",
    subject,
    title: "Golden Retriever Experiment 1 타임라인",
    summary: "캘리브레이션, 공개 배치, 수동 관측, 판정 순서로 진행하는 2주 실험이다.",
    body: [
      "1~3일: 분류와 수집 경로를 캘리브레이션한다.",
      "4~10일: 여러 Trap 형식을 같은 조건으로 공개하고 관측한다.",
      "11~14일: 독립 주체 수렴, 반복 사용, 외부 관심 변화와의 시간차를 평가한다.",
    ],
    related: [{ label: "용어 정의", href: "/concept/golden-retriever-calibration" }],
    experimentSource: "calibration",
    publishedAt,
    updatedAt: publishedAt,
  },
];

const prefixes: Record<string, TrapDocument["kind"]> = {
  concept: "dictionary",
  now: "current_context",
  relation: "relation",
  timeline: "timeline",
};

export function findTrap(pathname: string): { trap: TrapDocument; format: "html" | "json" } | undefined {
  const apiMatch = pathname.match(/^\/api\/concepts\/([^/]+)\.json$/);
  if (apiMatch) {
    const base = traps.find((trap) => trap.kind === "dictionary" && trap.slug === apiMatch[1]);
    return base ? { trap: { ...base, id: `trap:structured-data:${base.slug}`, kind: "structured_data" }, format: "json" } : undefined;
  }

  const match = pathname.match(/^\/(concept|now|relation|timeline)\/([^/]+)\/?$/);
  if (!match) return undefined;
  const kind = prefixes[match[1]];
  const trap = traps.find((candidate) => candidate.kind === kind && candidate.slug === match[2]);
  return trap ? { trap, format: "html" } : undefined;
}
