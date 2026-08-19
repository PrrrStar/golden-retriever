import { describe, expect, it } from "vitest";
import worker, { type Env } from "../src/index";

class FakeStatement {
  values: unknown[] = [];
  constructor(readonly query: string) {}
  bind(...values: unknown[]): FakeStatement {
    this.values = values;
    return this;
  }
  async all<T>(): Promise<D1Result<T>> {
    return { results: [], success: true, meta: {} } as unknown as D1Result<T>;
  }
  async first<T>(): Promise<T | null> { return { ok: 1 } as T; }
}

class FakeDatabase {
  batches: FakeStatement[][] = [];
  prepare(query: string): FakeStatement {
    return new FakeStatement(query);
  }
  async batch(statements: FakeStatement[]): Promise<D1Result[]> {
    this.batches.push(statements);
    return statements.map(() => ({ results: [], success: true, meta: {} })) as unknown as D1Result[];
  }
}

function harness() {
  const database = new FakeDatabase();
  const pending: Promise<unknown>[] = [];
  const env = {
    DB: database as unknown as D1Database,
    ADMIN_TOKEN: "admin-secret",
    TELEMETRY_HMAC_KEY: "telemetry-secret",
    SITE_ORIGIN: "https://golden.example",
  } satisfies Env;
  const context = {
    waitUntil(promise: Promise<unknown>) { pending.push(promise); },
    passThroughOnException() {},
    props: {},
  } as unknown as ExecutionContext;
  return { database, pending, env, context };
}

describe("worker", () => {
  it("serves an HTML trap and records one observation batch", async () => {
    const { database, pending, env, context } = harness();
    const request = new Request("https://golden.example/concept/golden-retriever-calibration", {
      headers: {
        "User-Agent": "ChatGPT-User/1.0",
        "CF-Connecting-IP": "203.0.113.10",
        Referer: "https://chatgpt.com/c/secret",
      },
    });
    const response = await worker.fetch(request, env, context);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(await response.text()).toContain("retrieval calibration");
    await Promise.all(pending);
    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(3);
    const observation = database.batches[0][2];
    expect(observation.values).toContain("openai");
    expect(observation.values).toContain("user_fetcher");
    expect(observation.values).not.toContain("203.0.113.10");
  });

  it("serves structured JSON and robots policy", async () => {
    const { env, context } = harness();
    const structured = await worker.fetch(
      new Request("https://golden.example/api/concepts/golden-retriever-calibration.json"),
      env,
      context,
    );
    expect(structured.headers.get("Content-Type")).toContain("application/ld+json");
    expect((await structured.json()) as Record<string, unknown>).toMatchObject({ "@type": "DefinedTerm" });

    const robots = await worker.fetch(new Request("https://golden.example/robots.txt"), env, context);
    const body = await robots.text();
    expect(body).toContain("User-agent: GPTBot\nDisallow: /");
    expect(body).toContain("User-agent: ChatGPT-User\nAllow: /");
  });

  it("protects the aggregate endpoint", async () => {
    const { env, context } = harness();
    const denied = await worker.fetch(new Request("https://golden.example/api/admin/summary"), env, context);
    expect(denied.status).toBe(401);

    const allowed = await worker.fetch(new Request("https://golden.example/api/admin/summary", {
      headers: { Authorization: "Bearer admin-secret" },
    }), env, context);
    expect(allowed.status).toBe(200);
    expect((await allowed.json()) as Record<string, unknown>).toHaveProperty("convergence");
  });

  it("records a calibration attempt without accepting prompt text", async () => {
    const { database, env, context } = harness();
    const response = await worker.fetch(new Request("https://golden.example/api/admin/calibration-attempts", {
      method: "POST",
      headers: { Authorization: "Bearer admin-secret", "Content-Type": "application/json" },
      body: JSON.stringify({
        actorFamily: "openai",
        product: "ChatGPT",
        path: "/concept/golden-retriever-calibration",
        promptClass: "direct_url",
        expectedMode: "user_fetcher",
      }),
    }), env, context);
    expect(response.status).toBe(201);
    expect(database.batches).toHaveLength(1);
    expect(database.batches[0][2].query).toContain("INSERT INTO calibration_attempts");
    expect(database.batches[0][2].values).not.toContain("prompt text");
  });

  it("checks database and secret configuration in health", async () => {
    const { env, context } = harness();
    const response = await worker.fetch(new Request("https://golden.example/healthz"), env, context);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, database: true, secretsConfigured: true });
  });

  it("does not accept mutation methods", async () => {
    const { env, context } = harness();
    const response = await worker.fetch(new Request("https://golden.example/", { method: "POST" }), env, context);
    expect(response.status).toBe(405);
  });
});
