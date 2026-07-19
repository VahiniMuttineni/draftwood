import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import papersRouter from "@/routes/papers";
import { requireAuth } from "@/middleware/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

// Mock the auth middleware
vi.mock("@/middleware/auth", () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
}));

// Mock DB to prevent real DB access during auth route testing
vi.mock("@/db", () => {
  return {
    db: {
      query: {
        papers: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
        users: {
          findFirst: vi.fn(),
        },
        paperAssignments: {
          findFirst: vi.fn(),
        }
      },
      transaction: vi.fn(),
    },
  };
});

vi.mock("@/modules/workflow/workflow.service", () => ({
  workflowService: {
    submitForReview: vi.fn(),
    assignReviewer: vi.fn(),
    adminDecision: vi.fn(),
    startReview: vi.fn(),
    submitReview: vi.fn(),
  }
}));

describe("Security & Authorization (Negative Tests)", () => {
  const app = new Hono();
  app.route("/papers", papersRouter);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 Unauthorized for anonymous user accessing paper APIs", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new UnauthorizedError("Authentication required"));
    
    const res = await app.request("/papers");
    expect(res.status).toBe(401);
  });

  it("should return 403 Forbidden for Author trying to publish a paper (Admin decision)", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "author-1" } },
      role: "Author"
    } as any);

    const res = await app.request("/papers/paper-1/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "Publish", optimisticVersion: 1 })
    });
    
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Only admins can make decisions");
  });

  it("should return 403 Forbidden for Reviewer trying to assign another reviewer", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "reviewer-1" } },
      role: "Reviewer"
    } as any);

    const res = await app.request("/papers/paper-1/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewerId: "reviewer-2", optimisticVersion: 1 })
    });
    
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Only admins can assign reviewers");
  });

  it("should return 403 Forbidden for Author editing a paper they do not own", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "author-2" } },
      role: "Author"
    } as any);

    // Mock findFirst to return a paper owned by author-1
    const { db } = await import("@/db");
    vi.mocked(db.query.papers.findFirst).mockResolvedValue({
      id: "paper-1",
      authorId: "author-1",
      status: "Draft"
    } as any);

    const res = await app.request("/papers/paper-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hack", optimisticVersion: 1 })
    });
    
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Only the author can edit this paper");
  });

  it("should return 403 Forbidden for Reviewer trying to submit review as someone else", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "author-1" } },
      role: "Author" // Not a reviewer
    } as any);

    const res = await app.request("/papers/paper-1/review/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendation: "Approve", optimisticVersion: 1 })
    });
    
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Only reviewers can submit reviews");
  });
});
