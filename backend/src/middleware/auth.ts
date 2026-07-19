import { Context } from "hono";
import { auth } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { db } from "@/db";
import { userRoles, roles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function requireAuth(c: Context) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers
  });

  if (!session) {
    throw new UnauthorizedError("Authentication required");
  }

  // Fetch the role
  const userRoleRecords = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, session.user.id));

  const role = userRoleRecords[0]?.roleName || "Viewer"; // Default fallback

  return { session, role };
}

export async function requireRole(c: Context, allowedRoles: string[]) {
  const { session, role } = await requireAuth(c);
  
  if (!allowedRoles.includes(role)) {
    throw new ForbiddenError(`Requires one of roles: ${allowedRoles.join(", ")}`);
  }

  return { session, role };
}
