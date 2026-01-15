import type { Context } from "koa";

export const healthCheck = (ctx: Context): void => {
  ctx.body = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
};
