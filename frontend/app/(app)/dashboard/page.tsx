"use client";

import Link from "next/link";
import { useSession } from "@/lib/session";
import { useQuery } from "@tanstack/react-query";
import { api, fetchPapers } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import {
  FileText, Clock, CheckCircle2, XCircle, Users,
  AlertTriangle, Archive, Timer, ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/StatusBadge";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as any, stiffness: 300, damping: 24 },
  },
};

export default function Dashboard() {
  const { user } = useSession();
  
  const { data: statsRes } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => await api.get("/analytics"),
  });

  const { data: recentPapersRes, isLoading: recentLoading } = useQuery({
    queryKey: ["recent_papers", user?.role],
    queryFn: async () => await fetchPapers({ limit: 5 }),
    enabled: !!user,
  });

  if (!user) return null;

  const stats = statsRes?.data || {};
  const recentPapers = recentPapersRes?.data || [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{user.role} workspace</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-heading">
            Welcome back, {user.name.split(" ")[0]}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-body">
            {user.role === "Author"        && "Track drafts, monitor review status, and address feedback in one place."}
            {user.role === "Reviewer"      && "Approve or reject submissions from your review queue. Response time is tracked."}
            {user.role === "Administrator" && "Organization-wide workflow health, audit posture, and activity trends."}
            {user.role === "Viewer"        && "Browse published, read-only papers across your organization."}
          </p>
        </div>
        <div className="text-left md:text-right text-xs text-muted-foreground mt-2 md:mt-0">
          <div>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div className="mt-0.5 flex items-center justify-start md:justify-end gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </motion.div>

      {user.role === "Author" && (
        <div className="grid gap-4 md:grid-cols-4 mb-10">
          <KpiCard href="/papers" icon={FileText} label="Total Papers" value={String(stats.total || 0)} />
          <KpiCard href="/drafts" icon={Archive} label="Drafts" value={String(stats.drafts || 0)} />
          <KpiCard href="/papers" icon={Timer} label="Under Review" value={String(stats.underReview || 0)} />
          <KpiCard href="/published" icon={CheckCircle2} label="Published" value={String(stats.published || 0)} tone="up" />
        </div>
      )}

      {user.role === "Reviewer" && (
        <div className="grid gap-4 md:grid-cols-3 mb-10">
          <KpiCard href="/review" icon={FileText} label="Assigned" value={String(stats.assigned || 0)} />
          <KpiCard href="/review" icon={Timer} label="Pending Review" value={String(stats.pending || 0)} tone={stats.pending > 0 ? "down" : "neutral"} delta={stats.pending > 0 ? "Action Required" : undefined} />
          <KpiCard href="/review" icon={CheckCircle2} label="Completed" value={String(stats.completed || 0)} tone="up" />
        </div>
      )}

      {user.role === "Administrator" && (
        <div className="grid gap-4 md:grid-cols-3 mb-10">
          <KpiCard href="/requests" icon={FileText} label="Total Papers" value={String(stats.totalPapers || 0)} />
          <KpiCard href="/requests" icon={AlertTriangle} label="Pending Assignment" value={String(stats.pendingAssignment || 0)} tone={stats.pendingAssignment > 0 ? "down" : "neutral"} delta={stats.pendingAssignment > 0 ? "Requires Action" : undefined} />
          <KpiCard href="/published" icon={ShieldCheck} label="Ready to Publish" value={String(stats.readyToPublish || 0)} tone="up" delta={stats.readyToPublish > 0 ? "Requires Action" : undefined} />
        </div>
      )}

      <motion.div variants={itemVariants}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-heading">Recent Papers</h2>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3">Document</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentLoading && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">Loading recent papers...</td>
                </tr>
              )}
              {!recentLoading && recentPapers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">No recent papers found.</td>
                </tr>
              )}
              {!recentLoading && recentPapers.map((d: any) => (
                <tr key={d.id} className="group hover:bg-muted/40 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/papers/${d.id}`} className="block">
                      <div className="font-medium text-heading group-hover:text-primary transition-colors">{d.title}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-semibold text-white" style={{ background: "oklch(0.72 0.14 258)" }}>
                        {d.owner?.name.split(" ").map((s: string) => s[0]).join("") || "?"}
                      </div>
                      <span className="text-xs text-body">{d.owner?.name || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">{new Date(d.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function KpiCard({ icon: Icon, label, value, delta, tone = "neutral", href }: { icon: any; label: string; value: string; delta?: string; tone?: "up" | "down" | "neutral"; href?: string }) {
  const content = (
    <Card className={`h-full border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md ${href ? "cursor-pointer" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        {delta && (
          <span className={`text-xs font-medium ${tone === "up" ? "text-emerald-600" : tone === "down" ? "text-red-600" : "text-muted-foreground"}`}>
            {delta}
          </span>
        )}
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-heading">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </Card>
  );

  return (
    <motion.div variants={itemVariants} whileHover={{ y: -4, scale: 1.01 }} transition={{ type: "spring" as any, stiffness: 400 }}>
      {href ? <Link href={href} className="block h-full">{content}</Link> : content}
    </motion.div>
  );
}
