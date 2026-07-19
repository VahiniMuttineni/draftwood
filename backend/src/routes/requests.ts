import { Hono } from "hono";
import { db } from "@/db";
import { paperRequests, papers, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "@/middleware/auth";

const requestsRouter = new Hono();

// Get all requests (for Admin view)
requestsRouter.get("/", async (c) => {
  const { session, role } = await requireAuth(c);
  if (role !== "Administrator") {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const allRequests = await db.query.paperRequests.findMany({
    orderBy: [desc(paperRequests.createdAt)],
    with: {
      document: {
        columns: { id: true, title: true, status: true }
      },
      requester: {
        columns: { id: true, name: true, email: true }
      },
      assignedApprover: {
        columns: { id: true, name: true }
      }
    }
  });

  return c.json({ data: allRequests });
});

// Submit a new request (Authors)
requestsRouter.post("/", async (c) => {
  const { session } = await requireAuth(c);

  const { paperId, type, reason } = await c.req.json();
  if (!paperId || !type || !reason) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const [newRequest] = await db.insert(paperRequests).values({
    paperId,
    requesterId: session.user.id,
    type,
    reason,
    status: "PENDING"
  }).returning();

  return c.json({ data: newRequest });
});

// Approve or reject a request (Admin)
requestsRouter.post("/:id/decision", async (c) => {
  const { session, role } = await requireAuth(c);
  if (role !== "Administrator") {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const requestId = c.req.param("id");
  const { status, decisionComment } = await c.req.json(); // APPROVED or REJECTED

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  const reqObj = await db.query.paperRequests.findFirst({
    where: eq(paperRequests.id, requestId),
  });

  if (!reqObj) return c.json({ error: "Request not found" }, 404);
  if (reqObj.status !== "PENDING") return c.json({ error: "Request already processed" }, 400);

  // Update request
  const [updatedReq] = await db.update(paperRequests)
    .set({
      status,
      decisionComment: decisionComment || null,
      assignedApproverId: session.user.id,
      decisionAt: new Date(),
    })
    .where(eq(paperRequests.id, requestId))
    .returning();

  // If approved, process based on request type
  if (status === "APPROVED") {
    if (reqObj.type === "EDIT") {
      // Revert to draft
      await db.update(papers)
        .set({ status: "Draft", optimisticVersion: sql`${papers.optimisticVersion} + 1` })
        .where(eq(papers.id, reqObj.paperId));
    } else if (reqObj.type === "DELETE") {
      // Hard delete the paper
      await db.delete(papers).where(eq(papers.id, reqObj.paperId));
    }
  }

  return c.json({ success: true, data: updatedReq });
});

export default requestsRouter;
