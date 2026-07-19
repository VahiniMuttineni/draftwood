import { db } from "./backend/src/db/index";
import { users, papers, paperVersions, paperAssignments } from "./backend/src/db/schema";
import { eq, desc } from "drizzle-orm";
import { workflowService } from "./backend/src/modules/workflow/workflow.service";
import { paperRepository } from "./backend/src/modules/papers/paper.repository";

async function run() {
  console.log("Starting programmatic flow verification...");

  // 1. Fetch Alice (Author), Bob (Reviewer), and Admin (Administrator)
  const alice = await db.query.users.findFirst({ where: eq(users.email, "alice@example.com") });
  const bob = await db.query.users.findFirst({ where: eq(users.email, "bob@example.com") });
  const admin = await db.query.users.findFirst({ where: eq(users.email, "admin@example.com") });

  if (!alice || !bob || !admin) {
    console.error("Seeded users not found! Please run db:seed first.");
    process.exit(1);
  }
  console.log("Seeded users found:");
  console.log(`- Alice (Author): ${alice.id}`);
  console.log(`- Bob (Reviewer): ${bob.id}`);
  console.log(`- Admin (Administrator): ${admin.id}`);

  // 2. Create a new paper for Alice
  console.log("\n1. Creating a new paper draft for Alice...");
  const paper = await db.transaction(async (tx) => {
    const p = await paperRepository.create({
      authorId: alice.id,
      departmentId: alice.departmentId!,
      status: "Draft",
    }, tx);

    const [v] = await tx.insert(paperVersions).values({
      paperId: p.id,
      versionNumber: 1,
      title: "Impact of Antigravity in Physics",
      body: { type: "doc", content: [{ type: "paragraph", text: "Gravity is so yesterday." }] },
      createdBy: alice.id,
    }).returning();

    await tx.update(papers).set({ currentVersionId: v.id }).where(eq(papers.id, p.id));
    return p;
  });
  console.log(`Paper created! ID: ${paper.id}, Status: ${paper.status}, Version: ${paper.optimisticVersion}`);

  // 3. Submit paper for review
  console.log("\n2. Submitting paper for review...");
  const submittedPaper = await workflowService.submitForReview({
    paperId: paper.id,
    actorId: alice.id,
    optimisticVersion: paper.optimisticVersion,
    title: "Impact of Antigravity in Physics",
    authorName: alice.name,
  });
  console.log(`Paper submitted! Status: ${submittedPaper.status}, Version: ${submittedPaper.optimisticVersion}`);

  // 4. Assign Bob as reviewer
  console.log("\n3. Admin assigning Bob as Reviewer...");
  const assignedPaper = await workflowService.assignReviewer({
    paperId: paper.id,
    adminId: admin.id,
    reviewerId: bob.id,
    optimisticVersion: submittedPaper.optimisticVersion,
    title: "Impact of Antigravity in Physics",
  });
  console.log(`Reviewer assigned! Status: ${assignedPaper.status}, Version: ${assignedPaper.optimisticVersion}`);

  // Fetch the assignment
  const assignment = await db.query.paperAssignments.findFirst({
    where: eq(paperAssignments.paperId, paper.id),
  });
  if (!assignment) {
    console.error("Assignment not found!");
    process.exit(1);
  }

  // 5. Start review as Bob
  console.log("\n4. Bob starting review...");
  await workflowService.startReview({
    paperId: paper.id,
    reviewerId: bob.id,
    optimisticVersion: assignedPaper.optimisticVersion,
  });
  // Fetch fresh paper status
  let freshPaper = await paperRepository.findById(paper.id);
  console.log(`Review started! Status: ${freshPaper?.status}, Version: ${freshPaper?.optimisticVersion}`);

  // 6. Complete review as Bob
  console.log("\n5. Bob submitting review feedback...");
  const reviewedPaper = await workflowService.submitReview({
    paperId: paper.id,
    assignmentId: assignment.id,
    reviewerId: bob.id,
    reviewerName: bob.name,
    title: "Impact of Antigravity in Physics",
    comments: { feedback: "Fascinating work. Minor spelling checks." },
    suggestions: "None",
    recommendation: "Approve",
    optimisticVersion: freshPaper!.optimisticVersion,
  });
  console.log(`Review completed! Status: ${reviewedPaper.status}, Version: ${reviewedPaper.optimisticVersion}`);

  // 7. Admin final decision: Publish
  console.log("\n6. Admin making final decision (Publish)...");
  const finalPaper = await workflowService.adminDecision({
    paperId: paper.id,
    adminId: admin.id,
    title: "Impact of Antigravity in Physics",
    authorId: alice.id,
    decision: "Publish",
    optimisticVersion: reviewedPaper.optimisticVersion,
  });
  console.log(`Final paper published! Status: ${finalPaper.status}, Version: ${finalPaper.optimisticVersion}`);

  console.log("\n✅ Programmatic flow verification completed successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Flow failed with error:", err);
  process.exit(1);
});
