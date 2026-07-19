import { useState, useEffect, useRef, useCallback } from "react";
import { api, getBaseUrl } from "@/lib/api-client";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityId: string | null;
  actionUrl: string | null;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevDataRef = useRef<string>("");
  const esRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayRef = useRef(2000); // Start with 2s, grows exponentially up to 30s

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      if (res.success) {
        const newDataString = JSON.stringify(res.data);
        if (newDataString !== prevDataRef.current) {
          setNotifications(res.data);
          prevDataRef.current = newDataString;
        }
        setUnreadCount(res.meta?.unreadCount || 0);
      }
    } catch(e) { 
      // Silently fail — user may not be logged in yet
    }
  }, []);

  const connectSSE = useCallback(() => {
    // Don't create duplicate connections
    if (esRef.current && esRef.current.readyState !== EventSource.CLOSED) {
      return;
    }

    const es = new EventSource(`${getBaseUrl()}/api/v1/notifications/stream`, {
      withCredentials: true,
    });
    esRef.current = es;

    es.addEventListener("connected", () => {
      // Connection established — reset retry delay
      retryDelayRef.current = 2000;
    });

    es.addEventListener("ping", () => {
      // Heartbeat received — connection is alive, nothing to do
    });

    es.addEventListener("new_notification", (event) => {
      try {
        const newNotif = JSON.parse(event.data);
        setNotifications((prev) => {
          // Prevent duplicates on reconnect
          if (prev.some(n => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
      } catch (err) {
        console.error("Failed to parse SSE notification:", err);
      }
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;

      // Exponential backoff: 2s → 4s → 8s → 16s → max 30s
      const delay = retryDelayRef.current;
      retryDelayRef.current = Math.min(delay * 2, 30000);

      retryTimeoutRef.current = setTimeout(() => {
        connectSSE();
      }, delay);
    };
  }, []);

  useEffect(() => {
    fetchNotifications();
    connectSSE();

    return () => {
      // Clean up on unmount
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [fetchNotifications, connectSSE]);

  return { notifications, unreadCount, fetchNotifications };
}
