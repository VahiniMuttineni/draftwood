"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, ExternalLink, CheckCircle2 } from "lucide-react";
import { useSession } from "@/lib/session";
import { useRequests, useApproveRejectRequest } from "@/lib/hooks";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function AdminFeedbackPage() {
  const { user } = useSession();
  
  const { data, isLoading } = useRequests();
  const requests = data?.data || [];

  const feedbackRequests = requests.filter((r: any) => r.type === "FEEDBACK");

  const decisionMutation = useApproveRejectRequest();

  const handleMarkReviewed = (id: string) => {
    decisionMutation.mutate({
      id: id,
      status: "APPROVED", // We use APPROVED as a proxy for "Reviewed"
    }, {
      onSuccess: () => {
        toast.success("Feedback marked as reviewed");
      },
      onError: (err: any) => {
        toast.error(err.message);
      }
    });
  };

  if (user?.role !== "Admin") {
    return <div className="py-24 text-center">Unauthorized. Only Administrators can view this page.</div>;
  }

  // Group by document
  const grouped = feedbackRequests.reduce((acc: any, curr: any) => {
    const docId = curr.documentId;
    if (!acc[docId]) {
      acc[docId] = {
        documentId: docId,
        documentTitle: curr.document?.title || "Unknown Document",
        items: []
      };
    }
    acc[docId].items.push(curr);
    return acc;
  }, {} as Record<string, { documentId: string, documentTitle: string, items: any[] }>);

  const groups = Object.values(grouped) as any[];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Governance</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-heading">Viewer Feedback</h1>
          <p className="mt-2 text-sm text-body">Review feedback submitted by viewers on published documents.</p>
        </div>
      </div>

      <Card className="border-border bg-card p-0 shadow-panel">
        {isLoading && <div className="p-16 text-center text-sm text-muted-foreground">Loading feedback...</div>}
        {!isLoading && groups.length === 0 && <div className="p-16 text-center text-sm text-muted-foreground">No feedback found.</div>}
        
        {!isLoading && groups.length > 0 && (
          <Accordion type="multiple" className="w-full">
            {groups.map((group) => (
              <AccordionItem key={group.documentId} value={group.documentId} className="border-border">
                <AccordionTrigger className="px-6 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-heading">{group.documentTitle}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{group.documentId.slice(0,8)}...</span>
                    <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                      {group.items.filter((i: any) => i.status === "PENDING").length} new
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="border-t border-border bg-muted/10 p-0">
                  <ul className="divide-y divide-border bg-card">
                    {group.items.map((item: any) => (
                      <li key={item.id} className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-heading">{item.requester?.name || "Unknown Viewer"}</span>
                                <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span>
                                {item.status === "APPROVED" && (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" /> Reviewed
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 text-sm text-body whitespace-pre-wrap rounded-md border-l-2 border-primary/30 bg-muted/30 p-4">
                                {item.reason}
                              </div>
                            </div>
                          </div>
                          {item.status === "PENDING" && (
                            <Button onClick={() => handleMarkReviewed(item.id)} variant="outline" size="sm" className="shrink-0 gap-1.5 h-8">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Reviewed
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-border bg-muted/40 p-4 text-right">
                    <Button asChild variant="outline" size="sm" className="gap-1.5">
                      <Link href={`/papers/${group.documentId}`}>
                        <ExternalLink className="h-3.5 w-3.5" /> View Document
                      </Link>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Card>
    </div>
  );
}
