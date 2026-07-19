export type Role = "Author" | "Reviewer" | "Administrator" | "Viewer" | "Admin";

export type Status =
  | "Draft"
  | "Pending Review"
  | "Reviewer Assigned"
  | "Under Review"
  | "Review Completed"
  | "Revision Required"
  | "Published"
  | "Rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId?: string;
}

export interface AuditEntry {
  id: string;
  actor: { id: string; name: string; email: string };
  action: string;
  previousState?: any;
  currentState?: any;
  comment?: string;
  createdAt: string;
  entityId: string;
}

export interface DocComment {
  id: string;
  user: { name: string; email: string };
  createdAt: string;
  body: string;
}

export interface Paper {
  id: string;
  status: string;
  authorId: string;
  assignedReviewerId?: string | null;
  optimisticVersion: number;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  author?: { name: string; id: string };
  currentVersion?: { title: string; body: any; versionNumber: number };
  workflowHistory?: any[];
  assignments?: any[];
  ownerId?: string;
  owner?: { name: string; id: string };
  reviewerId?: string | null;
  reviewer?: { name: string; id: string };
}

/** @deprecated Use Paper instead */
export interface Document {
  id: string;
  title: string;
  body: string;
  ownerId: string;
  owner?: { name: string; id: string };
  reviewerId?: string | null;
  reviewer?: { name: string; id: string };
  status: string;
  currentVersion: number;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
  auditLogs?: AuditEntry[];
  comments?: DocComment[];
}

export const STATUS_ORDER: Status[] = ["Draft", "Pending Review", "Reviewer Assigned", "Under Review", "Review Completed", "Published"];

export function statusColor(s: string) {
  const map: Record<string, string> = {
    "Draft": "var(--status-draft)",
    "Pending Review": "oklch(0.75 0.15 70)",
    "Reviewer Assigned": "oklch(0.65 0.15 230)",
    "Under Review": "oklch(0.55 0.2 280)",
    "Review Completed": "oklch(0.7 0.15 200)",
    "Revision Required": "oklch(0.75 0.15 90)",
    "Published": "var(--status-published)",
    "Rejected": "var(--status-rejected)",
  };
  return map[s] || "oklch(0.7 0.02 258)";
}

export const DEMO_USERS = [
  {
    email: "admin@example.com",
    name: "Admin Setup",
    role: "Administrator",
    initials: "AS",
    avatarColor: "linear-gradient(135deg, #FF6B6B 0%, #C92A2A 100%)",
  },
  {
    email: "alice@example.com",
    name: "Alice Author",
    role: "Author",
    initials: "AA",
    avatarColor: "linear-gradient(135deg, #4DABF7 0%, #1971C2 100%)",
  },
  {
    email: "bob@example.com",
    name: "Bob Reviewer",
    role: "Reviewer",
    initials: "BR",
    avatarColor: "linear-gradient(135deg, #69DB7C 0%, #2B8A3E 100%)",
  },
  {
    email: "viewer@example.com",
    name: "Viewer Staff",
    role: "Viewer",
    initials: "VS",
    avatarColor: "linear-gradient(135deg, #FCC419 0%, #E67700 100%)",
  },
];
