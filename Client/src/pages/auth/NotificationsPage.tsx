import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, BellOff, Check, CheckCheck, Trash2, Trophy, Swords,
  Wallet, ShieldAlert, UserCheck, Users, Star, Zap, Info,
  ChevronDown, RefreshCw,
} from "lucide-react";
import { useNotifications } from "../../lib/notification-context";
import type { NotificationItem } from "../../services/notification.service";

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  // Tournaments / Matches
  tournament_registration:     { icon: Trophy,     color: "text-cyan-400",   bg: "bg-cyan-500/10" },
  tournament_cancelled:        { icon: Trophy,     color: "text-red-400",    bg: "bg-red-500/10" },
  tournament_started:          { icon: Trophy,     color: "text-green-400",  bg: "bg-green-500/10" },
  tournament_completed:        { icon: Trophy,     color: "text-amber-400",  bg: "bg-amber-500/10" },
  tournament_open:             { icon: Trophy,     color: "text-cyan-400",   bg: "bg-cyan-500/10" },
  match_scheduled:             { icon: Swords,     color: "text-indigo-400", bg: "bg-indigo-500/10" },
  match_starting:              { icon: Swords,     color: "text-orange-400", bg: "bg-orange-500/10" },
  match_result_submitted:      { icon: Swords,     color: "text-slate-400",  bg: "bg-slate-500/10" },
  match_disputed:              { icon: ShieldAlert, color: "text-red-400",   bg: "bg-red-500/10" },
  match_dispute_resolved:      { icon: ShieldAlert, color: "text-green-400", bg: "bg-green-500/10" },
  match_result_confirmed:      { icon: Check,      color: "text-green-400",  bg: "bg-green-500/10" },
  match_forfeit:               { icon: Swords,     color: "text-red-400",    bg: "bg-red-500/10" },
  // Finance
  prize_won:                   { icon: Star,       color: "text-amber-400",  bg: "bg-amber-500/10" },
  payout_completed:            { icon: Wallet,     color: "text-green-400",  bg: "bg-green-500/10" },
  payout_failed:               { icon: Wallet,     color: "text-red-400",    bg: "bg-red-500/10" },
  payout_requested:            { icon: Wallet,     color: "text-cyan-400",   bg: "bg-cyan-500/10" },
  deposit_confirmed:           { icon: Wallet,     color: "text-green-400",  bg: "bg-green-500/10" },
  refund_processed:            { icon: Wallet,     color: "text-blue-400",   bg: "bg-blue-500/10" },
  prize_credited:              { icon: Star,       color: "text-amber-400",  bg: "bg-amber-500/10" },
  // Accounts / Auth
  new_device_login:            { icon: ShieldAlert, color: "text-orange-400", bg: "bg-orange-500/10" },
  password_changed:            { icon: ShieldAlert, color: "text-orange-400", bg: "bg-orange-500/10" },
  two_fa_enabled:              { icon: ShieldAlert, color: "text-green-400",  bg: "bg-green-500/10" },
  two_fa_disabled:             { icon: ShieldAlert, color: "text-red-400",    bg: "bg-red-500/10" },
  account_unbanned:            { icon: UserCheck,   color: "text-green-400",  bg: "bg-green-500/10" },
  // Organizer
  organizer_approved:          { icon: UserCheck,   color: "text-green-400",  bg: "bg-green-500/10" },
  organizer_rejected:          { icon: UserCheck,   color: "text-red-400",    bg: "bg-red-500/10" },
  // Team / Social
  team_invite:                 { icon: Users,       color: "text-indigo-400", bg: "bg-indigo-500/10" },
  new_follower:                { icon: Users,       color: "text-cyan-400",   bg: "bg-cyan-500/10" },
  // Game
  game_request_approved:       { icon: Zap,         color: "text-green-400",  bg: "bg-green-500/10" },
  game_request_rejected:       { icon: Zap,         color: "text-red-400",    bg: "bg-red-500/10" },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { icon: Info, color: "text-slate-400", bg: "bg-slate-500/10" };
}

function priorityDot(priority: string) {
  if (priority === "urgent") return "bg-red-500";
  if (priority === "high")   return "bg-orange-500";
  return null;
}

// ── Notification row ──────────────────────────────────────────────────────────

function NotifRow({
  notif,
  onMarkRead,
  onDelete,
}: {
  notif: NotificationItem;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { icon: Icon, color, bg } = getTypeMeta(notif.type);
  const dot = priorityDot(notif.priority);

  const handleClick = () => {
    if (!notif.isRead) onMarkRead(notif.id);
    if (notif.actionUrl) navigate(notif.actionUrl);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-start gap-3 px-4 py-4 border-b border-slate-800/50 transition-colors cursor-pointer
        ${notif.isRead ? "bg-transparent hover:bg-slate-900/40" : "bg-slate-900/60 hover:bg-slate-900/80"}`}
    >
      {/* Unread indicator */}
      {!notif.isRead && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
      )}

      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${bg} flex items-center justify-center mt-0.5`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug ${notif.isRead ? "text-slate-300" : "text-white"}`}>
            {notif.title}
            {dot && <span className={`inline-block ml-1.5 w-1.5 h-1.5 rounded-full ${dot} align-middle`} />}
          </p>
          <span className="flex-shrink-0 text-[11px] text-slate-500 mt-0.5">
            {relativeTime(notif.createdAt)}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
      </div>

      {/* Actions — show on hover */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notif.isRead && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "all" | "unread";

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetchMore,
    refresh,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotifications();

  const [tab, setTab] = useState<Tab>("all");

  const displayed = tab === "unread"
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative bg-slate-900 border-b border-slate-800/60 overflow-hidden">
        <div className="absolute -top-40 right-0 w-[700px] h-[400px] rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[200px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-8 pt-10 pb-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">
                Notifications
              </h1>
              <p className="text-base text-slate-400 mt-3">
                Stay up to date with your tournament activity.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={refresh}
                disabled={isLoading}
                className="p-2 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-colors text-sm font-medium"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-6">
            {(["all", "unread"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  tab === t
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t === "all" ? "All" : "Unread"}
                {t === "unread" && unreadCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-cyan-500 text-white text-[10px] font-bold leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-3xl mx-auto px-0 sm:px-4 py-4 sm:py-6">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
          {displayed.length === 0 && !isLoading ? (
            <div className="py-24 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-5">
                {tab === "unread" ? (
                  <BellOff className="w-8 h-8 text-slate-600" />
                ) : (
                  <Bell className="w-8 h-8 text-slate-600" />
                )}
              </div>
              <p className="font-display text-xl font-semibold text-slate-300">
                {tab === "unread" ? "All caught up" : "No notifications yet"}
              </p>
              <p className="text-sm text-slate-500 mt-2">
                {tab === "unread"
                  ? "You have no unread notifications."
                  : "Notifications will appear here when there's activity on your account."}
              </p>
            </div>
          ) : (
            <>
              {displayed.map((n) => (
                <NotifRow
                  key={n.id}
                  notif={n}
                  onMarkRead={markRead}
                  onDelete={deleteNotification}
                />
              ))}

              {isLoading && (
                <div className="py-6 text-center">
                  <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading…
                  </div>
                </div>
              )}

              {!isLoading && hasMore && tab === "all" && (
                <div className="px-4 py-4 text-center">
                  <button
                    onClick={fetchMore}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
