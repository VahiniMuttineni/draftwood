import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "@/middleware/auth";
import { db } from "@/db";
import { papers, paperVersions, users, workflowHistory, paperAssignments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { AppError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { workflowService } from "@/modules/workflow/workflow.service";
import { paperRepository } from "@/modules/papers/paper.repository";

const app = new Hono();

// Helper to format paper objects to be compatible with frontend expectations
function formatPaper(p: any) {
  if (!p) return p;
  const currentVersion = p.versions?.[0] || p.currentVersion || null;
  const activeAssignment = p.assignments?.find((a: any) => a.status === "PENDING") || p.assignments?.[0] || null;
  
  return {
    ...p,
    title: currentVersion?.title || p.title || "Untitled Paper",
    currentVersion: currentVersion,
    assignedReviewerId: activeAssignment?.reviewerId || p.assignedReviewerId || null,
    reviewer: activeAssignment?.reviewer || p.reviewer || null,
    owner: p.author || p.owner || null,
    ownerId: p.authorId || p.ownerId || null,
  };
}

// --- GET ALL PAPERS ---
app.get("/", async (c) => {
  const { session, role } = await requireAuth(c);
  const conditions: any[] = [];

  const statusFilter = c.req.query("status");
  const excludeStatusFilter = c.req.query("excludeStatus");
  const q = c.req.query("q");

  // Role-based base filter
  if (role === "Author") {
    conditions.push(eq(papers.authorId, session.user.id));
  } else if (role === "Viewer") {
    conditions.push(eq(papers.status, "Published"));
  }
  // Reviewer and Administrator see all papers

  // Apply optional status filter from query param
  if (statusFilter) {
    const statuses = statusFilter.split(",").map(s => s.trim());
    if (statuses.length === 1) {
      conditions.push(eq(papers.status, statuses[0]));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let data = await db.query.papers.findMany({
    where: whereClause,
    orderBy: [desc(papers.createdAt)],
    with: {
      author: { columns: { name: true, id: true } },
      versions: {
        orderBy: [desc(paperVersions.versionNumber)],
        limit: 1
      },
      assignments: {
        with: { reviewer: { columns: { name: true, id: true } } }
      }
    },
  });

  // Apply excludeStatus filter in memory (supports comma-separated list)
  if (excludeStatusFilter) {
    const excluded = excludeStatusFilter.split(",").map(s => s.trim());
    data = data.filter(p => !excluded.includes(p.status));
  }

  // Apply text search
  if (q) {
    const lower = q.toLowerCase();
    data = data.filter(p => {
      const title = (p.versions?.[0]?.title || "").toLowerCase();
      return title.includes(lower);
    });
  }

  return c.json({ success: true, data: data.map(formatPaper), meta: { total: data.length, page: 1, limit: data.length } });
});

// --- GET PAPER BY ID ---
app.get("/:id", async (c) => {
  try {
    const { session, role } = await requireAuth(c);
    const id = c.req.param("id");

    const doc = await db.query.papers.findFirst({
      where: eq(papers.id, id),
      with: {
        author: { columns: { name: true, id: true } },
        versions: { orderBy: [desc(paperVersions.versionNumber)] },
        assignments: {
          with: { reviewer: { columns: { name: true, id: true } } }
        },
        workflowHistory: {
          orderBy: [desc(workflowHistory.createdAt)],
          with: { performedByRel: { columns: { name: true } } }
        }
      }
    });

    if (!doc) throw new NotFoundError("Paper not found");

    return c.json({ success: true, data: formatPaper(doc) });
  } catch (error) { throw error;
    console.error(`GET /papers/${c.req.param("id")} error:`, error);
    if (error instanceof AppError) return c.json({ success: false, error: error.message }, error.statusCode as any);
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
});

// --- CREATE PAPER ---
const createPaperSchema = z.object({
  title: z.string().min(1),
  body: z.any(),
});

app.post("/", async (c) => {
  try {
    const { session, role } = await requireAuth(c);
    if (role !== "Author" && role !== "Administrator") {
      throw new ForbiddenError("Only authors can create papers");
    }

    const body = await c.req.json();
    const parsed = createPaperSchema.parse(body);

    const userRecord = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
    const deptId = userRecord?.departmentId;
    if (!deptId) throw new ValidationError("Department ID is required");

    const doc = await db.transaction(async (tx: any) => {
      const paper = await paperRepository.create({
        authorId: session.user.id,
        departmentId: deptId,
        status: "Draft",
      }, tx);

      const [version] = await tx.insert(paperVersions).values({
        paperId: paper.id,
        versionNumber: 1,
        title: parsed.title,
        body: parsed.body,
        createdBy: session.user.id
      }).returning();

      await tx.update(papers).set({ currentVersionId: version.id }).where(eq(papers.id, paper.id));

      return paper;
    });

    // Fetch details to return formatted paper
    const fullDoc = await db.query.papers.findFirst({
      where: eq(papers.id, doc.id),
      with: {
        author: { columns: { name: true, id: true } },
        versions: { orderBy: [desc(paperVersions.versionNumber)], limit: 1 }
      }
    });

    return c.json({ success: true, data: formatPaper(fullDoc), message: "Paper created" }, 201);
  } catch (error) { throw error;
    if (error instanceof AppError) return c.json({ success: false, error: error.message }, error.statusCode as any);
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
});

// --- UPDATE PAPER ---
app.put("/:id", async (c) => {
  try {
    const { session, role } = await requireAuth(c);
    const id = c.req.param("id");
    const body = await c.req.json();
    const { title, body: docBody, optimisticVersion } = body;

    const doc = await db.query.papers.findFirst({ where: eq(papers.id, id) });
    if (!doc) throw new NotFoundError("Paper not found");

    if (doc.authorId !== session.user.id && role !== "Administrator") {
      throw new ForbiddenError("Only the author can edit this paper");
    }

    const updated = await db.transaction(async (tx: any) => {
      // OCC Lock check is handled inside updateWithOcc
      const updatedPaper = await paperRepository.updateWithOcc(id, optimisticVersion, {}, tx);

      // Create new version or overwrite if we want to update the current version.
      // Since it's draft mode, we bump version or overwrite version.
      // Typically we create a new version or update the latest version if it's still a draft.
      // Let's insert a new version to keep the version history clear.
      const latestVersionArray = await tx.select()
        .from(paperVersions)
        .where(eq(paperVersions.paperId, id))
        .orderBy(desc(paperVersions.versionNumber))
        .limit(1);
      const latestVersion = latestVersionArray[0];

      const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

      const [newVersion] = await tx.insert(paperVersions).values({
        paperId: id,
        versionNumber: nextVersionNumber,
        title: title || latestVersion?.title || "Untitled",
        body: docBody,
        createdBy: session.user.id
      }).returning();

      await tx.update(papers).set({ currentVersionId: newVersion.id }).where(eq(papers.id, id));

      return updatedPaper;
    });

    const fullDoc = await db.query.papers.findFirst({
      where: eq(papers.id, id),
      with: {
        author: { columns: { name: true, id: true } },
        versions: { orderBy: [desc(paperVersions.versionNumber)], limit: 1 }
      }
    });

    return c.json({ success: true, data: formatPaper(fullDoc), message: "Paper updated" });
  } catch (error) { throw error;
    console.error("PUT /:id error:", error);
    if (error instanceof AppError) return c.json({ success: false, error: error.message }, error.statusCode as any);
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
});

// --- SUBMIT FOR REVIEW ---
app.post("/:id/submit", async (c) => {
  try {
    const { session, role } = await requireAuth(c);
    const id = c.req.param("id");
    const body = await c.req.json();
    const { optimisticVersion, title } = body;

    const userRecord = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });

    const updated = await workflowService.submitForReview({
      paperId: id,
      actorId: session.user.id,
      optimisticVersion,
      title: title || "Unknown Title",
      authorName: userRecord?.name || "Unknown Author"
    });

    const fullDoc = await db.query.papers.findFirst({
      where: eq(papers.id, id),
      with: {
        author: { columns: { name: true, id: true } },
        versions: { orderBy: [desc(paperVersions.versionNumber)], limit: 1 },
        assignments: {
          with: { reviewer: { columns: { name: true, id: true } } }
        }
      }
    });

    return c.json({ success: true, data: formatPaper(fullDoc), message: "Paper submitted for review" });
  } catch (error) { throw error;
    if (error instanceof AppError) return c.json({ success: false, error: error.message }, error.statusCode as any);
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
});

// --- ASSIGN REVIEWER ---
const assignHandler = async (c: any) => {
  try {
    const { session, role } = await requireAuth(c);
    if (role !== "Administrator") throw new ForbiddenError("Only admins can assign reviewers");

    const id = c.req.param("id");
    const { reviewerId, optimisticVersion, title } = await c.req.json();

    const updated = await workflowService.assignReviewer({
      paperId: id,
      adminId: session.user.id,
      reviewerId,
      optimisticVersion,
      title: title || "Paper"
    });

    const fullDoc = await db.query.papers.findFirst({
      where: eq(papers.id, id),
      with: {
        author: { columns: { name: true, id: true } },
        versions: { orderBy: [desc(paperVersions.versionNumber)], limit: 1 },
        assignments: {
          with: { reviewer: { columns: { name: true, id: true } } }
        }
      }
    });

    return c.json({ success: true, data: formatPaper(fullDoc), message: "Reviewer assigned" });
  } catch (error) { throw error;
    if (error instanceof AppError) return c.json({ success: false, error: error.message }, error.statusCode as any);
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
};

app.post("/:id/assign", assignHandler);
app.post("/:id/assign-reviewer", assignHandler);

// --- ADMIN DECISION ---
const decisionHandler = async (c: any) => {
  try {
    const { session, role } = await requireAuth(c);
    if (role !== "Administrator") throw new ForbiddenError("Only admins can make decisions");

    const id = c.req.param("id");
    const { decision, optimisticVersion, title, authorId, adminRemarks } = await c.req.json();

    const doc = await db.query.papers.findFirst({ where: eq(papers.id, id) });
    if (!doc) throw new NotFoundError("Paper not found");

    // Map decision case-insensitively to the title-cased values expected by WorkflowService
    let mappedDecision: "Publish" | "Request Revision" | "Reject";
    if (decision === "PUBLISH" || decision === "Publish") {
      mappedDecision = "Publish";
    } else if (decision === "REVISE" || decision === "Request Revision") {
      mappedDecision = "Request Revision";
    } else {
      mappedDecision = "Reject";
    }

    const updated = await workflowService.adminDecision({
      paperId: id,
      adminId: session.user.id,
      decision: mappedDecision,
      optimisticVersion,
      title: title || doc.title || "Paper",
      authorId: authorId || doc.authorId,
      adminRemarks
    });

    const fullDoc = await db.query.papers.findFirst({
      where: eq(papers.id, id),
      with: {
        author: { columns: { name: true, id: true } },
        versions: { orderBy: [desc(paperVersions.versionNumber)], limit: 1 },
        assignments: {
          with: { reviewer: { columns: { name: true, id: true } } }
        }
      }
    });

    return c.json({ success: true, data: formatPaper(fullDoc), message: `Paper decision: ${mappedDecision}` });
  } catch (error) { throw error;
    if (error instanceof AppError) return c.json({ success: false, error: error.message }, error.statusCode as any);
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
};

app.post("/:id/decision", decisionHandler);
app.post("/:id/admin-decision", decisionHandler);

// --- REVIEWER START REVIEW ---
app.post("/:id/review/start", async (c) => {
  try {
    const { session, role } = await requireAuth(c);
    if (role !== "Reviewer") throw new ForbiddenError("Only reviewers can start reviews");
    const id = c.req.param("id");
    const { optimisticVersion } = await c.req.json();

    await workflowService.startReview({
      paperId: id,
      reviewerId: session.user.id,
      optimisticVersion
    });

    const fullDoc = await db.query.papers.findFirst({
      where: eq(papers.id, id),
      with: {
        author: { columns: { name: true, id: true } },
        versions: { orderBy: [desc(paperVersions.versionNumber)], limit: 1 },
        assignments: {
          with: { reviewer: { columns: { name: true, id: true } } }
        }
      }
    });

    return c.json({ success: true, data: formatPaper(fullDoc), message: "Review started" });
  } catch (error) { throw error;
    if (error instanceof AppError) return c.json({ success: false, error: error.message }, error.statusCode as any);
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
});

// --- REVIEWER COMPLETE REVIEW ---
const completeReviewHandler = async (c: any) => {
  try {
    const { session, role } = await requireAuth(c);
    if (role !== "Reviewer") throw new ForbiddenError("Only reviewers can submit reviews");

    const id = c.req.param("id");
    const body = await c.req.json();
    const { reviewFeedback, comments, suggestions, recommendation, optimisticVersion, title } = body;

    // Find the pending assignment for this reviewer
    const assignment = await db.query.paperAssignments.findFirst({
      where: and(
        eq(paperAssignments.paperId, id),
        eq(paperAssignments.reviewerId, session.user.id),
        eq(paperAssignments.status, "PENDING")
      )
    });

    if (!assignment) throw new ValidationError("No pending assignment found for this paper");

    const userRecord = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });

    const commentsJson = comments || { text: reviewFeedback || "Review completed" };

    const updated = await workflowService.submitReview({
      paperId: id,
      assignmentId: assignment.id,
      reviewerId: session.user.id,
      reviewerName: userRecord?.name || "Reviewer",
      title: title || "Paper",
      comments: commentsJson,
      suggestions: suggestions || "",
      recommendation: recommendation || "Approve",
      optimisticVersion
    });

    const fullDoc = await db.query.papers.findFirst({
      where: eq(papers.id, id),
      with: {
        author: { columns: { name: true, id: true } },
        versions: { orderBy: [desc(paperVersions.versionNumber)], limit: 1 },
        assignments: {
          with: { reviewer: { columns: { name: true, id: true } } }
        }
      }
    });

    return c.json({ success: true, data: formatPaper(fullDoc), message: "Review completed successfully" });
  } catch (error) { throw error;
    if (error instanceof AppError) return c.json({ success: false, error: error.message }, error.statusCode as any);
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
};

app.post("/:id/review/complete", completeReviewHandler);
app.post("/:id/review", completeReviewHandler);

// --- DELETE PAPER ---
app.delete("/:id", async (c) => {
  const { session, role } = await requireAuth(c);
  const id = c.req.param("id");

  const doc = await db.query.papers.findFirst({ where: eq(papers.id, id) });
  if (!doc) throw new NotFoundError("Paper not found");

  if (doc.authorId !== session.user.id && role !== "Administrator") {
    throw new ForbiddenError("Only the author or an admin can delete this paper");
  }

  await db.delete(papers).where(eq(papers.id, id));

  return c.json({ success: true, message: "Paper deleted successfully" });
});

export default app;
