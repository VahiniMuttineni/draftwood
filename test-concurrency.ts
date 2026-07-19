import { workflowService } from "./backend/src/modules/workflow/workflow.service";
import { db } from "./backend/src/db";
import { papers, users, roles, userRoles } from "./backend/src/db/schema";
import { eq } from "drizzle-orm";

async function runConcurrencyTest() {
  console.log("--- Starting Concurrency Test (OCC) ---");

  // 1. Setup a test paper
  console.log("Setting up a test paper...");
  const author = await db.query.users.findFirst({ where: eq(users.email, "alice@example.com") });
  const admin = await db.query.users.findFirst({ where: eq(users.email, "admin@example.com") });
  const reviewer1 = await db.query.users.findFirst({ where: eq(users.email, "bob@example.com") });
  const reviewer2 = await db.query.users.findFirst({ where: eq(users.email, "charlie@example.com") });

  if (!author || !admin || !reviewer1) {
    console.error("Seed data missing. Please ensure DB is seeded.");
    return;
  }

  // Find a draft paper or create one
  let paper = await db.query.papers.findFirst({
    where: eq(papers.authorId, author.id)
  });

  if (!paper) {
    console.error("No paper found to test with.");
    return;
  }

  // Reset paper to 'Pending Review' for testing assign concurrency
  await db.update(papers).set({ status: "Pending Review", optimisticVersion: 1 }).where(eq(papers.id, paper.id));
  paper = await db.query.papers.findFirst({ where: eq(papers.id, paper.id) });
  
  const currentVersion = paper!.optimisticVersion;

  console.log(`Paper ID: ${paper!.id} | Current Version: ${currentVersion} | Status: Pending Review`);
  console.log("Simulating 2 Admins assigning a reviewer simultaneously...");

  // Simulate two concurrent requests trying to assign a reviewer with the same optimistic version
  const request1 = workflowService.assignReviewer({
    paperId: paper!.id,
    adminId: admin.id,
    reviewerId: reviewer1.id,
    optimisticVersion: currentVersion,
    title: "Test Paper"
  });

  const request2 = workflowService.assignReviewer({
    paperId: paper!.id,
    adminId: admin.id,
    reviewerId: reviewer2?.id || reviewer1.id,
    optimisticVersion: currentVersion,
    title: "Test Paper"
  });

  try {
    const results = await Promise.allSettled([request1, request2]);
    
    let successCount = 0;
    let failCount = 0;

    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        console.log(`[Request ${idx + 1}] SUCCEEDED.`);
        successCount++;
      } else {
        console.log(`[Request ${idx + 1}] FAILED with error: ${result.reason.message}`);
        failCount++;
      }
    });

    if (successCount === 1 && failCount === 1) {
      console.log("✅ Concurrency test PASSED. OCC prevented the race condition.");
    } else {
      console.log("❌ Concurrency test FAILED. Expected exactly 1 success and 1 failure.");
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }

  process.exit(0);
}

runConcurrencyTest();
