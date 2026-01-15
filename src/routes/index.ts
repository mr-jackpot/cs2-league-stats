import Router from "@koa/router";
import { readFileSync, existsSync } from "fs";
import { parse } from "yaml";
import { join } from "path";
import { healthCheck } from "../controllers/health";
import {
  getPlayer,
  getPlayerCompetitionStats,
  listPlayerEseaSeasons,
  searchPlayersByName,
} from "../controllers/players";

export const router = new Router();

// Load and cache OpenAPI spec at startup
const openapiPath = join(process.cwd(), "openapi.yaml");
let openapiYaml: string;
let openapiSpec: Record<string, unknown>;

try {
  if (!existsSync(openapiPath)) {
    throw new Error(`OpenAPI spec not found at ${openapiPath}`);
  }
  openapiYaml = readFileSync(openapiPath, "utf8");
  openapiSpec = parse(openapiYaml) as Record<string, unknown>;
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Failed to load OpenAPI spec: ${message}`);
  process.exit(1);
}

router.get("/health", healthCheck);

router.get("/", (ctx) => {
  ctx.body = {
    name: "CS2 League Stats API",
    version: "1.0.0",
    docs: "/docs",
  };
});

// OpenAPI spec (cached)
router.get("/openapi.yaml", (ctx) => {
  ctx.type = "text/yaml";
  ctx.body = openapiYaml;
});

router.get("/openapi.json", (ctx) => {
  ctx.body = openapiSpec;
});

// Swagger UI
router.get("/docs", (ctx) => {
  ctx.type = "html";
  ctx.body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CS2 League Stats API - Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: 'StandaloneLayout'
      });
    };
  </script>
</body>
</html>`;
});

// Players
router.get("/players/search", searchPlayersByName);
router.get("/players/:playerId", getPlayer);
router.get("/players/:playerId/esea", listPlayerEseaSeasons);
router.get(
  "/players/:playerId/competitions/:competitionId/stats",
  getPlayerCompetitionStats
);
