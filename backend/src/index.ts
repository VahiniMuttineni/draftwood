import "dotenv/config";

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger as honoLogger } from "hono/logger";
import { cors } from "hono/cors";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

// Import routers
import healthRouter from "./routes/health";
import papersRouter from "./routes/papers";
import analyticsRouter from "./routes/analytics";
import notificationsRouter from "./routes/notifications";
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import requestsRouter from "./routes/requests";

const app = new Hono();

import { env } from "./config/env";

app.use(honoLogger());
app.use(
  cors({
    origin: [env.FRONTEND_URL],
    credentials: true,
  })
);

import { AppError } from "@/lib/errors";

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message, code: err.code }, err.statusCode as any);
  }
  logger.error({ err }, "Unhandled application error");
  return c.json({ error: "Internal Server Error" }, 500);
});

app.get("/", (c) => c.text("ExecutiveFlow API"));

// Mount routes
app.route("/api/auth", authRouter);
app.route("/api/v1/health", healthRouter);
app.route("/api/v1/papers", papersRouter);
app.route("/api/v1/analytics", analyticsRouter);
app.route("/api/v1/notifications", notificationsRouter);
app.route("/api/v1/users", usersRouter);
app.route("/api/v1/requests", requestsRouter);

const port = env.PORT || 6203;
logger.info(`Starting backend server on port ${port}`);

serve({
  fetch: app.fetch,
  port: port as number,
});
