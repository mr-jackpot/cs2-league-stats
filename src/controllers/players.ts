import type { Context } from "koa";
import { ZodError } from "zod";
import {
  getPlayerById,
  getPlayerStatsForCompetition,
  getPlayerEseaSeasons,
  searchPlayers,
  ORGANIZERS,
} from "../services/faceit";
import {
  validatePlayerId,
  validateNickname,
  validateCompetitionId,
  validateGame,
} from "../utils/validation";

const handleValidationError = (ctx: Context, error: unknown): void => {
  if (error instanceof ZodError) {
    ctx.status = 400;
    ctx.body = {
      error: "Validation error",
      details: error.issues.map((e) => ({
        field: e.path.join(".") || "input",
        message: e.message,
      })),
    };
    return;
  }
  throw error;
};

export const getPlayer = async (ctx: Context): Promise<void> => {
  let playerId: string;

  try {
    playerId = validatePlayerId(ctx.params.playerId);
  } catch (error) {
    handleValidationError(ctx, error);
    return;
  }

  const player = await getPlayerById(playerId);
  ctx.body = player;
};

export const searchPlayersByName = async (ctx: Context): Promise<void> => {
  let nickname: string;
  let game: string;

  try {
    nickname = validateNickname(ctx.query.nickname);
    game = validateGame(ctx.query.game);
  } catch (error) {
    handleValidationError(ctx, error);
    return;
  }

  const results = await searchPlayers(nickname, game);
  ctx.body = results;
};

export const listPlayerEseaSeasons = async (ctx: Context): Promise<void> => {
  let playerId: string;
  let game: string;

  try {
    playerId = validatePlayerId(ctx.params.playerId);
    game = validateGame(ctx.query.game);
  } catch (error) {
    handleValidationError(ctx, error);
    return;
  }

  const seasons = await getPlayerEseaSeasons(playerId, game);
  ctx.body = { player_id: playerId, organizer_id: ORGANIZERS.ESEA, seasons };
};

export const getPlayerCompetitionStats = async (
  ctx: Context
): Promise<void> => {
  let playerId: string;
  let competitionId: string;
  let game: string;

  try {
    playerId = validatePlayerId(ctx.params.playerId);
    competitionId = validateCompetitionId(ctx.params.competitionId);
    game = validateGame(ctx.query.game);
  } catch (error) {
    handleValidationError(ctx, error);
    return;
  }

  const stats = await getPlayerStatsForCompetition(
    playerId,
    competitionId,
    game
  );
  ctx.body = stats;
};
