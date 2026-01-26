import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import Koa from "koa";
import Router from "@koa/router";
import { createApiKeyAuth } from "./apiKeyAuth";

const createTestApp = (options: {
  apiKey: string;
  excludePaths?: string[];
}): ReturnType<Koa["callback"]> => {
  const app = new Koa();
  const router = new Router();

  router.get("/health", (ctx) => {
    ctx.body = { status: "ok" };
  });

  router.get("/api/test", (ctx) => {
    ctx.body = { message: "success" };
  });

  router.get("/docs", (ctx) => {
    ctx.body = { docs: "api documentation" };
  });

  app.use(createApiKeyAuth(options));
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app.callback();
};

describe("API Key Authentication Middleware", () => {
  const validApiKey = "test-api-key-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Valid API Key", () => {
    it("should allow access with valid API key", async () => {
      const response = await request(createTestApp({ apiKey: validApiKey }))
        .get("/api/test")
        .set("X-API-Key", validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("success");
    });

    it("should allow access with API key on any protected route", async () => {
      const response = await request(createTestApp({ apiKey: validApiKey }))
        .get("/api/test")
        .set("X-API-Key", validApiKey);

      expect(response.status).toBe(200);
    });
  });

  describe("Missing API Key", () => {
    it("should return 401 when API key is missing", async () => {
      const response = await request(
        createTestApp({ apiKey: validApiKey })
      ).get("/api/test");

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe(
        "Unauthorized: Invalid or missing API key"
      );
      expect(response.body.error.status).toBe(401);
    });
  });

  describe("Invalid API Key", () => {
    it("should return 401 when API key is invalid", async () => {
      const response = await request(createTestApp({ apiKey: validApiKey }))
        .get("/api/test")
        .set("X-API-Key", "wrong-key");

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe(
        "Unauthorized: Invalid or missing API key"
      );
    });

    it("should return 401 when API key is empty string", async () => {
      const response = await request(createTestApp({ apiKey: validApiKey }))
        .get("/api/test")
        .set("X-API-Key", "");

      expect(response.status).toBe(401);
    });
  });

  describe("Excluded Paths", () => {
    it("should bypass auth for excluded paths", async () => {
      const response = await request(
        createTestApp({ apiKey: validApiKey, excludePaths: ["/health"] })
      ).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
    });

    it("should bypass auth for paths starting with excluded prefix", async () => {
      const response = await request(
        createTestApp({ apiKey: validApiKey, excludePaths: ["/docs"] })
      ).get("/docs");

      expect(response.status).toBe(200);
    });

    it("should still require auth for non-excluded paths", async () => {
      const response = await request(
        createTestApp({ apiKey: validApiKey, excludePaths: ["/health"] })
      ).get("/api/test");

      expect(response.status).toBe(401);
    });

    it("should handle multiple excluded paths", async () => {
      const app = createTestApp({
        apiKey: validApiKey,
        excludePaths: ["/health", "/docs"],
      });

      const healthResponse = await request(app).get("/health");
      expect(healthResponse.status).toBe(200);

      const docsResponse = await request(app).get("/docs");
      expect(docsResponse.status).toBe(200);
    });
  });

  describe("Error Response Format", () => {
    it("should return properly formatted error response", async () => {
      const response = await request(
        createTestApp({ apiKey: validApiKey })
      ).get("/api/test");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: {
          message: "Unauthorized: Invalid or missing API key",
          status: 401,
        },
      });
    });
  });
});
