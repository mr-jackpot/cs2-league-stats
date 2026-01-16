import Koa from "koa";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import helmet from "koa-helmet";
import { config } from "dotenv";
import { router } from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimit";

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
  origin: (ctx: Koa.Context): string | false => {
    const requestOrigin = ctx.get("Origin");
    const allowedOrigins = getAllowedOrigins();

    if (allowedOrigins.length === 0) {
      return requestOrigin || "*";
    }

    if (process.env.NODE_ENV === "development" && requestOrigin?.includes("localhost")) {
      return requestOrigin;
    }

    if (allowedOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }

    return false;
  },
};

app.use(errorHandler);
app.use(helmet());
app.use(rateLimiter);
app.use(cors(corsOptions));
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { app };
