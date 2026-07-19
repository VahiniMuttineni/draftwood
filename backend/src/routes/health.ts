import { Hono } from "hono";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

const app = new Hono();

app.get("/", async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    
    return c.json({
      success: true,
      data: {
        status: "ok",
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      },
      message: "System is healthy"
    }, 200);
  } catch (error) {
    logger.error({ err: error }, "Health check failed");
    return c.json({
      success: false,
      error: "System is unavailable"
    }, 503);
  }
});

export default app;
