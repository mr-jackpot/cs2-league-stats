import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  searchPlayers,
  getPlayerEseaSeasons,
  getPlayerStatsForCompetition,
  ORGANIZERS,
} from "./faceit";
import { matchStatsCache, playerHistoryCache, playerSeasonsCache } from "./cache";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Set up env
beforeEach(() => {
  process.env.FACEIT_API_KEY = "test-api-key";
  mockFetch.mockReset();
  matchStatsCache.flushAll();
  playerHistoryCache.flushAll();
  playerSeasonsCache.flushAll();
});

afterEach(() => {
  delete process.env.FACEIT_API_KEY;
});

describe("searchPlayers", () => {
  it("should search for players by nickname", async () => {
    const mockResponse = {
      items: [
        {
          player_id: "123",
          nickname: "TestPlayer",
          avatar: "https://example.com/avatar.jpg",
          country: "US",
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await searchPlayers("TestPlayer");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://open.faceit.com/data/v4/search/players?nickname=TestPlayer&game=cs2&offset=0&limit=10",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer test-api-key",
          Accept: "application/json",
        },
      })
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].nickname).toBe("TestPlayer");
  });

  it("should throw error when API key is missing", async () => {
    delete process.env.FACEIT_API_KEY;

    await expect(searchPlayers("TestPlayer")).rejects.toThrow(
        "FACEIT_API_KEY environment variable is not set. Please set FACEIT_API_KEY in your environment (for example, in a .env file)."
    );
  });

  it("should throw error on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });

    await expect(searchPlayers("TestPlayer")).rejects.toThrow(
      "FACEIT API error (401): Unauthorized"
    );
  });
});

describe("getPlayerEseaSeasons", () => {
  it("should return only ESEA championship competitions", async () => {
    const mockHistory = {
      items: [
        {
          match_id: "match-1",
          competition_id: "esea-comp-1",
          competition_name: "ESEA S55 Open",
          competition_type: "championship",
          organizer_id: ORGANIZERS.ESEA,
          finished_at: 1700000000,
        },
        {
          match_id: "match-2",
          competition_id: "esea-comp-1",
          competition_name: "ESEA S55 Open",
          competition_type: "championship",
          organizer_id: ORGANIZERS.ESEA,
          finished_at: 1700000001,
        },
        {
          match_id: "match-3",
          competition_id: "matchmaking-1",
          competition_name: "Europe 5v5 Queue",
          competition_type: "matchmaking",
          organizer_id: "other-org",
          finished_at: 1700000002,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockHistory),
    });

    const result = await getPlayerEseaSeasons("player-123");

    expect(result).toHaveLength(1);
    expect(result[0].competition_name).toBe("ESEA S55 Open");
    expect(result[0].match_count).toBe(2);
  });

  it("should return empty array when no ESEA matches", async () => {
    const mockHistory = {
      items: [
        {
          match_id: "match-1",
          competition_id: "matchmaking-1",
          competition_name: "Europe 5v5 Queue",
          competition_type: "matchmaking",
          organizer_id: "other-org",
          finished_at: 1700000000,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockHistory),
    });

    const result = await getPlayerEseaSeasons("player-123");

    expect(result).toHaveLength(0);
  });
});

describe("getPlayerStatsForCompetition", () => {
  it("should aggregate stats from multiple matches", async () => {
    const mockHistory = {
      items: [
        {
          match_id: "match-1",
          competition_id: "comp-1",
          competition_name: "ESEA S55",
          competition_type: "championship",
          organizer_id: ORGANIZERS.ESEA,
          finished_at: 1700000000,
        },
        {
          match_id: "match-2",
          competition_id: "comp-1",
          competition_name: "ESEA S55",
          competition_type: "championship",
          organizer_id: ORGANIZERS.ESEA,
          finished_at: 1700000001,
        },
      ],
    };

    const mockMatchStats1 = {
      rounds: [
        {
          teams: [
            {
              players: [
                {
                  player_id: "player-123",
                  player_stats: {
                    Result: "1",
                    Kills: "20",
                    Deaths: "10",
                    Assists: "5",
                    "K/D Ratio": "2.0",
                    ADR: "100",
                    "Headshots %": "50",
                    MVPs: "3",
                    "Triple Kills": "2",
                    "Quadro Kills": "1",
                    "Penta Kills": "0",
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const mockMatchStats2 = {
      rounds: [
        {
          teams: [
            {
              players: [
                {
                  player_id: "player-123",
                  player_stats: {
                    Result: "0",
                    Kills: "15",
                    Deaths: "15",
                    Assists: "3",
                    "K/D Ratio": "1.0",
                    ADR: "80",
                    "Headshots %": "40",
                    MVPs: "1",
                    "Triple Kills": "1",
                    "Quadro Kills": "0",
                    "Penta Kills": "0",
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistory),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMatchStats1),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMatchStats2),
      });

    const result = await getPlayerStatsForCompetition("player-123", "comp-1");

    expect(result.matches_played).toBe(2);
    expect(result.wins).toBe(1);
    expect(result.losses).toBe(1);
    expect(result.win_rate).toBe(50);
    expect(result.kills).toBe(35);
    expect(result.deaths).toBe(25);
    expect(result.assists).toBe(8);
    expect(result.kd_ratio).toBe(1.5);
    expect(result.adr).toBe(90);
    expect(result.multi_kills.triples).toBe(3);
    expect(result.multi_kills.quads).toBe(1);
  });

  it("should return empty stats when no matches found", async () => {
    const mockHistory = { items: [] };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockHistory),
    });

    const result = await getPlayerStatsForCompetition("player-123", "comp-1");

    expect(result.matches_played).toBe(0);
    expect(result.wins).toBe(0);
    expect(result.kills).toBe(0);
  });

  it("should handle match stats fetch failures gracefully", async () => {
    const mockHistory = {
      items: [
        {
          match_id: "match-1",
          competition_id: "comp-1",
          competition_name: "ESEA S55",
          competition_type: "championship",
          organizer_id: ORGANIZERS.ESEA,
          finished_at: 1700000000,
        },
      ],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistory),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
      });

    const result = await getPlayerStatsForCompetition("player-123", "comp-1");

    // Should not throw, just return 0 matches
    expect(result.matches_played).toBe(0);
  });
});

describe("faceitFetch retry on 429", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("should retry on 429 and succeed on second attempt", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => null },
        text: () => Promise.resolve("Too Many Requests"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

    const promise = searchPlayers("TestPlayer");
    await vi.runAllTimersAsync();
    await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should throw after max attempts on persistent 429", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => null },
      text: () => Promise.resolve("Too Many Requests"),
    });

    // Attach the rejection handler before advancing timers to avoid unhandled rejection warnings
    const assertion = expect(searchPlayers("TestPlayer")).rejects.toThrow("Rate limit exceeded after 3 attempts");
    await vi.runAllTimersAsync();
    await assertion;

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
