import { useEffect, useRef, useState } from "react";
import {
  Ban,
  Bell,
  BellRing,
  CheckCheck,
  ListOrdered,
  RotateCcw,
  Star,
  X,
} from "lucide-react";
import type {
  AppNotification,
  NotificationType,
} from "../../interface/Notification";
import { useNotifications } from "./NotificationBell/utils/useNotifications";
import UniversalModal from "../UniversalModal";

const TYPE_STYLE: Record<
  NotificationType,
  { icon: typeof Bell; className: string }
> = {
  "priority-patient": { icon: Star, className: "bg-amber-50 text-amber-700" },
  cancellation: { icon: Ban, className: "bg-red-50 text-red-700" },
  queued: { icon: ListOrdered, className: "bg-sky-50 text-sky-700" },
  called: { icon: BellRing, className: "bg-green-50 text-green-700" },
  skipped: { icon: RotateCcw, className: "bg-violet-50 text-violet-700" },
};

function timeAgo(value: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

function TypeIcon({ type }: { type: NotificationType }) {
  const { icon: Icon, className } = TYPE_STYLE[type] ?? TYPE_STYLE.queued;
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${className}`}
    >
      <Icon size={16} strokeWidth={2} />
    </span>
  );
}

function NotificationRow({
  notification,
  onClick,
}: {
  notification: AppNotification;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
          notification.is_read ? "" : "bg-sky-50/50"
        }`}
      >
        <TypeIcon type={notification.type} />
        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm ${notification.is_read ? "text-gray-700" : "font-semibold text-gray-900"}`}
          >
            {notification.title}
          </span>
          {notification.message && (
            <span className="mt-0.5 block text-xs text-gray-500">
              {notification.message}
            </span>
          )}
          <span className="mt-1 block text-[11px] text-gray-400">
            {timeAgo(notification.created_at)}
          </span>
        </span>
        {!notification.is_read && (
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-600"
            aria-label="Unread"
          />
        )}
      </button>
    </li>
  );
}

type NotificationBellProps = {
  // "/api/notifications" (doctor, laboratory staff) or "/api/patient/notifications".
  basePath: string;
};

// Queue notifications: unread badge, dropdown list (up to 10), a toast for
// new ones, and a pop-up when it's the patient's turn. Used in the staff
// Header and the patient portal header (always on screen, so it works on
// every page).
function NotificationBell({ basePath }: NotificationBellProps) {
  const {
    notifications,
    unreadCount,
    toast,
    turnAlert,
    markRead,
    markAllRead,
    dismissToast,
    dismissTurnAlert,
  } = useNotifications(basePath);
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-label={
          unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        aria-expanded={open}
        title="Notifications"
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 hover:text-sky-600 active:bg-gray-100"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="flex cursor-pointer items-center gap-1 text-xs font-medium text-sky-700 hover:underline"
              >
                <CheckCheck size={14} />
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              You're all caught up.
            </p>
          ) : (
            <ul className="max-h-[26rem] divide-y divide-gray-100 overflow-y-auto">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onClick={() => void markRead(notification.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {toast && !open && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-[60] flex w-[min(22rem,calc(100vw-2.5rem))] gap-3 rounded-md border border-gray-200 bg-white p-4 shadow-lg"
        >
          <TypeIcon type={toast.type} />
          <button
            type="button"
            onClick={() => {
              dismissToast();
              setOpen(true);
            }}
            className="min-w-0 flex-1 cursor-pointer text-left"
          >
            <span className="block text-sm font-semibold text-gray-900">
              {toast.title}
            </span>
            {toast.message && (
              <span className="mt-0.5 block text-xs text-gray-500">
                {toast.message}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss notification"
            className="h-6 w-6 shrink-0 cursor-pointer text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* "It's your turn": stays on screen, whatever page they're on, until closed. */}
      <UniversalModal
        isOpen={turnAlert !== null}
        type="success"
        icon={<BellRing size={22} />}
        title={turnAlert?.title ?? ""}
        description={turnAlert?.message ?? undefined}
        onClose={dismissTurnAlert}
        closeOnOverlayClick={false}
        actions={[{ label: "OK, I'm on my way", onClick: dismissTurnAlert }]}
      />
    </div>
  );
}

export default NotificationBell;
