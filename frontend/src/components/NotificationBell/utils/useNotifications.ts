import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../lib/axios";
import { connectNotificationStream } from "../../../services/notification-sse/connectNotificationStream";
import type { AppNotification, NotificationsResponse } from "../../../interface/Notification";

const TOAST_MS = 6000;

// Loads the person's notifications from REST and reloads them every time the
// notification stream signals a change (same pattern as the queue pages).
// A notification that wasn't there on the previous load is shown as a toast,
// except "It's your turn", which opens a pop-up until it's closed.
// basePath: "/api/notifications" (staff) or "/api/patient/notifications".
export function useNotifications(basePath: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<AppNotification | null>(null);
  // "It's your turn" (type "called") is shown as a pop-up that stays until
  // the patient closes it, instead of a toast that disappears.
  const [turnAlert, setTurnAlert] = useState<AppNotification | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  // Highest id already shown; null until the first load (no pop-ups for old ones).
  const newestSeenId = useRef<number | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await api.get<NotificationsResponse>(basePath);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);

      const seen = newestSeenId.current;
      const fresh = seen === null ? [] : data.notifications.filter((item) => item.id > seen && !item.is_read);

      const called = fresh.find((item) => item.type === "called");
      if (called) setTurnAlert(called);

      const newest = fresh.find((item) => item.type !== "called");
      if (newest) {
        setToast(newest);
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
      }

      newestSeenId.current = Math.max(seen ?? 0, data.notifications[0]?.id ?? 0);
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

  // Closing the "It's your turn" pop-up also marks it as read.
  const dismissTurnAlert = useCallback(() => {
    if (turnAlert) void markRead(turnAlert.id);
    setTurnAlert(null);
  }, [turnAlert, markRead]);

  return {
    notifications,
    unreadCount,
    toast,
    turnAlert,
    markRead,
    markAllRead,
    dismissToast,
    dismissTurnAlert,
  };
}
