import type { Context, Next } from "koa";

export const errorHandler = async (ctx: Context, next: Next): Promise<void> => {
  try {
    await next();
  } catch (err) {
    const error = err as Error & { status?: number };
    ctx.status = error.status || 500;
    ctx.body = {
      error: {
        message:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : error.message,
        status: ctx.status,
      },
    };
    ctx.app.emit("error", err, ctx);
  }
};
