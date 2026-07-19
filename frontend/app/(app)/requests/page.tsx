"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { useSession } from "@/lib/session";
import { useRequests, useApproveRejectRequest } from "@/lib/hooks";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export default function AdminRequestsPage() {
  const { user } = useSession();
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [query, setQuery] = useState("");
  
  const { data, isLoading } = useRequests();
  const requests = data?.data || [];

  const filteredRequests = requests.filter((r: any) => {
    if (filter !== "ALL" && r.status !== filter) return false;
    if (query && !r.document?.title?.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const [decisionModal, setDecisionModal] = useState<{ id: string, type: "APPROVED" | "REJECTED" } | null>(null);
  const [comment, setComment] = useState("");
  
  const decisionMutation = useApproveRejectRequest();

  const handleDecision = () => {
    if (!decisionModal) return;
    decisionMutation.mutate({
      id: decisionModal.id,
      status: decisionModal.type,
      decisionComment: comment,
    }, {
      onSuccess: () => {
        toast.success(`Request ${decisionModal.type.toLowerCase()}`);
        setDecisionModal(null);
        setComment("");
      },
      onError: (err: any) => {
        toast.error(err.message);
      }
    });
  };

  if (user?.role !== "Admin") {
    return <div className="py-24 text-center">Unauthorized. Only Administrators can view this page.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-heading">Document Requests</h1>
          <p className="mt-2 text-sm text-body">Manage author requests to edit or delete published documents.</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-foreground text-background" : "text-body hover:bg-muted"
              }`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search document title..."
            className="h-9 w-64 rounded-md border border-border bg-card pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 shadow-sm"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Requester</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Loading requests...</td></tr>
            )}
            {!isLoading && filteredRequests.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No requests found.</td></tr>
            )}
            {!isLoading && filteredRequests.map((r: any) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-4">
                  <div className="font-medium text-heading flex items-center gap-1.5">
                    {r.document?.title || "Unknown Document"}
                    <Link href={`/papers/${r.documentId}`} target="_blank" className="text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString()}</div>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${r.type === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {r.type}
                  </span>
                </td>
                <td className="px-4 py-4 text-body">{r.requester?.name}</td>
                <td className="px-4 py-4 text-body max-w-xs truncate" title={r.reason}>{r.reason}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    {r.status === 'PENDING' && <><Clock className="w-4 h-4 text-amber-500" /> Pending</>}
                    {r.status === 'APPROVED' && <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Approved</>}
                    {r.status === 'REJECTED' && <><XCircle className="w-4 h-4 text-red-500" /> Rejected</>}
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  {r.status === 'PENDING' && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => setDecisionModal({ id: r.id, type: "APPROVED" })} className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">Approve</Button>
                      <Button size="sm" onClick={() => setDecisionModal({ id: r.id, type: "REJECTED" })} variant="outline" className="h-7 border-red-200 text-red-700 hover:bg-red-50 text-xs">Reject</Button>
                    </div>
                  )}
                  {r.status !== 'PENDING' && (
                    <span className="text-xs text-muted-foreground">Decided by {r.assignedApprover?.name || "System"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!decisionModal} onOpenChange={(o) => !o && setDecisionModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{decisionModal?.type === 'APPROVED' ? 'Approve Request' : 'Reject Request'}</DialogTitle>
            <DialogDescription>
              {decisionModal?.type === 'APPROVED' 
                ? 'Approving an Edit Request creates a new Draft. Approving a Delete Request archives the document.'
                : 'Please provide a reason for rejecting this request.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-body">
              {decisionModal?.type === 'REJECTED' ? "Reason (required)" : "Comment (optional)"}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionModal(null)}>Cancel</Button>
            <Button
              onClick={handleDecision}
              disabled={(decisionModal?.type === 'REJECTED' && !comment.trim()) || decisionMutation.isPending}
              className={decisionModal?.type === 'REJECTED' ? "bg-red-600 text-white hover:bg-red-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
