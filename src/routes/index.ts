import Router from "@koa/router";
import { healthCheck } from "../controllers/health";
import {
  getPlayerCompetitionStats,
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

// Players
router.get("/players/search", searchPlayersByName);
router.get("/players/:playerId/esea", listPlayerEseaSeasons);
router.get(
  "/players/:playerId/competitions/:competitionId/stats",
  getPlayerCompetitionStats
);
