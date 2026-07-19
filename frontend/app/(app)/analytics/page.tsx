"use client";

import { Card } from "@/components/ui/card";
import { usePapers } from "@/lib/hooks";
import { TrendingUp, TrendingDown, Timer, CheckCircle2 } from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import type { Status } from "@/lib/types";

const monthly = [
  { m: "Feb", submitted: 42, approved: 34, rejected: 4 },
  { m: "Mar", submitted: 51, approved: 42, rejected: 6 },
  { m: "Apr", submitted: 58, approved: 49, rejected: 5 },
  { m: "May", submitted: 63, approved: 55, rejected: 4 },
  { m: "Jun", submitted: 71, approved: 61, rejected: 7 },
  { m: "Jul", submitted: 84, approved: 74, rejected: 6 },
];

const reviewTime = [
  { d: "Mon", h: 22 }, { d: "Tue", h: 18 }, { d: "Wed", h: 26 },
  { d: "Thu", h: 14 }, { d: "Fri", h: 20 }, { d: "Sat", h: 34 }, { d: "Sun", h: 40 },
];

const deptStats = [
  { name: "Legal & Compliance", n: 34 },
  { name: "Information Security", n: 42 },
  { name: "People Operations", n: 28 },
  { name: "Finance", n: 19 },
  { name: "Executive", n: 12 },
];

export default function Analytics() {
  const { data: docsRes } = usePapers();
  const docs = docsRes?.data || [];

  const byStatus: Record<string, number> = { 
    "Draft": 0, "Pending Review": 0, "Reviewer Assigned": 0, "Under Review": 0, 
    "Review Completed": 0, "Revision Required": 0, "Published": 0, "Rejected": 0 
  };
  docs.forEach((d) => { if (byStatus[d.status] !== undefined) byStatus[d.status]++; });
  const pieData = Object.entries(byStatus).filter(([_, val]) => val > 0).map(([name, value]) => ({ name, value }));
  const pieColors: Record<string, string> = {
    "Draft": "oklch(0.7 0.02 258)", "Pending Review": "oklch(0.75 0.15 70)",
    "Reviewer Assigned": "oklch(0.65 0.15 230)", "Under Review": "oklch(0.55 0.2 280)",
    "Review Completed": "oklch(0.7 0.15 200)", "Revision Required": "oklch(0.75 0.15 90)",
    "Published": "oklch(0.72 0.18 145)", "Rejected": "oklch(0.62 0.22 25)",
  };

  return (
    <div>
      <div className="mb-8">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Organization</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-heading">Analytics</h1>
        <p className="mt-2 max-w-2xl text-sm text-body">
          Workflow throughput, approval trends, review latency, and department-level activity across FY26.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi icon={CheckCircle2} label="Approval rate" value="87.2%" delta="+3.1 pts vs Q1" up />
        <Kpi icon={TrendingDown} label="Rejection rate" value="12.8%" delta="-2.1 pts" up />
        <Kpi icon={Timer} label="Avg review time" value="1.4 days" delta="-0.3 days" up />
        <Kpi icon={TrendingUp} label="Monthly velocity" value="84 docs" delta="+18% MoM" up />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="border-border bg-card p-6 shadow-panel">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-heading">Approval trends</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Monthly submissions vs approvals vs rejections.</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.19 258)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.62 0.19 258)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.18 145)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.72 0.18 145)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.92 0.008 258)" vertical={false} />
                <XAxis dataKey="m" stroke="oklch(0.6 0.02 258)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.6 0.02 258)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.92 0.008 258)", fontSize: 12 }} />
                <Area type="monotone" dataKey="submitted" stroke="oklch(0.62 0.19 258)" strokeWidth={2} fill="url(#g1)" />
                <Area type="monotone" dataKey="approved" stroke="oklch(0.72 0.18 145)" strokeWidth={2} fill="url(#g2)" />
                <Area type="monotone" dataKey="rejected" stroke="oklch(0.62 0.22 25)" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-border bg-card p-6 shadow-panel">
          <h2 className="text-base font-semibold text-heading">Workflow distribution</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Current lifecycle state.</p>
          <div className="h-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} innerRadius={50} outerRadius={78} paddingAngle={2} dataKey="value">
                  {pieData.map((e) => <Cell key={e.name} fill={pieColors[e.name]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.92 0.008 258)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {pieData.map((e) => (
              <div key={e.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: pieColors[e.name] }} />
                <span className="flex-1 text-body">{e.name}</span>
                <span className="font-medium text-heading">{e.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card p-6 shadow-panel">
          <h2 className="text-base font-semibold text-heading">Average review latency</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Hours to first reviewer action, past 7 days.</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <LineChart data={reviewTime}>
                <CartesianGrid stroke="oklch(0.92 0.008 258)" vertical={false} />
                <XAxis dataKey="d" stroke="oklch(0.6 0.02 258)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.6 0.02 258)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.92 0.008 258)", fontSize: 12 }} />
                <Line type="monotone" dataKey="h" stroke="oklch(0.62 0.19 258)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-border bg-card p-6 shadow-panel">
          <h2 className="text-base font-semibold text-heading">By department</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Active documents in flight.</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <BarChart data={deptStats} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="oklch(0.92 0.008 258)" horizontal={false} />
                <XAxis type="number" stroke="oklch(0.6 0.02 258)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={140} stroke="oklch(0.6 0.02 258)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.92 0.008 258)", fontSize: 12 }} />
                <Bar dataKey="n" fill="oklch(0.62 0.19 258)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, delta, up }: { icon: any; label: string; value: string; delta: string; up?: boolean }) {
  return (
    <Card className="border-border bg-card p-5 shadow-panel">
      <div className="flex items-center justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
        <span className={`text-xs font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>{delta}</span>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-heading">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
