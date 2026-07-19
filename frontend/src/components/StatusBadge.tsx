"use client";

import { cn } from "@/lib/utils";
import type { Status } from "@/lib/types";
import { motion } from "framer-motion";

const styles: Record<Status | string, { dot: string; text: string; bg: string; ring: string }> = {
  "Draft":             { dot: "bg-slate-400",    text: "text-slate-600",   bg: "bg-slate-50",   ring: "ring-slate-200" },
  "Pending Review":    { dot: "bg-orange-400",   text: "text-orange-700",  bg: "bg-orange-50",  ring: "ring-orange-200" },
  "Reviewer Assigned": { dot: "bg-blue-400",     text: "text-blue-700",    bg: "bg-blue-50",    ring: "ring-blue-200" },
  "Under Review":      { dot: "bg-purple-400",   text: "text-purple-700",  bg: "bg-purple-50",  ring: "ring-purple-200" },
  "Review Completed":  { dot: "bg-cyan-400",     text: "text-cyan-700",    bg: "bg-cyan-50",    ring: "ring-cyan-200" },
  "Revision Required": { dot: "bg-yellow-400",   text: "text-yellow-700",  bg: "bg-yellow-50",  ring: "ring-yellow-200" },
  "Published":         { dot: "bg-emerald-400",  text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  "Rejected":          { dot: "bg-red-400",      text: "text-red-700",     bg: "bg-red-50",     ring: "ring-red-200" },
};

export function StatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const s = styles[status] ?? { dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-50", ring: "ring-slate-200" };
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset transition-colors duration-300",
        s.bg, s.text, s.ring,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
      )}
    >
      <motion.span layout className={cn("h-1.5 w-1.5 rounded-full transition-colors duration-300", s.dot)} />
      <motion.span layout>{status}</motion.span>
    </motion.span>
  );
}
