ALTER TABLE "audit_logs" ALTER COLUMN "entity_id" SET DATA TYPE uuid;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "request_status_idx" ON "document_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "request_document_idx" ON "document_requests" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "doc_status_idx" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "doc_owner_idx" ON "documents" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "doc_reviewer_idx" ON "documents" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "workflow_document_idx" ON "workflow_history" USING btree ("document_id");