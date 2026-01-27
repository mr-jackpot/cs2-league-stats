import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import { router } from "./index";
import { errorHandler } from "../middleware/errorHandler";

// Mock the faceit service
vi.mock("../services/faceit", () => ({
  ORGANIZERS: { ESEA: "esea-org-id" },
  getPlayerById: vi.fn(),
  searchPlayers: vi.fn(),
  getPlayerEseaSeasons: vi.fn(),
  getPlayerStatsForCompetition: vi.fn(),
}));

import {
  getPlayerById,
  searchPlayers,
  getPlayerEseaSeasons,
  getPlayerStatsForCompetition,
} from "../services/faceit";

const mockGetPlayerById = vi.mocked(getPlayerById);
const mockSearchPlayers = vi.mocked(searchPlayers);
const mockGetPlayerEseaSeasons = vi.mocked(getPlayerEseaSeasons);
const mockGetPlayerStatsForCompetition = vi.mocked(getPlayerStatsForCompetition);

// Create test app
const createApp = () => {
  const app = new Koa();
  app.use(errorHandler);
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());
  return app.callback();
};

describe("API Endpoints", () => {
  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(createApp()).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe("GET /", () => {
    it("should return API info", async () => {
      const response = await request(createApp()).get("/");

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("CS2 League Stats API");
      expect(response.body.version).toBe("1.0.0");
    });
  });

  describe("GET /players/search", () => {
    it("should search for players", async () => {
      mockSearchPlayers.mockResolvedValueOnce({
        items: [
          {
            player_id: "123",
            nickname: "TestPlayer",
            avatar: "https://example.com/avatar.jpg",
            country: "US",
          },
        ],
      });

      const response = await request(createApp())
        .get("/players/search")
        .query({ nickname: "TestPlayer" });

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].nickname).toBe("TestPlayer");
      expect(mockSearchPlayers).toHaveBeenCalledWith("TestPlayer", "cs2");
    });

    it("should return 400 when nickname is missing", async () => {
      const response = await request(createApp()).get("/players/search");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation error");
      expect(response.body.details).toBeDefined();
    });

    it("should pass game parameter", async () => {
      mockSearchPlayers.mockResolvedValueOnce({ items: [] });

      await request(createApp())
        .get("/players/search")
        .query({ nickname: "Test", game: "csgo" });

      expect(mockSearchPlayers).toHaveBeenCalledWith("Test", "csgo");
    });
  });

  describe("GET /players/:playerId", () => {
    it("should return player details", async () => {
      mockGetPlayerById.mockResolvedValueOnce({
        player_id: "player-123",
        nickname: "TestPlayer",
        avatar: "https://example.com/avatar.jpg",
        country: "US",
        cover_image: "",
        platforms: {},
        games: {},
        settings: { language: "en" },
        friends_ids: [],
        new_steam_id: "",
        steam_id_64: "",
        steam_nickname: "",
        memberships: [],
        faceit_url: "",
        membership_type: "",
        cover_featured_image: "",
        verified: false,
        activated_at: "",
      });

      const response = await request(createApp()).get("/players/player-123");

      expect(response.status).toBe(200);
      expect(response.body.player_id).toBe("player-123");
      expect(response.body.nickname).toBe("TestPlayer");
      expect(response.body.avatar).toBe("https://example.com/avatar.jpg");
      expect(response.body.country).toBe("US");
      expect(mockGetPlayerById).toHaveBeenCalledWith("player-123");
    });

    it("should handle player not found", async () => {
      mockGetPlayerById.mockRejectedValueOnce(
        new Error("FACEIT API error (404): Player not found")
      );

      const response = await request(createApp()).get("/players/unknown-id");

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe("GET /players/:playerId/esea", () => {
    it("should return ESEA seasons for a player", async () => {
      mockGetPlayerEseaSeasons.mockResolvedValueOnce([
        {
          competition_id: "comp-1",
          competition_name: "ESEA S55",
          competition_type: "championship",
          organizer_id: "esea-org-id",
          match_count: 10,
        },
      ]);

      const response = await request(createApp()).get(
        "/players/player-123/esea"
      );

      expect(response.status).toBe(200);
      expect(response.body.player_id).toBe("player-123");
      expect(response.body.seasons).toHaveLength(1);
      expect(response.body.seasons[0].competition_name).toBe("ESEA S55");
    });
  });

  describe("GET /players/:playerId/competitions/:competitionId/stats", () => {
    it("should return player stats for a competition", async () => {
      mockGetPlayerStatsForCompetition.mockResolvedValueOnce({
        player_id: "player-123",
        competition_id: "comp-1",
        competition_name: "ESEA S55",
        matches_played: 10,
        wins: 7,
        losses: 3,
        win_rate: 70,
        kills: 150,
        deaths: 100,
        assists: 50,
        kd_ratio: 1.5,
        adr: 85.5,
        headshot_pct: 48,
        mvps: 15,
        multi_kills: { triples: 5, quads: 2, aces: 1 },
      });

      const response = await request(createApp()).get(
        "/players/player-123/competitions/comp-1/stats"
      );

      expect(response.status).toBe(200);
      expect(response.body.player_id).toBe("player-123");
      expect(response.body.competition_id).toBe("comp-1");
      expect(response.body.matches_played).toBe(10);
      expect(response.body.kd_ratio).toBe(1.5);
    });

    it("should handle service errors gracefully", async () => {
      mockGetPlayerStatsForCompetition.mockRejectedValueOnce(
        new Error("FACEIT API error (500): Internal error")
      );

      const response = await request(createApp()).get(
        "/players/player-123/competitions/comp-1/stats"
      );

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe("GET /docs", () => {
    it("should return Swagger UI HTML", async () => {
      const response = await request(createApp()).get("/docs");

      expect(response.status).toBe(200);
      expect(response.type).toBe("text/html");
      expect(response.text).toContain("swagger-ui");
      expect(response.text).toContain("CS2 League Stats API");
    });
  });

  describe("GET /openapi.json", () => {
    it("should return OpenAPI spec as JSON", async () => {
      const response = await request(createApp()).get("/openapi.json");

      expect(response.status).toBe(200);
      expect(response.type).toBe("application/json");
      expect(response.body.openapi).toBe("3.0.3");
      expect(response.body.info.title).toBe("CS2 League Stats API");
    });
  });

  describe("GET /openapi.yaml", () => {
    it("should return OpenAPI spec as YAML", async () => {
      const response = await request(createApp()).get("/openapi.yaml");

      expect(response.status).toBe(200);
      expect(response.type).toBe("text/yaml");
      expect(response.text).toContain("openapi: 3.0.3");
      expect(response.text).toContain("CS2 League Stats API");
    });
  });

  describe("404 handling", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await request(createApp()).get("/unknown/route");

      expect(response.status).toBe(404);
    });
  });
});
