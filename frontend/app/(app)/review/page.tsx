"use client";

import Link from "next/link";
import { usePapers } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Inbox, ArrowUpRight, Clock, ShieldCheck, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ReviewQueue() {
  const { user } = useSession();
  const router = useRouter();

  const { data: docsRes, isLoading } = usePapers({ status: "Reviewer Assigned" });
  
  if (!user || user.role !== "Reviewer") {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
        <h2 className="text-xl font-semibold text-heading">Access Denied</h2>
        <p className="mt-2 text-sm text-body">Only reviewers can access the review queue.</p>
        <Button asChild className="mt-6"><Link href="/">Return home</Link></Button>
      </div>
    );
  }

  const allSubmitted = docsRes?.data || [];
  
  // Assigned to the current reviewer
  const assignedToMe = allSubmitted.filter(d => d.reviewerId === user.id);
  
  // Unassigned docs in the reviewer's department
  const unassigned = allSubmitted.filter(d => !d.reviewerId && d.departmentId === user.departmentId);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-heading">My Review Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage and approve documents pending review for your department.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Kpi label="Assigned to Me" value={String(assignedToMe.length)} tone={assignedToMe.length > 0 ? "warn" : "ok"} />
        <Kpi label="Unassigned in Dept" value={String(unassigned.length)} tone="ok" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Assigned to Me */}
        <Card className="flex flex-col border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-heading">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Assigned to Me
              <span className="ml-auto inline-flex items-center justify-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {assignedToMe.length}
              </span>
            </h2>
          </div>
          <div className="flex-1 p-0">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
            ) : assignedToMe.length > 0 ? (
              <ul className="divide-y divide-border">
                {assignedToMe.map(doc => (
                  <li key={doc.id} className="group hover:bg-muted/20 transition-colors">
                    <Link href={`/papers/${doc.id}`} className="flex items-start justify-between p-6">
                      <div>
                        <h3 className="font-medium text-heading group-hover:text-primary transition-colors">{doc.title}</h3>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {doc.owner?.name}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(doc.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShieldCheck className="h-8 w-8 text-muted-foreground opacity-20 mb-3" />
                <p className="text-sm text-muted-foreground">No documents currently assigned to you.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Unassigned in my Department */}
        <Card className="flex flex-col border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-heading">
              <Inbox className="h-4 w-4 text-primary" />
              Unassigned in My Department
              <span className="ml-auto inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {unassigned.length}
              </span>
            </h2>
          </div>
          <div className="flex-1 p-0">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
            ) : unassigned.length > 0 ? (
              <ul className="divide-y divide-border">
                {unassigned.map(doc => (
                  <li key={doc.id} className="group hover:bg-muted/20 transition-colors">
                    <Link href={`/papers/${doc.id}`} className="flex items-start justify-between p-6">
                      <div>
                        <h3 className="font-medium text-heading group-hover:text-primary transition-colors">{doc.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {doc.owner?.name}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(doc.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0 h-8 text-xs pointer-events-none">Review</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground opacity-20 mb-3" />
                <p className="text-sm text-muted-foreground">No unassigned documents in your department.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" }) {
  return (
    <Card className="border-border bg-card p-5 shadow-panel">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tracking-tight ${tone === "warn" ? "text-amber-600" : "text-heading"}`}>{value}</div>
    </Card>
  );
}
