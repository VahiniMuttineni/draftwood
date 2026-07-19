CREATE TABLE "document_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"type" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"assigned_approver_id" uuid,
	"decision_comment" text,
	"decision_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "body" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "document_versions" ALTER COLUMN "body" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "body" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "body" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_assigned_approver_id_users_id_fk" FOREIGN KEY ("assigned_approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;