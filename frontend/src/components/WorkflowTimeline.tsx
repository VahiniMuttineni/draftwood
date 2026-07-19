import { cn } from "@/lib/utils";
import type { Status } from "@/lib/types";
import { Check, FileText, Send, ShieldCheck, Globe, Archive, XCircle, ArrowRight, User, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function WorkflowTimeline({ paperId }: { paperId: string }) {
  const { data: docRes } = useQuery({
    queryKey: ["paper", paperId],
    queryFn: async () => await api.get(`/papers/${paperId}`)
  });
  
  const doc = docRes?.data;
  
  if (!doc) return <div className="animate-pulse h-64 bg-muted/50 rounded-lg"></div>;

  const history = doc.workflowHistory || [];
  
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <ArrowRight className="h-4 w-4" /> Activity Timeline
      </h3>
      
      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
        
        {history.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">No activity recorded yet.</div>
        ) : (
          history.map((entry: any, i: number) => {
            const isLatest = i === 0;
            return (
              <motion.div 
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative flex items-start gap-4 group is-active"
              >
                {/* Icon */}
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 border-background shrink-0 shadow-sm relative z-10",
                  isLatest ? "bg-primary text-primary-foreground shadow-primary/30" : "bg-card text-muted-foreground"
                )}>
                  {getIconForAction(entry.action, entry.toStatus)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 p-4 rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm text-heading leading-tight break-words">{formatActionText(entry)}</span>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <User className="h-3.5 w-3.5" />
                    <span>{entry.performedByRel?.name || "System"}</span>
                  </div>
                  {entry.remarks && (
                    <div className="mt-3 text-xs bg-muted/50 p-2.5 rounded-md border border-border/50 flex gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-body italic break-words flex-1 min-w-0">{entry.remarks}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

function getIconForAction(action?: string, toStatus?: string) {
  if (action) {
    switch (action) {
      case "CREATED": return <FileText className="h-4 w-4" />;
      case "SUBMITTED": return <Send className="h-4 w-4" />;
      case "REVIEWER_ASSIGNED": return <User className="h-4 w-4" />;
      case "REVIEW_STARTED": return <Check className="h-4 w-4" />;
      case "REVIEW_COMPLETED": return <Check className="h-4 w-4" />;
      case "PUBLISHED": return <Globe className="h-4 w-4" />;
      case "REVISION_REQUESTED": return <XCircle className="h-4 w-4" />;
      case "REJECTED": return <XCircle className="h-4 w-4" />;
    }
  }
  switch (toStatus) {
    case "Draft": return <FileText className="h-4 w-4" />;
    case "In Review": return <User className="h-4 w-4" />;
    case "Published": return <Globe className="h-4 w-4" />;
    case "Rejected": return <XCircle className="h-4 w-4" />;
    case "Revision Required": return <XCircle className="h-4 w-4" />;
    default: return <Check className="h-4 w-4" />;
  }
}

function formatActionText(entry: any) {
  if (entry.action) {
    return entry.action.split('_').map((word: string) => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
  }
  if (entry.toStatus) {
    if (entry.fromStatus) {
       return `Status changed to ${entry.toStatus}`;
    }
    return `Set to ${entry.toStatus}`;
  }
  return "Status Updated";
}
