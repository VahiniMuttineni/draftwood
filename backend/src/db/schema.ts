import { pgTable, text, timestamp, boolean, integer, uuid, primaryKey, unique, jsonb, index } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Common timestamp columns
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
};

// --- AUTH & RBAC ---

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  departmentId: uuid("department_id"), 
  title: text("title"),
  ...timestamps,
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps,
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), 
  description: text("description"),
  ...timestamps,
});

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), 
  description: text("description"),
  ...timestamps,
});

export const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  ...timestamps,
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionId] })
}));

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  ...timestamps,
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.roleId] })
}));

// --- ORGANIZATION ---

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  ...timestamps,
});

// --- PAPERS & WORKFLOW (NEW ARCHITECTURE) ---

export const papers = pgTable("papers", {
  id: uuid("id").primaryKey().defaultRandom(),
  currentVersionId: uuid("current_version_id"), // FK to paper_versions added in relations to avoid circular initially
  status: text("status").notNull().default("Draft"), 
  authorId: uuid("author_id").notNull().references(() => users.id),
  departmentId: uuid("department_id").notNull().references(() => departments.id),
  optimisticVersion: integer("optimistic_version").notNull().default(1),
  publishedAt: timestamp("published_at"),
  publishedBy: uuid("published_by").references(() => users.id),
  ...timestamps,
}, (t) => ({
  statusIdx: index("paper_status_idx").on(t.status),
  authorIdx: index("paper_author_idx").on(t.authorId),
}));

export const paperVersions = pgTable("paper_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  paperId: uuid("paper_id").notNull().references(() => papers.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  title: text("title").notNull(),
  body: jsonb("body").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.paperId, t.versionNumber)
}));

export const paperAssignments = pgTable("paper_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  paperId: uuid("paper_id").notNull().references(() => papers.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id").notNull().references(() => users.id),
  round: integer("round").notNull().default(1),
  status: text("status").notNull().default("PENDING"), // PENDING, COMPLETED, CANCELLED
  assignedBy: uuid("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  reviewDeadline: timestamp("review_deadline"),
}, (t) => ({
  paperIdx: index("assignment_paper_idx").on(t.paperId),
  reviewerIdx: index("assignment_reviewer_idx").on(t.reviewerId),
}));

export const paperReviews = pgTable("paper_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id").notNull().references(() => paperAssignments.id, { onDelete: "cascade" }),
  paperId: uuid("paper_id").notNull().references(() => papers.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id").notNull().references(() => users.id),
  comments: jsonb("comments").notNull(), // rich text or simple text? let's use jsonb for tiptap compat if needed
  suggestions: text("suggestions"),
  recommendation: text("recommendation").notNull(), // Approve, Revision Required, Reject
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workflowHistory = pgTable("workflow_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  paperId: uuid("paper_id").notNull().references(() => papers.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  performedBy: uuid("performed_by").notNull().references(() => users.id),
  role: text("role").notNull(), // Role under which the user acted
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  paperIdx: index("workflow_paper_idx").on(t.paperId),
}));

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // PAPER_SUBMITTED, REVIEW_ASSIGNED, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  recipientId: uuid("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientRole: text("recipient_role"),
  senderId: uuid("sender_id").references(() => users.id),
  entityType: text("entity_type").notNull().default("Paper"),
  entityId: uuid("entity_id"),
  actionUrl: text("action_url"),
  priority: text("priority").default("NORMAL"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  recipientIdx: index("notification_recipient_idx").on(t.recipientId),
  unreadIdx: index("notification_unread_idx").on(t.isRead),
}));

export const paperRequests = pgTable("paper_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  paperId: uuid("paper_id").notNull().references(() => papers.id, { onDelete: "cascade" }),
  requesterId: uuid("requester_id").notNull().references(() => users.id),
  type: text("type").notNull(), // EDIT, DELETE, FEEDBACK
  reason: text("reason").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING, APPROVED, REJECTED
  assignedApproverId: uuid("assigned_approver_id").references(() => users.id),
  decisionComment: text("decision_comment"),
  decisionAt: timestamp("decision_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  paperIdx: index("paper_requests_paper_idx").on(t.paperId),
  requesterIdx: index("paper_requests_requester_idx").on(t.requesterId),
}));

// --- RELATIONS ---

export const papersRelations = relations(papers, ({ one, many }) => ({
  author: one(users, {
    fields: [papers.authorId],
    references: [users.id],
    relationName: "paper_author",
  }),
  publishedByRel: one(users, {
    fields: [papers.publishedBy],
    references: [users.id],
    relationName: "paper_publisher",
  }),
  versions: many(paperVersions),
  assignments: many(paperAssignments),
  reviews: many(paperReviews),
  workflowHistory: many(workflowHistory),
  requests: many(paperRequests),
}));

export const paperRequestsRelations = relations(paperRequests, ({ one }) => ({
  document: one(papers, { // Note: mapped as "document" for frontend compatibility
    fields: [paperRequests.paperId],
    references: [papers.id],
  }),
  requester: one(users, {
    fields: [paperRequests.requesterId],
    references: [users.id],
    relationName: "request_requester",
  }),
  assignedApprover: one(users, {
    fields: [paperRequests.assignedApproverId],
    references: [users.id],
    relationName: "request_approver",
  }),
}));

export const paperVersionsRelations = relations(paperVersions, ({ one }) => ({
  paper: one(papers, {
    fields: [paperVersions.paperId],
    references: [papers.id],
  }),
  createdByRel: one(users, {
    fields: [paperVersions.createdBy],
    references: [users.id],
  }),
}));

export const paperAssignmentsRelations = relations(paperAssignments, ({ one, many }) => ({
  paper: one(papers, {
    fields: [paperAssignments.paperId],
    references: [papers.id],
  }),
  reviewer: one(users, {
    fields: [paperAssignments.reviewerId],
    references: [users.id],
    relationName: "assigned_reviewer",
  }),
  assignedByRel: one(users, {
    fields: [paperAssignments.assignedBy],
    references: [users.id],
    relationName: "assigner",
  }),
  reviews: many(paperReviews),
}));

export const paperReviewsRelations = relations(paperReviews, ({ one }) => ({
  assignment: one(paperAssignments, {
    fields: [paperReviews.assignmentId],
    references: [paperAssignments.id],
  }),
  paper: one(papers, {
    fields: [paperReviews.paperId],
    references: [papers.id],
  }),
  reviewer: one(users, {
    fields: [paperReviews.reviewerId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  papersOwned: many(papers, { relationName: "paper_author" }),
  assignmentsReceived: many(paperAssignments, { relationName: "assigned_reviewer" }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
    relationName: "notification_recipient",
  }),
  sender: one(users, {
    fields: [notifications.senderId],
    references: [users.id],
    relationName: "notification_sender",
  }),
}));

export const workflowHistoryRelations = relations(workflowHistory, ({ one }) => ({
  performedByRel: one(users, {
    fields: [workflowHistory.performedBy],
    references: [users.id],
  }),
  paper: one(papers, {
    fields: [workflowHistory.paperId],
    references: [papers.id],
  }),
}));

// --- ARCHIVED LEGACY TABLES ---

export const documentsArchive = pgTable("documents_archive", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: jsonb("body").notNull(),
  status: text("status").notNull().default("Draft"), 
  ownerId: uuid("owner_id").notNull(),
  reviewerId: uuid("reviewer_id"),
  departmentId: uuid("department_id").notNull(),
  currentVersion: integer("current_version").notNull().default(1),
  optimisticVersion: integer("optimistic_version").notNull().default(1),
  publishedAt: timestamp("published_at"),
  archivedAt: timestamp("archived_at"),
  createdBy: uuid("created_by").notNull(),
  updatedBy: uuid("updated_by").notNull(),
  ...timestamps,
});

export const documentVersionsArchive = pgTable("document_versions_archive", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull(),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  body: jsonb("body").notNull(),
  createdBy: uuid("created_by").notNull(),
  ...timestamps,
});

export const workflowHistoryArchive = pgTable("workflow_history_archive", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull(),
  version: integer("version").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  actorId: uuid("actor_id").notNull(),
  reason: text("reason"),
  ...timestamps,
});

export const documentRequestsArchive = pgTable("document_requests_archive", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull(),
  requesterId: uuid("requester_id").notNull(),
  type: text("type").notNull(), 
  reason: text("reason").notNull(),
  status: text("status").notNull().default("PENDING"), 
  assignedApproverId: uuid("assigned_approver_id"),
  decisionComment: text("decision_comment"),
  decisionAt: timestamp("decision_at"),
  ...timestamps,
});

export const auditLogsArchive = pgTable("audit_logs_archive", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: uuid("entity_id").notNull(),
  previousState: text("previous_state"), 
  currentState: text("current_state"), 
  comment: text("comment"),
  requestId: text("request_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(), 
});

export const commentsArchive = pgTable("comments_archive", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull(),
  authorId: uuid("author_id").notNull(),
  body: jsonb("body").notNull(),
  ...timestamps,
});

export const tagsArchive = pgTable("tags_archive", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  ...timestamps,
});

export const documentTagsArchive = pgTable("document_tags_archive", {
  documentId: uuid("document_id").notNull(),
  tagId: uuid("tag_id").notNull(),
  ...timestamps,
}, (t) => ({
  pk: primaryKey({ columns: [t.documentId, t.tagId] })
}));

export const notificationsArchive = pgTable("notifications_archive", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: jsonb("body").notNull(),
  type: text("type").notNull(), 
  link: text("link"),
  actorId: uuid("actor_id"), 
  ...timestamps,
});

export const notificationReadsArchive = pgTable("notification_reads_archive", {
  notificationId: uuid("notification_id").notNull(),
  userId: uuid("user_id").notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.notificationId, t.userId] })
}));

