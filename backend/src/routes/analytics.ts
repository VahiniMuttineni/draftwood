import { Hono } from "hono";
import { requireAuth } from "@/middleware/auth";
import { db } from "@/db";
import { papers, paperAssignments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const app = new Hono();

app.get("/", async (c) => {
  const { session, role } = await requireAuth(c);

  // Basic KPIs based on role
  const stats: any = {};

  if (role === "Author") {
    const allPapers = await db.query.papers.findMany({ where: eq(papers.authorId, session.user.id) });
    stats.total = allPapers.length;
    stats.drafts = allPapers.filter(p => p.status === "Draft").length;
    stats.underReview = allPapers.filter(p => p.status === "Under Review" || p.status === "Pending Review").length;
    stats.published = allPapers.filter(p => p.status === "Published").length;
  } else if (role === "Reviewer") {
    const allAssignments = await db.query.paperAssignments.findMany({ where: eq(paperAssignments.reviewerId, session.user.id) });
    stats.assigned = allAssignments.length;
    stats.completed = allAssignments.filter(a => a.status === "COMPLETED").length;
    stats.pending = allAssignments.filter(a => a.status === "PENDING").length;
    // Overdue logic could go here if we tracked current dates vs reviewDeadline
  } else if (role === "Administrator") {
    const allPapers = await db.query.papers.findMany();
    stats.totalPapers = allPapers.length;
    stats.pendingAssignment = allPapers.filter(p => p.status === "Pending Review").length;
    stats.readyToPublish = allPapers.filter(p => p.status === "Review Completed").length;
  }

  return c.json({ success: true, data: stats });
});

export default app;
