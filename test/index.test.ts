import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import app from "../src/index";

describe("GET /", () => {
  it("returns service info", async () => {
    const res = await app.request("/", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.service).toBe("__SERVICE_NAME__");
  });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await app.request("/health", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});
