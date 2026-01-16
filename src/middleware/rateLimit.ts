import ratelimit from "koa-ratelimit";

const db = new Map();

export const rateLimiter = ratelimit({
  driver: "memory",
  db: db,
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  errorMessage: {
    error: "Too many requests",
    message: "Rate limit exceeded. Please try again later.",
  },
  id: (ctx) => ctx.ip,
  headers: {
    remaining: "X-RateLimit-Remaining",
    reset: "X-RateLimit-Reset",
    total: "X-RateLimit-Limit",
  },
  disableHeader: false,
});
