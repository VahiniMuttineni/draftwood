import { db } from "@/db";
import { paperRepository } from "@/modules/papers/paper.repository";
import { workflowHistory, notifications, paperAssignments, paperReviews, users, roles, userRoles } from "@/db/schema";
import { ConflictError, ForbiddenError, ValidationError } from "@/lib/errors";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { emitToUser } from "@/lib/sse";

type PaperStatus = "Draft" | "Pending Review" | "Reviewer Assigned" | "Under Review" | "Review Completed" | "Revision Required" | "Published" | "Rejected";

const ALLOWED_TRANSITIONS: Record<PaperStatus, PaperStatus[]> = {
  Draft: ["Pending Review"],
  "Pending Review": ["Reviewer Assigned"],
  "Reviewer Assigned": ["Under Review"],
  "Under Review": ["Review Completed"],
  "Review Completed": ["Published", "Revision Required", "Rejected"],
  "Revision Required": ["Pending Review"],
  Published: [],
  Rejected: [],
};

async function getAdminIds(tx: any) {
  const adminRoles = await tx.select({ id: users.id }).from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(roles.name, "Administrator"));
  return adminRoles.map((a: any) => a.id);
}

export class WorkflowService {
  
  async submitForReview(params: {
    paperId: string;
    actorId: string;
    optimisticVersion: number;
    title: string;
    authorName: string;
  }) {
    const { paperId, actorId, optimisticVersion, title, authorName } = params;
    let createdNotifs: any[] = [];
    
    const result = await db.transaction(async (tx) => {
      const doc = await paperRepository.findById(paperId, tx);
      if (!doc) throw new ValidationError("Paper not found");

      const fromStatus = doc.status as PaperStatus;
      if (fromStatus !== "Draft" && fromStatus !== "Revision Required") {
        throw new ConflictError(`Invalid transition from ${doc.status} to Pending Review`);
      }

      const updated = await paperRepository.updateWithOcc(paperId, optimisticVersion, { status: "Pending Review" }, tx);

      await tx.insert(workflowHistory).values({
        paperId,
        fromStatus,
        toStatus: "Pending Review",
        performedBy: actorId,
        role: "Author",
        remarks: "Submitted for review"
      });

      const adminIds = await getAdminIds(tx);
      for (const adminId of adminIds) {
        const notif = await tx.insert(notifications).values({
          type: "PAPER_SUBMITTED",
          title: "New Paper Submitted",
          message: `Paper "${title}" has been submitted by "${authorName}" and is ready for reviewer assignment.`,
          recipientId: adminId,
          senderId: actorId,
          entityId: paperId,
          actionUrl: `/papers/${paperId}`,
          priority: "HIGH"
        }).returning();
        createdNotifs.push(notif[0]);
      }
      logger.info({ 
        action: "SUBMIT_FOR_REVIEW", 
        paperId, 
        actorId, 
        fromStatus, 
        toStatus: "Pending Review", 
        version: updated.optimisticVersion 
      }, "Paper submitted for review");

      return updated;
    });

    createdNotifs.forEach(n => emitToUser(n.recipientId, "new_notification", n));
    return result;
  }

  async assignReviewer(params: {
    paperId: string;
    adminId: string;
    reviewerId: string;
    optimisticVersion: number;
    title: string;
  }) {
    const { paperId, adminId, reviewerId, optimisticVersion, title } = params;
    let createdNotifs: any[] = [];

    const result = await db.transaction(async (tx) => {
      const doc = await paperRepository.findById(paperId, tx);
      if (!doc) throw new ValidationError("Paper not found");
      const fromStatus = doc.status as PaperStatus;

      if (!ALLOWED_TRANSITIONS[fromStatus]?.includes("Reviewer Assigned")) {
        throw new ConflictError(`Invalid transition from ${fromStatus} to Reviewer Assigned`);
      }

      const updated = await paperRepository.updateWithOcc(paperId, optimisticVersion, { status: "Reviewer Assigned" }, tx);

      await tx.insert(paperAssignments).values({
        paperId,
        reviewerId,
        assignedBy: adminId,
        status: "PENDING"
      });

      await tx.insert(workflowHistory).values({
        paperId,
        fromStatus,
        toStatus: "Reviewer Assigned",
        performedBy: adminId,
        role: "Admin",
        remarks: `Assigned reviewer ${reviewerId}`
      });

      const notif = await tx.insert(notifications).values({
        type: "REVIEW_ASSIGNED",
        title: "New Paper Assigned",
        message: `You have been assigned the paper "${title}" for review.`,
        recipientId: reviewerId,
        senderId: adminId,
        entityId: paperId,
        actionUrl: `/papers/${paperId}`,
        priority: "HIGH"
      }).returning();
      createdNotifs.push(notif[0]);

      logger.info({ 
        action: "ASSIGN_REVIEWER", 
        paperId, 
        adminId, 
        reviewerId, 
        fromStatus, 
        toStatus: "Reviewer Assigned", 
        version: updated.optimisticVersion 
      }, "Reviewer assigned");

      return updated;
    });

    createdNotifs.forEach(n => emitToUser(n.recipientId, "new_notification", n));
    return result;
  }

  async startReview(params: {
    paperId: string;
    reviewerId: string;
    optimisticVersion: number;
  }) {
    return await db.transaction(async (tx) => {
      const doc = await paperRepository.findById(params.paperId, tx);
      if (doc?.status === "Reviewer Assigned") {
        await paperRepository.updateWithOcc(params.paperId, params.optimisticVersion, { status: "Under Review" }, tx);
        await tx.insert(workflowHistory).values({
          paperId: params.paperId,
          fromStatus: "Reviewer Assigned",
          toStatus: "Under Review",
          performedBy: params.reviewerId,
          role: "Reviewer",
          remarks: "Review started"
        });

        logger.info({ 
          action: "START_REVIEW", 
          paperId: params.paperId, 
          reviewerId: params.reviewerId, 
          fromStatus: "Reviewer Assigned", 
          toStatus: "Under Review" 
        }, "Review started");
      }
    });
  }

  async submitReview(params: {
    paperId: string;
    assignmentId: string;
    reviewerId: string;
    reviewerName: string;
    title: string;
    comments: any;
    suggestions: string;
    recommendation: "Approve" | "Revision Required" | "Reject";
    optimisticVersion: number;
  }) {
    let createdNotifs: any[] = [];
    
    const result = await db.transaction(async (tx) => {
      const { paperId, assignmentId, reviewerId, reviewerName, title, comments, suggestions, recommendation, optimisticVersion } = params;
      const doc = await paperRepository.findById(paperId, tx);
      if (!doc) throw new ValidationError("Paper not found");

      const fromStatus = doc.status as PaperStatus;
      if (fromStatus !== "Under Review" && fromStatus !== "Reviewer Assigned") {
        throw new ConflictError("Paper is not under review");
      }

      const updated = await paperRepository.updateWithOcc(paperId, optimisticVersion, { status: "Review Completed" }, tx);

      await tx.update(paperAssignments).set({ status: "COMPLETED", completedAt: new Date() }).where(eq(paperAssignments.id, assignmentId));

      await tx.insert(paperReviews).values({
        assignmentId,
        paperId,
        reviewerId,
        comments,
        suggestions,
        recommendation
      });

      await tx.insert(workflowHistory).values({
        paperId,
        fromStatus,
        toStatus: "Review Completed",
        performedBy: reviewerId,
        role: "Reviewer",
        remarks: `Review completed with recommendation: ${recommendation}`
      });

      const adminIds = await getAdminIds(tx);
      for (const adminId of adminIds) {
        const notif = await tx.insert(notifications).values({
          type: "REVIEW_COMPLETED",
          title: "Review Completed",
          message: `Reviewer "${reviewerName}" has completed reviewing "${title}".`,
          recipientId: adminId,
          senderId: reviewerId,
          entityId: paperId,
          actionUrl: `/papers/${paperId}`,
          priority: "NORMAL"
        }).returning();
        createdNotifs.push(notif[0]);
      }

      logger.info({ 
        action: "SUBMIT_REVIEW", 
        paperId, 
        reviewerId, 
        recommendation, 
        fromStatus, 
        toStatus: "Review Completed", 
        version: updated.optimisticVersion 
      }, "Review completed");

      return updated;
    });

    createdNotifs.forEach(n => emitToUser(n.recipientId, "new_notification", n));
    return result;
  }

  async adminDecision(params: {
    paperId: string;
    adminId: string;
    title: string;
    authorId: string;
    decision: "Publish" | "Request Revision" | "Reject";
    optimisticVersion: number;
  }) {
    let createdNotifs: any[] = [];
    
    const result = await db.transaction(async (tx) => {
      const { paperId, adminId, title, authorId, decision, optimisticVersion } = params;
      const doc = await paperRepository.findById(paperId, tx);
      if (!doc) throw new ValidationError("Paper not found");

      const fromStatus = doc.status as PaperStatus;
      if (fromStatus !== "Review Completed") {
        throw new ConflictError("Paper must be in Review Completed status");
      }

      let toStatus: PaperStatus;
      let notifType: string;
      let notifTitle: string;
      let notifMsg: string;

      if (decision === "Publish") {
        toStatus = "Published";
        notifType = "PAPER_PUBLISHED";
        notifTitle = "Congratulations!";
        notifMsg = `Your paper "${title}" has been successfully reviewed and published.`;
      } else if (decision === "Request Revision") {
        toStatus = "Revision Required";
        notifType = "REVISION_REQUIRED";
        notifTitle = "Revision Requested";
        notifMsg = `Your paper "${title}" requires revisions based on reviewer comments.`;
      } else {
        toStatus = "Rejected";
        notifType = "PAPER_REJECTED";
        notifTitle = "Paper Rejected";
        notifMsg = `Your paper "${title}" has been rejected after review.`;
      }

      const updated = await paperRepository.updateWithOcc(paperId, optimisticVersion, { 
        status: toStatus,
        ...(decision === "Publish" ? { publishedAt: new Date(), publishedBy: adminId } : {})
      }, tx);

      await tx.insert(workflowHistory).values({
        paperId,
        fromStatus,
        toStatus,
        performedBy: adminId,
        role: "Admin",
        remarks: `Admin decision: ${decision}`
      });

      const notif = await tx.insert(notifications).values({
        type: notifType,
        title: notifTitle,
        message: notifMsg,
        recipientId: authorId,
        senderId: adminId,
        entityId: paperId,
        actionUrl: `/papers/${paperId}`,
        priority: "HIGH"
      }).returning();
      createdNotifs.push(notif[0]);

      logger.info({ 
        action: "ADMIN_DECISION", 
        paperId, 
        adminId, 
        decision, 
        fromStatus, 
        toStatus, 
        version: updated.optimisticVersion 
      }, "Admin decision recorded");

      return updated;
    });

    createdNotifs.forEach(n => emitToUser(n.recipientId, "new_notification", n));
    return result;
  }
}

export const workflowService = new WorkflowService();
