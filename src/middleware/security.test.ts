import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import helmet from "koa-helmet";
import ratelimit from "koa-ratelimit";
import { router } from "../routes";
import { errorHandler } from "./errorHandler";
import { rateLimiter } from "./rateLimit";

// Mock the faceit service
vi.mock("../services/faceit", () => ({
  ORGANIZERS: { ESEA: "esea-org-id" },
  getPlayerById: vi.fn(),
  searchPlayers: vi.fn(),
  getPlayerEseaSeasons: vi.fn(),
  getPlayerStatsForCompetition: vi.fn(),
}));

import { searchPlayers } from "../services/faceit";
const mockSearchPlayers = vi.mocked(searchPlayers);

const createTestApp = (options: {
  allowedOrigins?: string[];
  includeRateLimiter?: boolean;
}): ReturnType<Koa["callback"]> => {
  const app = new Koa();

  const corsOptions = {
    origin: (ctx: Koa.Context): string | false => {
      const requestOrigin = ctx.get("Origin");
      const allowedOrigins = options.allowedOrigins || [];

      if (allowedOrigins.length === 0) {
        return requestOrigin || "*";
      }

      if (allowedOrigins.includes(requestOrigin)) {
        return requestOrigin;
      }

      return false;
    },
  };

  app.use(errorHandler);
  app.use(helmet());
  if (options.includeRateLimiter) {
    app.use(rateLimiter);
  }
  app.use(cors(corsOptions));
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());
  return app.callback();
};

describe("Security Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Helmet Security Headers", () => {
    it("should set X-Content-Type-Options header", async () => {
      const response = await request(createTestApp({})).get("/health");

      expect(response.status).toBe(200);
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
    });

    it("should set X-Frame-Options header", async () => {
      const response = await request(createTestApp({})).get("/health");

      expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    });

    it("should set X-XSS-Protection header", async () => {
      const response = await request(createTestApp({})).get("/health");

      expect(response.headers["x-xss-protection"]).toBeDefined();
    });
  });

  describe("CORS Configuration", () => {
    it("should allow requests from allowed origins", async () => {
      const allowedOrigin = "https://my-app.web.app";
      const response = await request(
        createTestApp({ allowedOrigins: [allowedOrigin] })
      )
        .get("/health")
        .set("Origin", allowedOrigin);

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBe(
        allowedOrigin
      );
    });

    it("should NOT set Access-Control-Allow-Origin for disallowed origins", async () => {
      const allowedOrigin = "https://my-app.web.app";
      const disallowedOrigin = "https://malicious.com";

      const response = await request(
        createTestApp({ allowedOrigins: [allowedOrigin] })
      )
        .get("/health")
        .set("Origin", disallowedOrigin);

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("should allow all origins when no ALLOWED_ORIGINS configured", async () => {
      const response = await request(createTestApp({ allowedOrigins: [] }))
        .get("/health")
        .set("Origin", "https://any-origin.com");

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBe(
        "https://any-origin.com"
      );
    });
  });

  describe("Rate Limiting", () => {
    it("should include rate limit headers", async () => {
      const response = await request(
        createTestApp({ includeRateLimiter: true })
      ).get("/health");

      expect(response.status).toBe(200);
      expect(response.headers["x-ratelimit-limit"]).toBeDefined();
      expect(response.headers["x-ratelimit-remaining"]).toBeDefined();
    });

    it("should return 429 when rate limit exceeded", async () => {
      const db = new Map();
      const strictRateLimiter = ratelimit({
        driver: "memory",
        db: db,
        duration: 60000,
        max: 2,
        errorMessage: {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        id: (ctx) => ctx.ip,
      });

      const app = new Koa();
      app.use(errorHandler);
      app.use(strictRateLimiter);
      app.use(router.routes());
      const testApp = app.callback();

      await request(testApp).get("/health");
      await request(testApp).get("/health");
      const response = await request(testApp).get("/health");

      expect(response.status).toBe(429);
      expect(response.body.error).toBe("Too many requests");
    });
  });

  describe("Input Validation", () => {
    it("should reject invalid characters in nickname", async () => {
      const response = await request(createTestApp({}))
        .get("/players/search")
        .query({ nickname: "<script>alert(1)</script>" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation error");
      expect(response.body.details[0].message).toContain("invalid characters");
    });

    it("should reject invalid characters in playerId", async () => {
      const response = await request(createTestApp({})).get(
        "/players/<script>"
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation error");
    });

    it("should accept valid alphanumeric playerId", async () => {
      const { getPlayerById } = await import("../services/faceit");
      vi.mocked(getPlayerById).mockResolvedValueOnce({
        player_id: "valid-player-123",
        nickname: "TestPlayer",
        avatar: "https://example.com/avatar.jpg",
        country: "US",
      });

      const response = await request(createTestApp({})).get(
        "/players/valid-player-123"
      );

      expect(response.status).toBe(200);
    });

    it("should accept valid nickname with spaces and dots", async () => {
      mockSearchPlayers.mockResolvedValueOnce({ items: [] });

      const response = await request(createTestApp({}))
        .get("/players/search")
        .query({ nickname: "Player Name.123" });

      expect(response.status).toBe(200);
    });

    it("should reject invalid game parameter", async () => {
      const response = await request(createTestApp({}))
        .get("/players/search")
        .query({ nickname: "TestPlayer", game: "valorant" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation error");
      expect(response.body.details[0].message).toContain("cs2");
    });

    it("should accept valid game parameter cs2", async () => {
      mockSearchPlayers.mockResolvedValueOnce({ items: [] });

      const response = await request(createTestApp({}))
        .get("/players/search")
        .query({ nickname: "TestPlayer", game: "cs2" });

      expect(response.status).toBe(200);
    });

    it("should accept valid game parameter csgo", async () => {
      mockSearchPlayers.mockResolvedValueOnce({ items: [] });

      const response = await request(createTestApp({}))
        .get("/players/search")
        .query({ nickname: "TestPlayer", game: "csgo" });

      expect(response.status).toBe(200);
    });
  });
});
