import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { loadEnv } from "./env.js";

const SECRET = "test-webhook-secret";
const app = buildApp(loadEnv({ NODE_ENV: "test", LOG_LEVEL: "fatal", HELIUS_WEBHOOK_SECRET: SECRET }));
afterAll(() => app.close());

const sig = "5".repeat(88);

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("ok");
  });
});

describe("POST /webhooks/helius", () => {
  it("rejects a missing or wrong secret", async () => {
    const none = await app.inject({ method: "POST", url: "/webhooks/helius", payload: [] });
    const wrong = await app.inject({
      method: "POST", url: "/webhooks/helius", payload: [], headers: { authorization: "nope" },
    });
    expect(none.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
  });

  it("rejects a malformed payload", async () => {
    const res = await app.inject({
      method: "POST", url: "/webhooks/helius", headers: { authorization: SECRET },
      payload: { not: "an array" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("acks a valid batch", async () => {
    const res = await app.inject({
      method: "POST", url: "/webhooks/helius", headers: { authorization: SECRET },
      payload: [{ signature: sig, type: "SWAP", timestamp: 1_790_000_000, extra: "kept" }],
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: 1 });
  });

  it("refuses to run unauthenticated when no secret is configured", async () => {
    const open = buildApp(loadEnv({ NODE_ENV: "test", LOG_LEVEL: "fatal" }));
    const res = await open.inject({ method: "POST", url: "/webhooks/helius", payload: [] });
    expect(res.statusCode).toBe(503);
    await open.close();
  });
});

describe("loadEnv", () => {
  it("requires third-party keys in production", () => {
    expect(() => loadEnv({ NODE_ENV: "production" })).toThrow(/HELIUS_API_KEY/);
  });
});

describe("loadEnv with a freshly copied .env.example", () => {
  it("treats empty values as unset in development", () => {
    const env = loadEnv({ NODE_ENV: "development", HELIUS_API_KEY: "", SUPABASE_URL: "http://127.0.0.1:54321" });
    expect(env.HELIUS_API_KEY).toBeUndefined();
  });
});
