import Router from "@koa/router";
import { koaSwagger } from "koa2-swagger-ui";
import { readFileSync } from "fs";
import { parse } from "yaml";
import { join } from "path";
import { healthCheck } from "../controllers/health";
import {
  getPlayerCompetitionStats,
  listPlayerEseaSeasons,
  searchPlayersByName,
} from "../controllers/players";

export const router = new Router();

// Load OpenAPI spec
const openapiPath = join(process.cwd(), "openapi.yaml");
const openapiSpec = parse(readFileSync(openapiPath, "utf8"));

router.get("/health", healthCheck);

router.get("/", (ctx) => {
  ctx.body = {
    name: "CS2 League Stats API",
    version: "1.0.0",
    docs: "/docs",
  };
});

// OpenAPI spec
router.get("/openapi.yaml", (ctx) => {
  ctx.type = "text/yaml";
  ctx.body = readFileSync(openapiPath, "utf8");
});

router.get("/openapi.json", (ctx) => {
  ctx.body = openapiSpec;
});

// Swagger UI
router.get(
  "/docs",
  koaSwagger({
    routePrefix: false,
    swaggerOptions: {
      spec: openapiSpec,
    },
  })
);

// Players
router.get("/players/search", searchPlayersByName);
router.get("/players/:playerId/esea", listPlayerEseaSeasons);
router.get(
  "/players/:playerId/competitions/:competitionId/stats",
  getPlayerCompetitionStats
);
