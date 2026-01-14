import Router from "@koa/router";
import { healthCheck } from "../controllers/health";
import { getTeam, searchTeamsByName } from "../controllers/teams";
import {
  getPlayerTeamStats,
  getPlayerCompetitionStats,
  listPlayerCompetitions,
  listPlayerEseaSeasons,
  searchPlayersByName,
} from "../controllers/players";

export const router = new Router();

router.get("/health", healthCheck);

router.get("/", (ctx) => {
  ctx.body = {
    name: "CS2 League Stats API",
    version: "1.0.0",
  };
});

// Teams
router.get("/teams/search", searchTeamsByName);
router.get("/teams/:id", getTeam);

// Player stats for a team (uses match queue team IDs)
router.get("/teams/:teamId/players/:playerId/stats", getPlayerTeamStats);

// Players
router.get("/players/search", searchPlayersByName);
router.get("/players/:playerId/competitions", listPlayerCompetitions);
router.get("/players/:playerId/esea", listPlayerEseaSeasons);
router.get(
  "/players/:playerId/competitions/:competitionId/stats",
  getPlayerCompetitionStats
);
