import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

import { hashPassword } from "better-auth/crypto";

async function main() {
  logger.info("Connecting to database for seeding...");
  
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  logger.info("Clearing existing data...");
  await db.delete(schema.notifications);
  await db.delete(schema.paperReviews);
  await db.delete(schema.paperAssignments);
  await db.delete(schema.workflowHistory);
  await db.delete(schema.paperVersions);
  await db.delete(schema.papers);
  await db.delete(schema.accounts);
  await db.delete(schema.userRoles);
  await db.delete(schema.users);
  await db.delete(schema.roles);
  await db.delete(schema.departments);
  
  logger.info("Inserting departments...");
  const [dept] = await db.insert(schema.departments).values({
    name: "Engineering",
    description: "Software Engineering Department"
  }).returning();

  logger.info("Inserting roles...");
  const [adminRole, authorRole, reviewerRole, viewerRole] = await db.insert(schema.roles).values([
    { name: "Administrator", description: "System Administrator" },
    { name: "Author", description: "Document Author" },
    { name: "Reviewer", description: "Document Reviewer" },
    { name: "Viewer", description: "Document Viewer" }
  ]).returning();

  logger.info("Inserting users...");
  const [alice, bob, admin, viewer] = await db.insert(schema.users).values([
    { name: "Alice Author", email: "alice@example.com", departmentId: dept.id, emailVerified: true },
    { name: "Bob Reviewer", email: "bob@example.com", departmentId: dept.id, emailVerified: true },
    { name: "Admin Setup", email: "admin@example.com", departmentId: dept.id, emailVerified: true },
    { name: "Viewer Staff", email: "viewer@example.com", departmentId: dept.id, emailVerified: true }
  ]).returning();

  logger.info("Assigning roles...");
  await db.insert(schema.userRoles).values([
    { userId: alice.id, roleId: authorRole.id },
    { userId: bob.id, roleId: reviewerRole.id },
    { userId: admin.id, roleId: adminRole.id },
    { userId: viewer.id, roleId: viewerRole.id }
  ]);

  logger.info("Setting passwords...");
  const hashedPassword = await hashPassword("password123");
  const baseAccount = {
    providerId: "credential",
    accountId: "credential",
    password: hashedPassword,
  };
  
  await db.insert(schema.accounts).values([
    { id: "acc_alice", userId: alice.id, ...baseAccount },
    { id: "acc_bob", userId: bob.id, ...baseAccount },
    { id: "acc_admin", userId: admin.id, ...baseAccount },
    { id: "acc_viewer", userId: viewer.id, ...baseAccount }
  ]);

  logger.info("✅ Database seeded successfully!");
  await pool.end();
}

main().catch((err) => {
  logger.error({ err }, "Failed to seed database");
  process.exit(1);
});
