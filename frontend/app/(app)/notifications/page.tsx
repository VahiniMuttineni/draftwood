"use client";

import { Card } from "@/components/ui/card";
import { Bell, CheckCircle2, XCircle, Globe, AtSign, Archive, MessageSquare, AlertTriangle, Check, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";
import { api } from "@/lib/api-client";
import type { Notification } from "@/hooks/useNotifications";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as any, stiffness: 300, damping: 24 },
  },
};

function getIconForType(type: string) {
  switch (type) {
    case "PAPER_SUBMITTED": return { icon: FileText, tone: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" };
    case "REVIEW_ASSIGNED": return { icon: AtSign, tone: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" };
    case "PAPER_PUBLISHED": return { icon: Globe, tone: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" };
    case "REVIEW_COMPLETED": return { icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" };
    default: return { icon: Bell, tone: "bg-primary/10 text-primary" };
  }
}

export default function Notifications() {
  const { notifications, fetchNotifications, unreadCount } = useNotifications();

  const markAllRead = async () => {
    await api.post("/notifications/read-all");
    await fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (notif && !notif.isRead) {
      await api.post(`/notifications/${id}/read`);
      fetchNotifications();
    }
  };

  const today = notifications.filter(n => {
    const d = new Date(n.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const earlier = notifications.filter(n => !today.includes(n));

  const hasUnread = unreadCount > 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-8 flex items-end justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Inbox</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-heading">Notifications</h1>
          <p className="mt-2 text-sm text-body">Actionable events across your workflows.</p>
        </div>
        <AnimatePresence>
          {hasUnread && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
            >
              <Check className="h-3.5 w-3.5" /> Mark all as read
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {notifications.length === 0 ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-20 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-heading">No notifications yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">When you receive notifications, they will appear here.</p>
        </motion.div>
      ) : (
        <>
          {today.length > 0 && (
            <motion.div variants={itemVariants}>
              <Section title="Today" items={today} onMarkRead={markAsRead} />
            </motion.div>
          )}
          {earlier.length > 0 && (
            <motion.div variants={itemVariants} className="mt-8">
              <Section title="Earlier" items={earlier} onMarkRead={markAsRead} />
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

function Section({ title, items, onMarkRead }: { title: string; items: Notification[]; onMarkRead: (id: string) => void }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="h-px flex-1 bg-border" />
      </div>
      <Card className="border-border bg-card p-0 shadow-sm overflow-hidden">
        <ul className="divide-y divide-border">
          <AnimatePresence>
            {items.map((n) => {
              const { icon: Icon, tone } = getIconForType(n.type);
              const isUnread = !n.isRead;
              return (
                <motion.li
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative flex transition-colors duration-300 hover:bg-muted/50 ${isUnread ? "bg-primary/[0.03]" : ""}`}
                >
                  <Link 
                    href={n.actionUrl || "#"} 
                    onClick={() => onMarkRead(n.id)}
                    className="flex w-full items-start gap-4 px-5 py-4"
                  >
                    {isUnread && (
                      <motion.div
                        layoutId={`unread-indicator-${n.id}`}
                        className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone} transition-colors duration-300`}><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-heading transition-colors">{n.title}</div>
                        <AnimatePresence>
                          {isUnread && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              transition={{ type: "spring" as any, bounce: 0.5 }}
                              className="h-1.5 w-1.5 rounded-full bg-primary"
                            />
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="mt-0.5 text-xs text-body transition-colors">{n.message}</div>
                    </div>
                    <div className="whitespace-nowrap text-[11px] text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</div>
                  </Link>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </Card>
    </div>
  );
}
