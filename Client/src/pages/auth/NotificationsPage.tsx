import { useCallback, useEffect, useState } from "react";
import {
  Bell, BellOff, Check, CheckCheck, Clock, Loader2,
} from "lucide-react";
import { notificationService, type NotificationItem } from "../../services/notification.service";

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_ICON: Record<string, string> = {
  match_result: "⚔️",
  match_dispute: "🚩",
  match_start: "🎮",
  tournament_start: "🏆",
  tournament_registration: "📝",
  tournament_update: "📋",
  check_in: "✅",
  payment: "💰",
  payout: "💸",
  system_announcement: "📢",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  normal: "bg-cyan-500",
  low: "bg-slate-500",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const load = useCallback(
    async (pg: number, unread: boolean) => {
      setLoading(true);
      try {
        const res = await notificationService.getNotifications({
          page: pg,
          limit: 20,
          unreadOnly: unread,
        });
        setItems(res.notifications);
        setTotalPages(res.pagination.pages || 1);
        setPage(pg);
      } catch {
        // silent — show empty state
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(1, unreadOnly);
  }, [unreadOnly, load]);

  const markRead = async (id: string) => {
    setMarkingId(id);
    try {
      await notificationService.markRead(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {
      // silent
    } finally {
      setMarkingId(null);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // silent
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-cyan-400" />
            Notifications
            {unreadCount > 0 && (
              <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Stay up to date with your tournament activity.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => void markAllRead()}
            disabled={markingAll}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white disabled:opacity-50 transition-colors"
          >
            {markingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5" />
            )}
            Mark all read
          </button>
        )}
      </div>

      {/* Filter toggle */}
      <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setUnreadOnly(f === "unread")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
              (f === "unread") === unreadOnly
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-slate-800 bg-slate-900/40 text-center">
          <BellOff className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400">
            {unreadOnly ? "No unread notifications." : "No notifications yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/60">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3.5 px-4 py-4 transition-colors ${
                n.isRead ? "" : "bg-slate-800/25"
              }`}
            >
              {/* Icon */}
              <div className="relative shrink-0 mt-0.5">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-base leading-none select-none">
                  {TYPE_ICON[n.type] ?? "🔔"}
                </div>
                {!n.isRead && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                      PRIORITY_DOT[n.priority] ?? "bg-cyan-500"
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold leading-snug ${
                    n.isRead ? "text-slate-300" : "text-white"
                  }`}
                >
                  {n.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {n.message}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                  <Clock className="w-3 h-3" />
                  {timeAgo(n.createdAt)}
                </div>
              </div>

              {/* Mark read */}
              {!n.isRead && (
                <button
                  onClick={() => void markRead(n.id)}
                  disabled={markingId === n.id}
                  title="Mark as read"
                  className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-50 transition-colors"
                >
                  {markingId === n.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => void load(page - 1, unreadOnly)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-sm text-slate-400 border border-slate-700 hover:border-slate-500 disabled:opacity-30 transition-colors"
          >
            Prev
          </button>
          <span className="text-xs text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => void load(page + 1, unreadOnly)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg text-sm text-slate-400 border border-slate-700 hover:border-slate-500 disabled:opacity-30 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
