import type { Context, Next } from "koa";

export interface ApiKeyAuthOptions {
  apiKey: string;
  excludePaths?: string[];
}

export const createApiKeyAuth = (options: ApiKeyAuthOptions) => {
  const { apiKey, excludePaths = [] } = options;

  return async (ctx: Context, next: Next): Promise<void> => {
    // Skip auth for excluded paths (health checks, docs)
    if (excludePaths.some((path) => ctx.path.startsWith(path))) {
      await next();
      return;
    }

    const providedKey = ctx.get("X-API-Key");

    if (providedKey === apiKey) {
      await next();
      return;
    }

    ctx.status = 401;
    ctx.body = {
      error: {
        message: "Unauthorized: Invalid or missing API key",
        status: 401,
      },
    };
  };
};
