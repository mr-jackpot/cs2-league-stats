import type { Context } from "koa";
import {
  getPlayerStatsForTeam,
  getPlayerStatsForCompetition,
  getPlayerCompetitions,
  getPlayerEseaSeasons,
  searchPlayers,
  ORGANIZERS,
} from "../services/faceit";

export const getPlayerTeamStats = async (ctx: Context): Promise<void> => {
  const { teamId, playerId } = ctx.params;
  const game = (ctx.query.game as string) || "cs2";

  if (!teamId || !playerId) {
    ctx.status = 400;
    ctx.body = { error: "Team ID and Player ID are required" };
    return;
  }

  const stats = await getPlayerStatsForTeam(playerId, teamId, game);
  ctx.body = stats;
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

export const listPlayerCompetitions = async (ctx: Context): Promise<void> => {
  const { playerId } = ctx.params;
  const game = (ctx.query.game as string) || "cs2";
  const organizerId = ctx.query.organizer as string | undefined;
  const type = ctx.query.type as string | undefined;

  if (!playerId) {
    ctx.status = 400;
    ctx.body = { error: "Player ID is required" };
    return;
  }

  const competitions = await getPlayerCompetitions(playerId, game, {
    organizerId,
    type,
  });
  ctx.body = { player_id: playerId, competitions };
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
