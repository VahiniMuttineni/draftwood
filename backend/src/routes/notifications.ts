import { Hono } from "hono";
import { requireAuth } from "@/middleware/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import { streamSSE } from "hono/streaming";
import { addSSEConnection, removeSSEConnection } from "@/lib/sse";

const app = new Hono();

// Polling endpoint for notifications (kept for initial load)
app.get("/", async (c) => {
  const { session } = await requireAuth(c);
  
  const data = await db.query.notifications.findMany({
    where: eq(notifications.recipientId, session.user.id),
    orderBy: [desc(notifications.createdAt)],
    limit: 50,
  });

  const unreadCount = data.filter(n => !n.isRead).length;

  return c.json({ success: true, data, meta: { unreadCount } });
});

app.get("/stream", async (c) => {
  let session: any;
  try {
    ({ session } = await requireAuth(c));
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return streamSSE(c, async (stream) => {
    let closed = false;

    addSSEConnection(session.user.id, stream);

    stream.onAbort(() => {
      closed = true;
      removeSSEConnection(session.user.id, stream);
    });

    // Send initial connected event
    try {
      await stream.writeSSE({
        event: "connected",
        data: "ok",
        id: String(Date.now()),
      });
    } catch {
      closed = true;
    }

    // Send heartbeat every 30s to keep the connection alive
    // and prevent ERR_INCOMPLETE_CHUNKED_ENCODING
    while (!closed) {
      await new Promise<void>(resolve => setTimeout(resolve, 30000));
      if (closed) break;
      try {
        await stream.writeSSE({
          event: "ping",
          data: String(Date.now()),
          id: String(Date.now()),
        });
      } catch {
        // Write failed — connection dropped
        closed = true;
        break;
      }
    }

    removeSSEConnection(session.user.id, stream);
  });
});

app.post("/:id/read", async (c) => {
  const { session } = await requireAuth(c);
  const id = c.req.param("id");

  await db.update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, id));

  return c.json({ success: true, message: "Notification marked as read" });
});

app.post("/read-all", async (c) => {
  const { session } = await requireAuth(c);

  await db.update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.recipientId, session.user.id));

  return c.json({ success: true, message: "All notifications marked as read" });
});

export default app;
