import type { Context } from "koa";
import { getTeamById, searchTeams } from "../services/faceit";

export const getTeam = async (ctx: Context): Promise<void> => {
  const { id } = ctx.params;

  if (!id) {
    ctx.status = 400;
    ctx.body = { error: "Team ID is required" };
    return;
  }

  const team = await getTeamById(id);
  ctx.body = team;
};

export const searchTeamsByName = async (ctx: Context): Promise<void> => {
  const name = ctx.query.name as string | undefined;
  const limit = ctx.query.limit
    ? parseInt(ctx.query.limit as string, 10)
    : undefined;

  if (!name) {
    ctx.status = 400;
    ctx.body = { error: "Query parameter 'name' is required" };
    return;
  }

  const results = await searchTeams(name, limit);
  ctx.body = results;
};
