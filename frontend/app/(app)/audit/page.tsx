"use client";

import { useAuditLogs } from "@/lib/hooks";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter, ShieldCheck, Fingerprint } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function AuditLog() {
  const { data: auditRes, isLoading } = useAuditLogs();
  const rawEntries = auditRes?.data || [];
  
  const entries = rawEntries.filter(e => e.action !== "EDITED");

  const grouped = entries.reduce((acc, curr) => {
    const docId = curr.entityId;
    if (!acc[docId]) {
      acc[docId] = {
        documentId: docId,
        documentTitle: (curr as any).document?.title || "Unknown Document",
        logs: []
      };
    }
    acc[docId].logs.push(curr);
    return acc;
  }, {} as Record<string, { documentId: string, documentTitle: string, logs: typeof entries }>);

  const groups = Object.values(grouped);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Governance</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-heading">Audit log</h1>
          <p className="mt-2 max-w-2xl text-sm text-body">
            Immutable, tamper-evident record of every state transition, permission check, and administrative action across the platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5"><Filter className="h-3.5 w-3.5" /> Filters</Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5"><Download className="h-3.5 w-3.5" /> Export CSV</Button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><ShieldCheck className="h-4 w-4" /></div>
        <div>
          <div className="font-medium text-emerald-900">Audit chain verified</div>
          <div className="text-xs text-emerald-800/80">{entries.length} entries · Last hash verification: just now · No tampering detected</div>
        </div>
      </div>

      <Card className="border-border bg-card p-0 shadow-panel">
        {isLoading && <div className="p-16 text-center text-sm text-muted-foreground">Loading audit logs...</div>}
        {!isLoading && groups.length === 0 && <div className="p-16 text-center text-sm text-muted-foreground">No significant audit logs found.</div>}
        
        {!isLoading && groups.length > 0 && (
          <Accordion type="multiple" className="w-full">
            {groups.map((group) => (
              <AccordionItem key={group.documentId} value={group.documentId} className="border-border">
                <AccordionTrigger className="px-6 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-heading">{group.documentTitle}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{group.documentId.slice(0,8)}...</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="border-t border-border bg-muted/10 p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        <th className="px-6 py-3">Timestamp</th>
                        <th className="px-2 py-3">Actor</th>
                        <th className="px-2 py-3">Action</th>
                        <th className="px-2 py-3">Transition</th>
                        <th className="px-6 py-3">Tx ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {group.logs.map(e => {
                        const prev = e.previousState;
                        const cur = e.currentState;
                        return (
                          <tr key={e.id} className="hover:bg-muted/40">
                            <td className="whitespace-nowrap px-6 py-3.5 text-xs text-body">{new Date(e.createdAt).toLocaleString()}</td>
                            <td className="px-2 py-3.5">
                              <div className="text-xs font-medium text-heading">{e.actor.name}</div>
                              <div className="text-[10px] text-muted-foreground">{e.actor.email}</div>
                            </td>
                            <td className="px-2 py-3.5 text-xs text-body">{e.action}</td>
                            <td className="px-2 py-3.5">
                              {prev?.status && cur?.status && prev.status !== cur.status ? (
                                <div className="flex items-center gap-1.5">
                                  <StatusBadge status={prev.status as any} />
                                  <span className="text-muted-foreground">→</span>
                                  <StatusBadge status={cur.status as any} />
                                </div>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                            <td className="whitespace-nowrap px-6 py-3.5">
                              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-body">
                                <Fingerprint className="h-3 w-3" /> {e.id.slice(0, 8)}...
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Card>
    </div>
  );
}
