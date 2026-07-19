import { Hono } from "hono";
import { db } from "@/db";
import { users, roles, userRoles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/middleware/auth";

const app = new Hono();

app.get("/reviewers", async (c) => {
  await requireAuth(c); // Any authenticated user can list reviewers (or restrict to Admin)
  
  const departmentId = c.req.query("departmentId");

  const conditions = [eq(roles.name, "Reviewer")];
  if (departmentId) {
    conditions.push(eq(users.departmentId, departmentId));
  }

  const reviewers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      departmentId: users.departmentId,
    })
    .from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(...conditions));

  return c.json({ success: true, data: reviewers }, 200);
});

export default app;
