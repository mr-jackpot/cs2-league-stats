import Koa from "koa";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import helmet from "koa-helmet";
import { config } from "dotenv";
import { router } from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimit";
import { createApiKeyAuth } from "./middleware/apiKeyAuth";

config();

const app = new Koa();
const PORT = process.env.PORT || 3000;

const getAllowedOrigins = (): string[] => {
  const origins = process.env.ALLOWED_ORIGINS;
  if (!origins) {
    return [];
  }
  return origins.split(",").map((origin) => origin.trim());
};

const corsOptions = {
  origin: (ctx: Koa.Context): string => {
    const requestOrigin = ctx.get("Origin");
    const allowedOrigins = getAllowedOrigins();

    if (allowedOrigins.length === 0) {
      return requestOrigin || "*";
    }

    if (
      process.env.NODE_ENV === "development" &&
      requestOrigin &&
      (requestOrigin.startsWith("http://localhost:") ||
        requestOrigin.startsWith("https://localhost:"))
    ) {
      return requestOrigin;
    }

    if (allowedOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }

    return "";
  },
};

const getApiKeyMiddleware = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("WARNING: API_KEY not set. API key authentication disabled.");
    return null;
  }

  const debugKey = process.env.DEBUG_API_KEY;
  const allowDebugInProd = process.env.ALLOW_DEBUG_KEY_IN_PRODUCTION === "true";

  return createApiKeyAuth({
    apiKey,
    debugKey:
      process.env.NODE_ENV !== "production" || allowDebugInProd
        ? debugKey
        : undefined,
    excludePaths: ["/health", "/docs", "/openapi.yaml", "/openapi.json", "/"],
  });
};

app.use(errorHandler);
app.use(helmet());
app.use(rateLimiter);
app.use(cors(corsOptions));

const apiKeyMiddleware = getApiKeyMiddleware();
if (apiKeyMiddleware) {
  app.use(apiKeyMiddleware);
}

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { app };
