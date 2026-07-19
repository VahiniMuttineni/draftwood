"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, FileText, Inbox, Globe, ScrollText, BarChart3,
  Bell, Settings, Shield, ChevronsLeft, ChevronsRight, Search, Plus,
  LogOut, ChevronDown, MessageSquare,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";

interface NavItem {
  to: string; label: string; icon: any; roles?: Role[];
}

const NAV: NavItem[] = [
  { to: "/dashboard",    label: "Dashboard",           icon: LayoutDashboard },
  { to: "/papers",    label: "My Papers",        icon: FileText,       roles: ["Author", "Administrator"] },
  { to: "/drafts",       label: "Drafts",              icon: FileText,       roles: ["Author", "Administrator"] },
  { to: "/requests",     label: "Admin Requests",      icon: Inbox,          roles: ["Administrator"] },
  { to: "/feedback",     label: "Viewer Feedback",     icon: MessageSquare,  roles: ["Administrator"] },
  { to: "/review",       label: "Review Queue",        icon: Inbox,          roles: ["Reviewer", "Administrator"] },
  { to: "/published",    label: "Published Documents", icon: Globe },
  { to: "/audit",        label: "Audit Logs",          icon: ScrollText,     roles: ["Administrator", "Reviewer"] },
  { to: "/analytics",    label: "Analytics",           icon: BarChart3,      roles: ["Administrator"] },
  { to: "/notifications",label: "Notifications",       icon: Bell },
  { to: "/settings",     label: "Settings",            icon: Settings },
];

function getAvatarColor(name: string) {
  const colors = [
    "linear-gradient(135deg, #FF6B6B 0%, #C92A2A 100%)",
    "linear-gradient(135deg, #4DABF7 0%, #1971C2 100%)",
    "linear-gradient(135deg, #69DB7C 0%, #2B8A3E 100%)",
    "linear-gradient(135deg, #FCC419 0%, #E67700 100%)",
    "linear-gradient(135deg, #9775FA 0%, #5F3DC4 100%)"
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname() || "";
  const [collapsed, setCollapsed] = useState(false);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const initials = user.name.split(" ").map(s => s[0]).join("").toUpperCase().slice(0, 2);
  const avatarColor = getAvatarColor(user.name);

  const handleLogout = async () => { 
    await logout(); 
    router.push("/"); 
  };

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Sidebar */}
      <motion.aside
        layout
        initial={false}
        animate={{ width: collapsed ? 68 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="sticky top-0 flex h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground overflow-hidden z-40"
      >
        <div className={cn("flex items-center gap-2 px-4 py-5", collapsed && "justify-center px-2")}>
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">EF</div>
          <AnimatePresence mode="popLayout">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col leading-tight whitespace-nowrap"
              >
                <span className="text-sm font-semibold tracking-tight">Draftwood</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-1 hidden sm:inline-block">Workflow Platform</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 pb-4">
          {NAV.filter((n) => !n.roles || n.roles.includes(user.role)).map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                href={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-white"
                    : "text-sidebar-muted hover:text-white",
                  collapsed && "justify-center px-0",
                )}
              >
                {active && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 rounded-md bg-sidebar-accent z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                {active && !collapsed && (
                  <motion.span 
                    layoutId="activeNavLine"
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary z-10" 
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                <AnimatePresence mode="popLayout">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, filter: "blur(4px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, filter: "blur(4px)" }}
                      className="relative z-10 truncate whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        <AnimatePresence mode="popLayout">
          {user.role === "Administrator" && !collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mx-3 mb-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 whitespace-nowrap"
            >
              <div className="flex items-center gap-2 text-xs font-medium">
                <Shield className="h-3.5 w-3.5 text-primary" /> Admin
              </div>
              <p className="mt-1 text-[11px] text-sidebar-muted whitespace-normal">Elevated privileges active. All actions logged.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "mx-3 mb-4 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-white transition-colors",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
        </button>
      </motion.aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 md:px-8 backdrop-blur-md"
        >
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search documents, people, or audit entries…"
              className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-16 text-sm transition-all placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 focus:shadow-sm"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
          </div>

          <div className="flex items-center gap-2">
            {(user.role === "Author" || user.role === "Administrator") && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild size="sm" className="h-9 gap-1.5 bg-primary hover:bg-primary-hover shadow-sm transition-shadow hover:shadow-md">
                  <Link href="/papers/new">
                    <Plus className="h-4 w-4" /> New document
                  </Link>
                </Button>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/notifications"
                className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-card hover:bg-muted transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white shadow-sm ring-2 ring-card animate-in zoom-in">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            </motion.div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: "var(--color-muted)" }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <div
                    className="grid h-7 w-7 place-items-center rounded-full text-white text-xs font-semibold"
                    style={{ background: avatarColor }}
                  >
                    {initials}
                  </div>
                  <div className="text-left leading-tight">
                    <div className="text-xs font-semibold text-heading">{user.name}</div>
                    <div className="text-[10px] text-muted-foreground">{user.role}</div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-xs font-medium">{user.name}</div>
                  <div className="text-[11px] font-normal text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings")}>Profile & Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/notifications")}>Notifications</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
