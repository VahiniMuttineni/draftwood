"use client";

import Link from "next/link";
import { usePapers } from "@/lib/hooks";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Lock, Search, ArrowUpRight } from "lucide-react";

export default function Published() {
  const { data: docsRes, isLoading } = usePapers({ status: "Published" });
  const docs = docsRes?.data || [];
  
  return (
    <div>
      <div className="mb-8">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Library</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-heading">Published documents</h1>
        <p className="mt-2 max-w-2xl text-sm text-body">
          Read-only, immutable content that has completed the full approval lifecycle. Any change requires reopening under administrator authority.
        </p>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-blue-700"><Lock className="h-4 w-4" /></div>
          <div>
            <div className="text-sm font-medium text-blue-900">Content is locked</div>
            <div className="text-xs text-blue-800/80">Published documents cannot be edited. Editing requires a formal reopen with administrator authority.</div>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search library…" className="h-9 w-64 rounded-md border border-border bg-card pl-8 pr-3 text-sm" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full py-16 text-center text-sm text-muted-foreground">Loading documents...</div>
        )}
        {!isLoading && docs.map((d) => (
          <Link key={d.id} href={`/papers/${d.id}`} className="group rounded-xl border border-border bg-card p-6 shadow-panel transition-all hover:-translate-y-0.5 hover:shadow-elevated">
            <div className="flex items-center justify-between">
              <StatusBadge status={d.status} />
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h3 className="mt-4 line-clamp-2 text-base font-semibold leading-snug text-heading">{d.title}</h3>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
              <span className="font-mono">v{d.currentVersion?.versionNumber || d.optimisticVersion || 1}</span>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
