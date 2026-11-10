import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../lib/axios";
import { connectNotificationStream } from "../../services/notification-sse/connectNotificationStream";
import type { AppNotification, NotificationsResponse } from "../../interface/Notification";

const TOAST_MS = 6000;

// Loads the person's notifications from REST and reloads them every time the
// notification stream signals a change (same pattern as the queue pages).
// A notification that wasn't there on the previous load is shown as a toast.
// basePath: "/api/notifications" (staff) or "/api/patient/notifications".
export function useNotifications(basePath: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  // Highest id already shown; null until the first load (no toast for old ones).
  const newestSeenId = useRef<number | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await api.get<NotificationsResponse>(basePath);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);

      const newest = data.notifications[0];
      if (newestSeenId.current !== null && newest && newest.id > newestSeenId.current && !newest.is_read) {
        setToast(newest);
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
      }
      newestSeenId.current = Math.max(newestSeenId.current ?? 0, newest?.id ?? 0);
    } catch {
      // Keep the last good list; the next signal or reconnect loads again.
    }
  }, [basePath]);

  useEffect(() => {
    const closeNotificationStream = connectNotificationStream({
      basePath,
      onNotificationsChanged: loadNotifications,
    });

    return () => {
      closeNotificationStream();
      window.clearTimeout(toastTimer.current);
    };
  }, [basePath, loadNotifications]);

  const markRead = useCallback(async (id: number) => {
    const target = notifications.find((item) => item.id === id);
    if (!target || target.is_read) return;

    setNotifications((previous) =>
      previous.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await api.patch(`${basePath}/${id}/read`);
    } catch {
      void loadNotifications();
    }
  }, [basePath, notifications, loadNotifications]);

  const markAllRead = useCallback(async () => {
    setNotifications((previous) => previous.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);

    try {
      await api.patch(`${basePath}/read-all`);
    } catch {
      void loadNotifications();
    }
  }, [basePath, loadNotifications]);

  const dismissToast = useCallback(() => {
    window.clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  return { notifications, unreadCount, toast, markRead, markAllRead, dismissToast };
}
