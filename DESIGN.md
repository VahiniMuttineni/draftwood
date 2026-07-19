# Design Note: Controlled Document Approval System

This document outlines the architectural and design decisions for the ExecutiveFlow Document Approval System, specifically addressing the core constraints of the challenge.

## 1. What are the most important invariants in your system?
- **Strict State Machine**: A document can only transition according to the predefined directed graph (e.g., Draft -> Submitted -> Approved -> Published).
- **Append-only Audit Log**: Every state change or critical mutation (edit, assignment) MUST have a corresponding immutable audit log entry.
- **Role-Based Ownership Check**: Certain actions require dual validation of both the user's role (e.g., "Author") and their relationship to the document (e.g., "Owner"). For example, Reviewers cannot approve their own documents, and Authors cannot approve anything.
- **Visibility Firewall**: Viewers can exclusively read "Published" documents; all other states are invisible to them.
- **Conflict Prevention**: Two actors cannot overwrite each other's changes silently (Optimistic Concurrency Control).

## 2. Which invariants are enforced by the database, and which by application code?
**Enforced by Database (Postgres/Drizzle):**
- Foreign key constraints (e.g., ensuring owners/reviewers map to actual users).
- Unique constraints on document versions (`UNIQUE(document_id, version)`).
- Relational integrity (cascading deletes for comments and history when a document is removed).

**Enforced by Application Code (Hono API layer):**
- **State Transitions**: Validated against an `ALLOWED_TRANSITIONS` map.
- **Permissions**: RBAC checks verified against the authenticated user session.
- **Optimistic Concurrency**: Checking if the `currentVersion` sent by the client matches the DB before updating.
- **Audit Consistency**: Wrapping the document mutation and the audit log insertion in a single database transaction.

## 3. How do permissions work?
Permissions are fundamentally enforced on the backend (Hono server). While the frontend hides UI buttons based on the user's role, the server never trusts the client.
Every sensitive endpoint extracts the user's role from the secure session (Better Auth) and runs conditional checks:
1. Validating the Role (e.g., `role === "Administrator"`).
2. Validating Ownership (e.g., `doc.ownerId === session.user.id`).
3. Validating the State (e.g., `doc.status === "Draft"`).

## 4. How do you prevent stale or conflicting updates?
We use **Optimistic Concurrency Control (OCC)** using a `currentVersion` column on the document. 
1. The client reads the document (e.g., `currentVersion: 2`).
2. When submitting a mutation (e.g., Edit or Transition), the client sends `currentVersion: 2` in the payload.
3. The server runs an atomic update: `UPDATE documents SET ... WHERE id = ? AND currentVersion = 2`. 
4. If no rows are updated, it means another user already bumped the version to 3. The server throws a `ConflictError`, and the UI prompts the user to refresh instead of silently overwriting.

## 5. How do you keep audit events consistent with document state changes?
Every state-changing workflow is executed inside a single **Database Transaction** (`db.transaction`).
Within that transaction block, we execute the document `UPDATE` query, insert the `workflowHistory` record, and insert the `auditLog` record. If the database crashes, or if any of the operations fail, the entire transaction rolls back. This guarantees we never have a document change state without the accompanying audit event.

## 6. What failure cases did you consider?
- **Concurrent edits (The "Tuesday" problem)**: Handled via OCC, as described above.
- **Malicious/Stale API calls**: A user trying to hit `/transition` to move a Draft directly to Published. Blocked by server-side transition map checks.
- **Transaction aborts**: If the audit log insert fails due to DB constraints, the document state change is rolled back.
- **Self-Approval**: An author temporarily granted "Reviewer" role trying to approve their own document. Blocked by dual ownership/role checks.

## 7. What would you improve with more time?
- **Event-Driven Architecture**: Moving notifications and non-critical side effects to a message queue (e.g., Redis Streams / RabbitMQ) to reduce the latency of the primary database transaction.
- **Granular Permissions (ABAC)**: Transitioning from rigid RBAC roles (Author, Reviewer) to Attribute-Based Access Control using a policy engine like OPA (Open Policy Agent) or Zanzibar for more complex enterprise team structures.
- **Document Versioning Payload**: Currently, edits are tracked in `auditLogs` as JSON diffs. Implementing delta-based versioning (like OT or CRDTs) would allow robust collaborative editing and cleaner history restoration.

## 8. What would need to change for a real production system?
- **Authentication**: Replace seeded users with a production identity provider (Okta, Entra ID) using SAML 2.0 or OIDC.
- **Database Scalability**: Introduce read-replicas for Viewer queries to reduce load on the primary writer DB instance.
- **File Storage**: If documents need attachments or rich media, integrate an S3-compatible blob storage with signed URLs, rather than keeping everything in Postgres.
- **E2E Testing**: Add Playwright tests simulating concurrent users colliding on the same document to continuously verify the OCC logic.
