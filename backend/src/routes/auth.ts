import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userRoles, roles } from "@/db/schema";
import { eq } from "drizzle-orm";

const app = new Hono();

app.get("/me/role", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ role: "Viewer" }, 401);
  
  const userRoleQuery = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, session.user.id))
    .limit(1);
    
  return c.json({ role: userRoleQuery[0]?.name || "Viewer" });
});

app.all("/*", async (c) => {
  return auth.handler(c.req.raw);
});

export default app;
