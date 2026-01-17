import { z } from "zod";

export const playerIdSchema = z
  .string()
  .min(1, "Player ID is required")
  .max(100, "Player ID is too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "Player ID contains invalid characters");

export const nicknameSchema = z
  .string()
  .min(1, "Nickname is required")
  .max(100, "Nickname is too long")
  .regex(
    /^[a-zA-Z0-9_.\s-]+$/,
    "Nickname contains invalid characters"
  );

export const competitionIdSchema = z
  .string()
  .min(1, "Competition ID is required")
  .max(100, "Competition ID is too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "Competition ID contains invalid characters");

export const gameSchema = z.enum(["cs2", "csgo"], {
  errorMap: () => ({ message: "Game must be 'cs2' or 'csgo'" }),
});

export type PlayerId = z.infer<typeof playerIdSchema>;
export type Nickname = z.infer<typeof nicknameSchema>;
export type CompetitionId = z.infer<typeof competitionIdSchema>;
export type Game = z.infer<typeof gameSchema>;

export const validatePlayerId = (value: unknown): string => {
  return playerIdSchema.parse(value);
};

export const validateNickname = (value: unknown): string => {
  return nicknameSchema.parse(value);
};

export const validateCompetitionId = (value: unknown): string => {
  return competitionIdSchema.parse(value);
};

export const validateGame = (value: unknown): Game => {
  if (value === undefined || value === "") {
    return "cs2";
  }
  return gameSchema.parse(value);
};
