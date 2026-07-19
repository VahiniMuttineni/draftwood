import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { eq } from "drizzle-orm";

const testBody = (title: string, textContent: string) => ({
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: title }]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: textContent }
      ]
    }
  ]
});

async function main() {
  logger.info("Connecting to database for seeding demo data...");
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  // Get the seeded users
  const alice = await db.query.users.findFirst({ where: eq(schema.users.email, "alice@example.com") });
  const bob = await db.query.users.findFirst({ where: eq(schema.users.email, "bob@example.com") });
  const admin = await db.query.users.findFirst({ where: eq(schema.users.email, "admin@example.com") });
  const viewer = await db.query.users.findFirst({ where: eq(schema.users.email, "viewer@example.com") });

  if (!alice || !bob || !admin || !viewer) {
    logger.error("Seeded users not found. Please run the base seed first.");
    process.exit(1);
  }

  const deptId = alice.departmentId!;

  logger.info("Clearing existing papers and logs...");
  // Clear only the active tables (not the archives)
  await db.delete(schema.notifications);
  await db.delete(schema.workflowHistory);
  await db.delete(schema.paperReviews);
  await db.delete(schema.paperAssignments);
  await db.delete(schema.paperVersions);
  await db.delete(schema.papers);

  logger.info("Inserting demo papers...");

  // 1. DRAFT PAPER
  const [docDraft] = await db.insert(schema.papers).values({
    status: "Draft",
    authorId: alice.id,
    departmentId: deptId,
  }).returning();

  await db.insert(schema.paperVersions).values({
    paperId: docDraft.id,
    versionNumber: 1,
    title: "Q3 Product Strategy Roadmap",
    body: testBody("Q3 Product Strategy Roadmap", "This is the draft roadmap for Q3 product releases."),
    createdBy: alice.id
  });

  await db.insert(schema.workflowHistory).values({
    paperId: docDraft.id,
    toStatus: "Draft",
    performedBy: alice.id,
    role: "Author",
    remarks: "Initial draft creation",
  });


  // 2. PENDING REVIEW PAPER
  const [docPending] = await db.insert(schema.papers).values({
    status: "Pending Review",
    authorId: alice.id,
    departmentId: deptId,
  }).returning();

  await db.insert(schema.paperVersions).values({
    paperId: docPending.id,
    versionNumber: 1,
    title: "Code of Conduct Guidelines",
    body: testBody("Code of Conduct Guidelines", "Draft compliance documentation detailing standard operating procedures and code of conduct expectations."),
    createdBy: alice.id
  });

  await db.insert(schema.workflowHistory).values({
    paperId: docPending.id,
    fromStatus: "Draft",
    toStatus: "Pending Review",
    performedBy: alice.id,
    role: "Author",
    remarks: "Submitted for review"
  });


  // 3. UNDER REVIEW PAPER (Reviewer Assigned)
  const [docUnderReview] = await db.insert(schema.papers).values({
    status: "Under Review",
    authorId: alice.id,
    departmentId: deptId,
  }).returning();

  await db.insert(schema.paperVersions).values({
    paperId: docUnderReview.id,
    versionNumber: 1,
    title: "Security Audit Q2",
    body: testBody("Security Audit Q2", "Comprehensive security audit results and vulnerability assessment."),
    createdBy: alice.id
  });

  // Assign Reviewer
  await db.insert(schema.paperAssignments).values({
    paperId: docUnderReview.id,
    reviewerId: bob.id,
    assignedBy: admin.id,
    status: "PENDING"
  });

  await db.insert(schema.workflowHistory).values({
    paperId: docUnderReview.id,
    fromStatus: "Pending Review",
    toStatus: "Under Review",
    performedBy: admin.id,
    role: "Admin",
    remarks: "Assigned reviewer Bob"
  });


  // 4. REVIEW COMPLETED PAPER
  const [docCompleted] = await db.insert(schema.papers).values({
    status: "Review Completed",
    authorId: alice.id,
    departmentId: deptId,
  }).returning();

  await db.insert(schema.paperVersions).values({
    paperId: docCompleted.id,
    versionNumber: 1,
    title: "Quarterly Financial Report",
    body: testBody("Quarterly Financial Report", "Financial metrics and KPI tracking for the last quarter."),
    createdBy: alice.id
  });

  const [completedAssignment] = await db.insert(schema.paperAssignments).values({
    paperId: docCompleted.id,
    reviewerId: bob.id,
    assignedBy: admin.id,
    status: "COMPLETED",
    completedAt: new Date()
  }).returning();

  await db.insert(schema.paperReviews).values({
    assignmentId: completedAssignment.id,
    paperId: docCompleted.id,
    reviewerId: bob.id,
    recommendation: "Approve",
    comments: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Looks great, all figures are accurate." }] }] },
  });

  await db.insert(schema.workflowHistory).values({
    paperId: docCompleted.id,
    fromStatus: "Under Review",
    toStatus: "Review Completed",
    performedBy: bob.id,
    role: "Reviewer",
    remarks: "Approved with comments"
  });


  // 5. PUBLISHED PAPER
  const [docPublished] = await db.insert(schema.papers).values({
    status: "Published",
    authorId: alice.id,
    departmentId: deptId,
    publishedAt: new Date(),
    publishedBy: admin.id
  }).returning();

  await db.insert(schema.paperVersions).values({
    paperId: docPublished.id,
    versionNumber: 1,
    title: "Employee Onboarding Manual",
    body: testBody("Employee Onboarding Manual", "Standard operating procedures for new hires."),
    createdBy: alice.id
  });

  const [pubAssignment] = await db.insert(schema.paperAssignments).values({
    paperId: docPublished.id,
    reviewerId: bob.id,
    assignedBy: admin.id,
    status: "COMPLETED",
    completedAt: new Date()
  }).returning();

  await db.insert(schema.paperReviews).values({
    assignmentId: pubAssignment.id,
    paperId: docPublished.id,
    reviewerId: bob.id,
    recommendation: "Approve",
    comments: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Ready for publishing." }] }] },
  });

  await db.insert(schema.workflowHistory).values({
    paperId: docPublished.id,
    fromStatus: "Review Completed",
    toStatus: "Published",
    performedBy: admin.id,
    role: "Admin",
    remarks: "Published to user portal"
  });


  logger.info("Demo data seeding completed!");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
