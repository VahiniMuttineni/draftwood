import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkflowService } from "./workflow.service";
import { paperRepository } from "../papers/paper.repository";
import { ConflictError, ValidationError, OptimisticConcurrencyError } from "@/lib/errors";

// Mock the paper repository
vi.mock("../papers/paper.repository", () => ({
  paperRepository: {
    findById: vi.fn(),
    updateWithOcc: vi.fn(),
    create: vi.fn(),
  }
}));

// Mock DB transaction to just run the callback
vi.mock("@/db", () => {
  const mockTx = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ id: "mock-id" }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => Promise.resolve([{ id: "admin-id" }])),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  };

  return {
    db: {
      transaction: vi.fn(async (cb) => {
        return await cb(mockTx);
      }),
    },
    users: { id: "users-id" },
    userRoles: { userId: "user-roles-user-id", roleId: "user-roles-role-id" },
    roles: { id: "roles-id", name: "roles-name" },
    workflowHistory: { id: "history-id" },
    notifications: { id: "notif-id" },
    paperAssignments: { id: "assign-id" },
    paperReviews: { id: "review-id" },
  };
});

describe("WorkflowService", () => {
  const service = new WorkflowService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitForReview", () => {
    it("should transition from Draft to Pending Review successfully", async () => {
      vi.mocked(paperRepository.findById).mockResolvedValue({
        id: "paper-1",
        status: "Draft",
        authorId: "author-1",
        optimisticVersion: 1,
      } as any);

      vi.mocked(paperRepository.updateWithOcc).mockResolvedValue({
        id: "paper-1",
        status: "Pending Review",
        optimisticVersion: 2,
      } as any);

      const result = await service.submitForReview({
        paperId: "paper-1",
        actorId: "author-1",
        optimisticVersion: 1,
        title: "Test Paper",
        authorName: "Alice",
      });

      expect(result).toBeDefined();
      expect(paperRepository.updateWithOcc).toHaveBeenCalledWith(
        "paper-1",
        1,
        { status: "Pending Review" },
        expect.any(Object)
      );
    });

    it("should transition from Revision Required to Pending Review successfully", async () => {
      vi.mocked(paperRepository.findById).mockResolvedValue({
        id: "paper-1",
        status: "Revision Required",
        authorId: "author-1",
        optimisticVersion: 2,
      } as any);

      vi.mocked(paperRepository.updateWithOcc).mockResolvedValue({
        id: "paper-1",
        status: "Pending Review",
        optimisticVersion: 3,
      } as any);

      const result = await service.submitForReview({
        paperId: "paper-1",
        actorId: "author-1",
        optimisticVersion: 2,
        title: "Test Paper",
        authorName: "Alice",
      });

      expect(result).toBeDefined();
    });

    it("should throw ConflictError if status is not Draft or Revision Required", async () => {
      vi.mocked(paperRepository.findById).mockResolvedValue({
        id: "paper-1",
        status: "Under Review",
        authorId: "author-1",
        optimisticVersion: 2,
      } as any);

      await expect(
        service.submitForReview({
          paperId: "paper-1",
          actorId: "author-1",
          optimisticVersion: 2,
          title: "Test Paper",
          authorName: "Alice",
        })
      ).rejects.toThrow(ConflictError);
    });

    it("should throw ValidationError if paper is not found", async () => {
      vi.mocked(paperRepository.findById).mockResolvedValue(null);

      await expect(
        service.submitForReview({
          paperId: "paper-1",
          actorId: "author-1",
          optimisticVersion: 1,
          title: "Test Paper",
          authorName: "Alice",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("assignReviewer", () => {
    it("should transition from Pending Review to Reviewer Assigned successfully", async () => {
      vi.mocked(paperRepository.findById).mockResolvedValue({
        id: "paper-1",
        status: "Pending Review",
        optimisticVersion: 2,
      } as any);

      vi.mocked(paperRepository.updateWithOcc).mockResolvedValue({
        id: "paper-1",
        status: "Reviewer Assigned",
        optimisticVersion: 3,
      } as any);

      const result = await service.assignReviewer({
        paperId: "paper-1",
        adminId: "admin-1",
        reviewerId: "reviewer-1",
        optimisticVersion: 2,
        title: "Test Paper",
      });

      expect(result).toBeDefined();
      expect(paperRepository.updateWithOcc).toHaveBeenCalledWith(
        "paper-1",
        2,
        { status: "Reviewer Assigned" },
        expect.any(Object)
      );
    });

    it("should throw ConflictError if paper is not in Pending Review", async () => {
      vi.mocked(paperRepository.findById).mockResolvedValue({
        id: "paper-1",
        status: "Draft",
        optimisticVersion: 1,
      } as any);

      await expect(
        service.assignReviewer({
          paperId: "paper-1",
          adminId: "admin-1",
          reviewerId: "reviewer-1",
          optimisticVersion: 1,
          title: "Test Paper",
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("startReview", () => {
    it("should transition status to Under Review if currently Reviewer Assigned", async () => {
      vi.mocked(paperRepository.findById).mockResolvedValue({
        id: "paper-1",
        status: "Reviewer Assigned",
        optimisticVersion: 3,
      } as any);

      await service.startReview({
        paperId: "paper-1",
        reviewerId: "reviewer-1",
        optimisticVersion: 3,
      });

      expect(paperRepository.updateWithOcc).toHaveBeenCalledWith(
        "paper-1",
        3,
        { status: "Under Review" },
        expect.any(Object)
      );
    });

    it("should do nothing if status is not Reviewer Assigned", async () => {
      vi.mocked(paperRepository.findById).mockResolvedValue({
        id: "paper-1",
        status: "Draft",
        optimisticVersion: 1,
      } as any);

      await service.startReview({
        paperId: "paper-1",
        reviewerId: "reviewer-1",
        optimisticVersion: 1,
      });

      expect(paperRepository.updateWithOcc).not.toHaveBeenCalled();
    });
  });

  describe("submitReview", () => {
    it("should transition from Under Review to Review Completed successfully", async () => {
      vi.mocked(paperRepository.findById).mockResolvedValue({
        id: "paper-1",
        status: "Under Review",
        optimisticVersion: 4,
      } as any);

      vi.mocked(paperRepository.updateWithOcc).mockResolvedValue({
        id: "paper-1",
        status: "Review Completed",
        optimisticVersion: 5,
      } as any);

      const result = await service.submitReview({
        paperId: "paper-1",
        assignmentId: "assignment-1",
        reviewerId: "reviewer-1",
        reviewerName: "Bob",
        title: "Test Paper",
        comments: { text: "Good work" },
        suggestions: "Minor edits",
        recommendation: "Approve",
        optimisticVersion: 4,
      });

      expect(result).toBeDefined();
    });

    it("should throw ConflictError if status is not Under Review or Reviewer Assigned", async () => {
      vi.mocked(paperRepository.findById).mockResolvedValue({
        id: "paper-1",
        status: "Draft",
        optimisticVersion: 1,
      } as any);

      await expect(
        service.submitReview({
          paperId: "paper-1",
          assignmentId: "assignment-1",
          reviewerId: "reviewer-1",
          reviewerName: "Bob",
          title: "Test Paper",
          comments: {},
          suggestions: "",
          recommendation: "Approve",
          optimisticVersion: 1,
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("adminDecision", () => {
    it("should publish paper if decision is Publish", async () => {
      vi.mocked(paperRepository.findById).mockResolvedValue({
        id: "paper-1",
        status: "Review Completed",
        optimisticVersion: 5,
      } as any);

      vi.mocked(paperRepository.updateWithOcc).mockResolvedValue({
        id: "paper-1",
        status: "Published",
        optimisticVersion: 6,
      } as any);

      const result = await service.adminDecision({
        paperId: "paper-1",
        adminId: "admin-1",
        title: "Test Paper",
        authorId: "author-1",
        decision: "Publish",
        optimisticVersion: 5,
      });

      expect(result).toBeDefined();
      expect(paperRepository.updateWithOcc).toHaveBeenCalledWith(
        "paper-1",
        5,
        expect.objectContaining({ status: "Published", publishedBy: "admin-1" }),
        expect.any(Object)
      );
    });

    it("should request revision if decision is Request Revision", async () => {
      vi.mocked(paperRepository.findById).mockResolvedValue({
        id: "paper-1",
        status: "Review Completed",
        optimisticVersion: 5,
      } as any);

      vi.mocked(paperRepository.updateWithOcc).mockResolvedValue({
        id: "paper-1",
        status: "Revision Required",
        optimisticVersion: 6,
      } as any);

      const result = await service.adminDecision({
        paperId: "paper-1",
        adminId: "admin-1",
        title: "Test Paper",
        authorId: "author-1",
        decision: "Request Revision",
        optimisticVersion: 5,
      });

      expect(result).toBeDefined();
      expect(paperRepository.updateWithOcc).toHaveBeenCalledWith(
        "paper-1",
        5,
        expect.objectContaining({ status: "Revision Required" }),
        expect.any(Object)
      );
    });

    it("should throw ConflictError if status is not Review Completed", async () => {
      vi.mocked(paperRepository.findById).mockResolvedValue({
        id: "paper-1",
        status: "Draft",
        optimisticVersion: 1,
      } as any);

      await expect(
        service.adminDecision({
          paperId: "paper-1",
          adminId: "admin-1",
          title: "Test Paper",
          authorId: "author-1",
          decision: "Publish",
          optimisticVersion: 1,
        })
      ).rejects.toThrow(ConflictError);
    });
  });
});
