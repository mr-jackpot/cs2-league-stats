import type { Context } from "koa";
import {
  getPlayerStatsForCompetition,
  getPlayerEseaSeasons,
  searchPlayers,
  ORGANIZERS,
} from "../services/faceit";

export const searchPlayersByName = async (ctx: Context): Promise<void> => {
  const nickname = ctx.query.nickname as string | undefined;
  const game = (ctx.query.game as string) || "cs2";

  if (!nickname) {
    ctx.status = 400;
    ctx.body = { error: "Query parameter 'nickname' is required" };
    return;
  }

  const results = await searchPlayers(nickname, game);
  ctx.body = results;
};

export const listPlayerEseaSeasons = async (ctx: Context): Promise<void> => {
  const { playerId } = ctx.params;
  const game = (ctx.query.game as string) || "cs2";

  if (!playerId) {
    ctx.status = 400;
    ctx.body = { error: "Player ID is required" };
    return;
  }

  const seasons = await getPlayerEseaSeasons(playerId, game);
  ctx.body = { player_id: playerId, organizer_id: ORGANIZERS.ESEA, seasons };
};

export const getPlayerCompetitionStats = async (
  ctx: Context
): Promise<void> => {
  const { playerId, competitionId } = ctx.params;
  const game = (ctx.query.game as string) || "cs2";

  if (!playerId || !competitionId) {
    ctx.status = 400;
    ctx.body = { error: "Player ID and Competition ID are required" };
    return;
  }

  const stats = await getPlayerStatsForCompetition(
    playerId,
    competitionId,
    game
  );
  ctx.body = stats;
};
