import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, BellOff, CheckCheck, Check, AlertTriangle, AlertCircle,
  Info, Trophy, Wallet, ShieldAlert, UserCheck, Zap, RefreshCw, ChevronDown,
} from "lucide-react";
import { useAdminNotifications } from "../../lib/admin-notification-context";
import type { AdminNotificationItem, AdminNotifSeverity } from "../../services/admin-notification.service";

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
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

const SEVERITY_META: Record<AdminNotifSeverity, {
  icon: React.ElementType;
  label: string;
  badgeClass: string;
  rowClass: string;
  iconClass: string;
}> = {
  critical: {
    icon: AlertCircle,
    label: "Critical",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
    rowClass: "border-l-2 border-l-red-500",
    iconClass: "text-red-400 bg-red-500/10",
  },
  action_required: {
    icon: AlertTriangle,
    label: "Action Required",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    rowClass: "border-l-2 border-l-amber-500",
    iconClass: "text-amber-400 bg-amber-500/10",
  },
  info: {
    icon: Info,
    label: "Info",
    badgeClass: "bg-slate-700/60 text-slate-400 border-slate-600/40",
    rowClass: "",
    iconClass: "text-slate-400 bg-slate-700/40",
  },
};

const EVENT_ICON: Record<string, React.ElementType> = {
  organizer_request_submitted:  UserCheck,
  organizer_request_resubmitted: UserCheck,
  match_dispute_flagged:        ShieldAlert,
  payout_pending_review:        Wallet,
  payout_anomaly:               Wallet,
  game_request_submitted:       Zap,
  winner_verification_failed:   Trophy,
  tournament_completed:         Trophy,
  escrow_flagged:               AlertCircle,
};

function getEventIcon(eventType: string): React.ElementType {
  return EVENT_ICON[eventType] ?? Bell;
}

type Tab = "all" | "action_required" | "critical";

// ── Row ───────────────────────────────────────────────────────────────────────

function NotifRow({
  notif,
  onMarkRead,
}: {
  notif: AdminNotificationItem;
  onMarkRead: (id: string) => void;
}) {
  const navigate = useNavigate();
  const sev = SEVERITY_META[notif.severity];
  const EventIcon = getEventIcon(notif.eventType);

  const handleClick = () => {
    if (!notif.isRead) onMarkRead(notif.id);
    if (notif.actionUrl) navigate(notif.actionUrl);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-start gap-3 px-4 py-4 border-b border-slate-800/50 transition-colors cursor-pointer
        ${sev.rowClass}
        ${notif.isRead ? "bg-transparent hover:bg-slate-900/40" : "bg-slate-900/60 hover:bg-slate-900/80"}`}
    >
      {/* Unread dot */}
      {!notif.isRead && (
        <span className="absolute left-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
      )}

      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${sev.iconClass} flex items-center justify-center mt-0.5`}>
        <EventIcon className="w-4 h-4" />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-medium leading-snug ${notif.isRead ? "text-slate-300" : "text-white"}`}>
              {notif.title}
            </p>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${sev.badgeClass}`}>
              {sev.label}
            </span>
          </div>
          <span className="flex-shrink-0 text-[11px] text-slate-500 mt-0.5">
            {relativeTime(notif.createdAt)}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
      </div>

      {/* Mark read on hover */}
      {!notif.isRead && (
        <button
          onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
          title="Mark as read"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminNotifications() {
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetchMore,
    refresh,
    markRead,
    markAllRead,
  } = useAdminNotifications();

  const [tab, setTab] = useState<Tab>("all");

  const displayed = notifications.filter((n) => {
    if (tab === "all") return true;
    return n.severity === tab;
  });

  const criticalCount = notifications.filter((n) => !n.isRead && n.severity === "critical").length;
  const actionCount   = notifications.filter((n) => !n.isRead && n.severity === "action_required").length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-slate-400 mt-1">
            Platform alerts and items requiring your attention.
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors text-sm font-medium"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        {([
          { key: "all",             label: "All",             count: unreadCount },
          { key: "action_required", label: "Action Required", count: actionCount },
          { key: "critical",        label: "Critical",        count: criticalCount },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === key
                ? key === "critical"
                  ? "bg-red-500/15 text-red-400 border border-red-500/30"
                  : key === "action_required"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "bg-slate-700/60 text-white border border-slate-600/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none
                ${key === "critical" ? "bg-red-500 text-white" : key === "action_required" ? "bg-amber-500 text-white" : "bg-slate-600 text-slate-200"}`}>
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
        {displayed.length === 0 && !isLoading ? (
          <div className="py-20 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-4">
              <BellOff className="w-7 h-7 text-slate-600" />
            </div>
            <p className="font-display text-lg font-semibold text-slate-300">
              {tab === "all" ? "No notifications yet" : `No ${tab.replace("_", " ")} notifications`}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Alerts will appear here when platform events occur.
            </p>
          </div>
        ) : (
          <>
            {displayed.map((n) => (
              <NotifRow key={n.id} notif={n} onMarkRead={markRead} />
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
                  className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-400 transition-colors"
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
  );
}
