import { describe, it, expect } from "vitest";
import {
  validatePlayerId,
  validateNickname,
  validateCompetitionId,
  validateGame,
} from "./validation";

describe("Validation Utilities", () => {
  describe("validatePlayerId", () => {
    it("should accept valid player IDs", () => {
      expect(validatePlayerId("abc123")).toBe("abc123");
      expect(validatePlayerId("player-123")).toBe("player-123");
      expect(validatePlayerId("player_123")).toBe("player_123");
      expect(validatePlayerId("ABC-123_xyz")).toBe("ABC-123_xyz");
    });

    it("should reject empty player ID", () => {
      expect(() => validatePlayerId("")).toThrow();
    });

    it("should reject player ID with special characters", () => {
      expect(() => validatePlayerId("<script>")).toThrow();
      expect(() => validatePlayerId("player@123")).toThrow();
      expect(() => validatePlayerId("player 123")).toThrow();
      expect(() => validatePlayerId("player/123")).toThrow();
    });

    it("should reject player ID that is too long", () => {
      const longId = "a".repeat(101);
      expect(() => validatePlayerId(longId)).toThrow();
    });
  });

  describe("validateNickname", () => {
    it("should accept valid nicknames", () => {
      expect(validateNickname("Player")).toBe("Player");
      expect(validateNickname("Player123")).toBe("Player123");
      expect(validateNickname("Player Name")).toBe("Player Name");
      expect(validateNickname("Player.Name")).toBe("Player.Name");
      expect(validateNickname("Player-Name")).toBe("Player-Name");
      expect(validateNickname("Player_Name")).toBe("Player_Name");
    });

    it("should reject empty nickname", () => {
      expect(() => validateNickname("")).toThrow();
    });

    it("should reject nickname with dangerous characters", () => {
      expect(() => validateNickname("<script>")).toThrow();
      expect(() => validateNickname("name@domain")).toThrow();
      expect(() => validateNickname("name/path")).toThrow();
      expect(() => validateNickname("name'sql")).toThrow();
    });

    it("should reject nickname that is too long", () => {
      const longNickname = "a".repeat(101);
      expect(() => validateNickname(longNickname)).toThrow();
    });
  });

  describe("validateCompetitionId", () => {
    it("should accept valid competition IDs", () => {
      expect(validateCompetitionId("comp123")).toBe("comp123");
      expect(validateCompetitionId("comp-123")).toBe("comp-123");
      expect(validateCompetitionId("comp_123")).toBe("comp_123");
    });

    it("should reject empty competition ID", () => {
      expect(() => validateCompetitionId("")).toThrow();
    });

    it("should reject competition ID with special characters", () => {
      expect(() => validateCompetitionId("<script>")).toThrow();
      expect(() => validateCompetitionId("comp@123")).toThrow();
    });
  });

  describe("validateGame", () => {
    it("should accept valid games", () => {
      expect(validateGame("cs2")).toBe("cs2");
      expect(validateGame("csgo")).toBe("csgo");
    });

    it("should default to cs2 for undefined or empty", () => {
      expect(validateGame(undefined)).toBe("cs2");
      expect(validateGame("")).toBe("cs2");
    });

    it("should reject invalid games", () => {
      expect(() => validateGame("valorant")).toThrow();
      expect(() => validateGame("fortnite")).toThrow();
      expect(() => validateGame("CS2")).toThrow(); // case sensitive
    });
  });
});
