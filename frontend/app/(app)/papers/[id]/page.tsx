"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkflowTimeline } from "@/components/WorkflowTimeline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  ArrowLeft, Send, CheckCircle2, XCircle, Globe, Archive, RotateCcw,
  Clock, Fingerprint, User as UserIcon, GitBranch, MessageSquare,
  ShieldCheck, AlertTriangle, Lock, Save, FileText, Edit, Trash, Play,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useDebounce } from "@/lib/use-debounce";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function PaperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const id = params.id as string;
  const queryClient = useQueryClient();
  
  const { data: docRes, isLoading } = useQuery({
    queryKey: ["paper", id],
    queryFn: async () => await api.get(`/papers/${id}`)
  });
  const doc = docRes?.data;

  const [action, setAction] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState<"PUBLISH" | "REVISE" | "REJECT">("PUBLISH");
  const [selectedReviewerId, setSelectedReviewerId] = useState("");

  const { data: reviewersRes } = useQuery({
    queryKey: ["reviewers", doc?.departmentId],
    queryFn: async () => {
      const res = await api.get(`/users/reviewers?departmentId=${doc?.departmentId}`);
      return res.data;
    },
    enabled: !!doc?.departmentId && action === "assign_reviewer",
  });
  const reviewers = reviewersRes || [];
  
  const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "true");
  const [editBody, setEditBody] = useState<any>("");
  const [editTitle, setEditTitle] = useState("");
  const [isEditorReady, setIsEditorReady] = useState(false);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const isFirstRender = useRef(true);
  const debouncedEditBody = useDebounce(editBody, 1500);

  // Auto-save logic for Author editing drafts
  const updateMutation = useMutation({
    mutationFn: async (data: any) => await api.put(`/papers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper", id] });
      setSaveStatus("saved");
    },
    onError: () => {
      setSaveStatus("idle");
      toast.error("Failed to auto-save draft");
    }
  });

  const workflowMutation = useMutation({
    mutationFn: async ({ endpoint, data }: { endpoint: string; data?: any }) => {
      return await api.post(`/papers/${id}/${endpoint}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper", id] });
      setAction(null);
      setComment("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process workflow action");
    }
  });

  useEffect(() => {
    if (doc && !isEditorReady) {
      setEditBody(doc.currentVersion?.body || "");
      setEditTitle(doc.currentVersion?.title || doc.title);
      setIsEditorReady(true);
    }
  }, [doc, isEditorReady]);

  useEffect(() => {
    if (isEditing && doc) {
      setEditBody(doc.currentVersion?.body || "");
      setEditTitle(doc.currentVersion?.title || doc.title);
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing || !doc) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (JSON.stringify(debouncedEditBody) === JSON.stringify(doc.currentVersion?.body)) return;

    setSaveStatus("saving");
    updateMutation.mutate({
      title: editTitle,
      body: debouncedEditBody,
      optimisticVersion: doc.optimisticVersion
    });
  }, [debouncedEditBody]);

  useEffect(() => {
    if (saveStatus === "saved") {
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }, [saveStatus]);

  useEffect(() => {
    const canEdit = user?.id === doc?.authorId && (doc?.status === "Draft" || doc?.status === "Revision Required");
    if (canEdit && !isEditing && searchParams.get("edit") === "true") {
      setIsEditing(true);
    }
  }, [doc, user, isEditing, searchParams]);

  if (isLoading) return <div className="py-24 text-center text-muted-foreground">Loading paper...</div>;
  
  if (!doc) {
    return (
      <div className="py-24 text-center">
        <div className="text-2xl font-semibold text-heading">Paper not found</div>
        <p className="mt-2 text-sm text-body">This paper may have been deleted or you don't have access.</p>
        <Button asChild className="mt-6"><Link href="/papers">Back to library</Link></Button>
      </div>
    );
  }

  if (!user) return null;

  const isAuthor = user.id === doc.authorId;
  const isReviewerAssigned = doc.assignedReviewerId === user.id;
  const isAdmin = user.role === "Administrator";

  const canEdit = isAuthor && (doc.status === "Draft" || doc.status === "Revision Required");
  const canSubmit = isAuthor && (doc.status === "Draft" || doc.status === "Revision Required");
  
  const canStartReview = isReviewerAssigned && doc.status === "Reviewer Assigned";
  const canCompleteReview = isReviewerAssigned && doc.status === "Under Review";
  
  const canMakeAdminDecision = isAdmin && doc.status === "Review Completed";
  
  const handleAction = () => {
    if (!action) return;

    switch (action) {
      case "submit":
        workflowMutation.mutate({ endpoint: "submit", data: { optimisticVersion: doc.optimisticVersion } });
        break;
      case "assign_reviewer":
        if (!selectedReviewerId) {
          toast.error("Please select a reviewer");
          return;
        }
        workflowMutation.mutate({
          endpoint: "assign",
          data: { reviewerId: selectedReviewerId, optimisticVersion: doc.optimisticVersion, title: doc.currentVersion?.title || doc.title }
        });
        break;
      case "start_review":
        workflowMutation.mutate({ endpoint: "review/start", data: { optimisticVersion: doc.optimisticVersion } });
        break;
      case "complete_review":
        workflowMutation.mutate({ 
          endpoint: "review/complete", 
          data: { optimisticVersion: doc.optimisticVersion, reviewFeedback: comment }
        });
        break;
      case "admin_decision":
        workflowMutation.mutate({
          endpoint: "decision",
          data: { optimisticVersion: doc.optimisticVersion, decision, adminRemarks: comment }
        });
        break;
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-heading">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <StatusBadge status={doc.status as any} />
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-heading">
                {isEditing ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-transparent outline-none focus:ring-0 focus:border-b border-primary/50"
                    placeholder="Paper Title"
                  />
                ) : (
                  doc.currentVersion?.title || doc.title
                )}
              </h1>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" /> Author: {doc.author?.name}</span>
                <span className="flex items-center gap-1.5"><Fingerprint className="h-3.5 w-3.5" /> v{doc.currentVersion?.versionNumber}</span>
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {canEdit && !isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Content
                </Button>
              )}
              {canEdit && isEditing && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground mr-2">
                    {saveStatus === "saving" && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving...</span>}
                    {saveStatus === "saved" && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Saved</span>}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Done Editing</Button>
                </div>
              )}
              {canSubmit && (
                <Button size="sm" className="bg-primary hover:bg-primary-hover shadow-sm" onClick={() => setAction("submit")}>
                  <Send className="mr-2 h-4 w-4" /> Submit for Review
                </Button>
              )}
              {canStartReview && (
                <Button size="sm" onClick={() => setAction("start_review")}>
                  <Play className="mr-2 h-4 w-4" /> Start Review
                </Button>
              )}
              {canCompleteReview && (
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setAction("complete_review")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Complete Review
                </Button>
              )}
              {isAdmin && doc.status === "Pending Review" && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-sm" onClick={() => setAction("assign_reviewer")}>
                  <UserIcon className="mr-2 h-4 w-4" /> Assign Reviewer
                </Button>
              )}
              {canMakeAdminDecision && (
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => setAction("admin_decision")}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Admin Decision
                </Button>
              )}
            </div>
          </div>

          <Card className="min-h-[500px] overflow-hidden border-border bg-card shadow-sm">
            {isEditing ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Draft Mode Active</span>
                </div>
                <div className="flex-1 p-0">
                  <RichTextEditor content={editBody} onChange={setEditBody} />
                </div>
              </div>
            ) : isAdmin && doc.status === "Pending Review" ? (
              <div className="flex h-full min-h-[500px] flex-col items-center justify-center p-12 text-center">
                <Lock className="h-12 w-12 mb-4 opacity-20 text-muted-foreground" />
                <h3 className="text-lg font-medium text-heading mb-1">Content Hidden</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  The document body is restricted during the assignment phase. Please assign a reviewer based on the document title and author.
                </p>
              </div>
            ) : (
              <div className="p-0">
                <RichTextEditor content={doc.currentVersion?.body || ""} editable={false} />
              </div>
            )}
          </Card>
        </div>

        <div className="w-full shrink-0 space-y-6 md:w-80">
          <WorkflowTimeline paperId={id} />
        </div>
      </div>

      {/* Workflow Action Modals */}
      <Dialog open={!!action} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "submit" && "Submit for Review"}
              {action === "assign_reviewer" && "Assign Reviewer"}
              {action === "start_review" && "Start Review"}
              {action === "complete_review" && "Complete Review"}
              {action === "admin_decision" && "Final Admin Decision"}
            </DialogTitle>
            <DialogDescription>
              {action === "submit" && "Are you sure you want to submit this paper? It will be locked for editing."}
              {action === "assign_reviewer" && "Choose a reviewer to assign to this paper."}
              {action === "start_review" && "Start tracking your time for this review."}
              {action === "complete_review" && "Provide your review feedback. This will be sent to the Admin for final decision."}
              {action === "admin_decision" && "Make the final decision on this paper based on the reviewer's feedback."}
            </DialogDescription>
          </DialogHeader>

          {action === "complete_review" && (
            <div className="py-4">
              <label className="mb-2 block text-sm font-medium">Review Feedback</label>
              <Textarea 
                placeholder="Provide detailed feedback for the author and admin..."
                className="min-h-[120px]"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          )}

          {action === "assign_reviewer" && (
            <div className="py-4">
              <label className="mb-2 block text-sm font-medium">Select Reviewer</label>
              <select
                className="w-full rounded-md border border-border bg-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15 text-heading"
                value={selectedReviewerId}
                onChange={(e) => setSelectedReviewerId(e.target.value)}
              >
                <option value="">-- Choose a Reviewer --</option>
                {reviewers.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {action === "admin_decision" && (
            <div className="py-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Decision</label>
                <div className="flex gap-2">
                  <Button variant={decision === "PUBLISH" ? "default" : "outline"} onClick={() => setDecision("PUBLISH")} className="flex-1">Publish</Button>
                  <Button variant={decision === "REVISE" ? "default" : "outline"} onClick={() => setDecision("REVISE")} className="flex-1">Revise</Button>
                  <Button variant={decision === "REJECT" ? "destructive" : "outline"} onClick={() => setDecision("REJECT")} className="flex-1">Reject</Button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Remarks (Optional)</label>
                <Textarea 
                  placeholder="Additional comments..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)} disabled={workflowMutation.isPending}>Cancel</Button>
            <Button onClick={handleAction} disabled={workflowMutation.isPending}>
              {workflowMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
