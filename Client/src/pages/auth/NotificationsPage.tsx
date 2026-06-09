import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, BellOff, Check, CheckCheck, Trash2, Trophy, Swords,
  Wallet, ShieldAlert, UserCheck, Users, Star, Zap, Info,
  ChevronDown, RefreshCw, MessageSquare,
} from "lucide-react";
import { useNotifications } from "../../lib/notification-context";
import type { NotificationItem } from "../../services/notification.service";

function resolveNotifUrl(url: string): string {
  if (url.startsWith("/auth") || url.startsWith("http")) return url;
  return `/auth${url}`;
}

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

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bar: string; bg: string }> = {
  tournament_registration:  { icon: Trophy,      color: "text-cyan-400",   bar: "bg-cyan-500",   bg: "bg-cyan-500/25"   },
  tournament_cancelled:     { icon: Trophy,      color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25"    },
  tournament_started:       { icon: Trophy,      color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25"  },
  tournament_completed:     { icon: Trophy,      color: "text-amber-400",  bar: "bg-amber-500",  bg: "bg-amber-500/25"  },
  tournament_open:          { icon: Trophy,      color: "text-cyan-400",   bar: "bg-cyan-500",   bg: "bg-cyan-500/25"   },
  match_scheduled:          { icon: Swords,      color: "text-indigo-400", bar: "bg-indigo-500", bg: "bg-indigo-500/25" },
  match_starting:           { icon: Swords,      color: "text-orange-400", bar: "bg-orange-500", bg: "bg-orange-500/25" },
  match_result_submitted:   { icon: Swords,      color: "text-slate-400",  bar: "bg-slate-500",  bg: "bg-slate-700/50"  },
  match_disputed:           { icon: ShieldAlert, color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25"    },
  match_dispute_resolved:   { icon: ShieldAlert, color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25"  },
  match_result_confirmed:   { icon: Check,       color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25"  },
  match_forfeit:            { icon: Swords,      color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25"    },
  prize_won:                { icon: Star,        color: "text-amber-400",  bar: "bg-amber-500",  bg: "bg-amber-500/25"  },
  prize_credited:           { icon: Star,        color: "text-amber-400",  bar: "bg-amber-500",  bg: "bg-amber-500/25"  },
  payout_completed:         { icon: Wallet,      color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25"  },
  payout_failed:            { icon: Wallet,      color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25"    },
  payout_requested:         { icon: Wallet,      color: "text-cyan-400",   bar: "bg-cyan-500",   bg: "bg-cyan-500/25"   },
  deposit_confirmed:        { icon: Wallet,      color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25"  },
  refund_processed:         { icon: Wallet,      color: "text-blue-400",   bar: "bg-blue-500",   bg: "bg-blue-500/25"   },
  new_device_login:         { icon: ShieldAlert, color: "text-orange-400", bar: "bg-orange-500", bg: "bg-orange-500/25" },
  password_changed:         { icon: ShieldAlert, color: "text-orange-400", bar: "bg-orange-500", bg: "bg-orange-500/25" },
  two_fa_enabled:           { icon: ShieldAlert, color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25"  },
  two_fa_disabled:          { icon: ShieldAlert, color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25"    },
  account_unbanned:         { icon: UserCheck,   color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25"  },
  organizer_approved:       { icon: UserCheck,   color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25"  },
  organizer_rejected:       { icon: UserCheck,   color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25"    },
  team_invite:              { icon: Users,       color: "text-indigo-400", bar: "bg-indigo-500", bg: "bg-indigo-500/25" },
  new_follower:             { icon: Users,       color: "text-cyan-400",   bar: "bg-cyan-500",   bg: "bg-cyan-500/25"   },
  game_request_approved:    { icon: Zap,         color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25"  },
  game_request_rejected:    { icon: Zap,         color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25"    },
};

function inferBarFromType(type: string): { icon: React.ElementType; color: string; bar: string; bg: string } {
  const t = type.toLowerCase();
  if (t.includes("cancel") || t.includes("fail") || t.includes("reject") || t.includes("forfeit") || t.includes("disput") || t.includes("ban"))
    return { icon: ShieldAlert, color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25"    };
  if (t.includes("complet") || t.includes("confirm") || t.includes("approv") || t.includes("success") || t.includes("unlock") || t.includes("unbann"))
    return { icon: CheckCheck,  color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25"  };
  if (t.includes("prize") || t.includes("win") || t.includes("reward") || t.includes("earn"))
    return { icon: Star,        color: "text-amber-400",  bar: "bg-amber-500",  bg: "bg-amber-500/25"  };
  if (t.includes("payout") || t.includes("deposit") || t.includes("wallet") || t.includes("payment") || t.includes("refund") || t.includes("escrow"))
    return { icon: Wallet,      color: "text-cyan-400",   bar: "bg-cyan-500",   bg: "bg-cyan-500/25"   };
  if (t.includes("match") || t.includes("start") || t.includes("schedul"))
    return { icon: Swords,      color: "text-orange-400", bar: "bg-orange-500", bg: "bg-orange-500/25" };
  if (t.includes("login") || t.includes("password") || t.includes("2fa") || t.includes("device") || t.includes("security"))
    return { icon: ShieldAlert, color: "text-orange-400", bar: "bg-orange-500", bg: "bg-orange-500/25" };
  if (t.includes("team") || t.includes("follow") || t.includes("organizer") || t.includes("member"))
    return { icon: Users,       color: "text-indigo-400", bar: "bg-indigo-500", bg: "bg-indigo-500/25" };
  if (t.includes("tournament") || t.includes("register") || t.includes("publish") || t.includes("open"))
    return { icon: Trophy,      color: "text-cyan-400",   bar: "bg-cyan-500",   bg: "bg-cyan-500/25"   };
  return { icon: Info,          color: "text-slate-400",  bar: "bg-slate-500",  bg: "bg-slate-700/50"  };
}

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? inferBarFromType(type);
}

// ── Notification Row ──────────────────────────────────────────────────────────

function NotifRow({
  notif,
  onMarkRead,
  onDelete,
  onNavigate,
}: {
  notif: NotificationItem;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate?: () => void;
}) {
  const { icon: Icon, color, bar, bg } = getTypeMeta(notif.type);

  return (
    <div
      onClick={onNavigate}
      className={`relative flex items-start gap-4 px-6 py-4 border-b border-slate-800 transition-colors group
        ${notif.isRead ? "hover:bg-slate-800/20" : "bg-cyan-500/4 hover:bg-cyan-500/7"}
        ${onNavigate ? "cursor-pointer" : ""}`}
    >
      {/* Left accent bar — always shown, bright for unread, subtle for read */}
      <span className={`absolute left-0 inset-y-0 w-0.75 ${bar} rounded-r-full transition-opacity ${notif.isRead ? "opacity-20" : "opacity-100"}`} />

      {/* Icon */}
      <div className={`shrink-0 w-10 h-10 rounded-xl ${bg} flex items-center justify-center mt-0.5 ring-1 ring-inset ring-white/5`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm font-semibold leading-snug ${notif.isRead ? "text-slate-300" : "text-white"}`}>
            {notif.title}
            {!notif.isRead && (
              <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 align-middle -mt-0.5" />
            )}
          </p>
          <span className="shrink-0 text-[11px] text-slate-500 whitespace-nowrap mt-0.5">
            {relativeTime(notif.createdAt)}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{notif.message}</p>

        <div className="flex items-center gap-2 mt-3">
          {!notif.isRead && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-colors"
            >
              <Check className="w-3 h-3" />
              Mark read
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-transparent text-xs font-medium text-slate-600 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/8 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "all" | "unread";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    error,
    fetchMore,
    refresh,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotifications();

  const [tab, setTab] = useState<Tab>("all");
  const [statsOpen, setStatsOpen] = useState(false);

  const displayed = tab === "unread"
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const tournamentCount = notifications.filter((n) =>
    n.type.startsWith("tournament") || n.type.startsWith("match")
  ).length;
  const walletCount = notifications.filter((n) =>
    n.type.startsWith("prize") || n.type.startsWith("payout") ||
    n.type.startsWith("deposit") || n.type.startsWith("refund")
  ).length;

  const statItems = [
    { icon: Bell,          iconColor: "text-cyan-400",   bg: "from-cyan-500/25 to-indigo-500/20",  label: "Total",       value: isLoading ? "—" : String(notifications.length) },
    { icon: MessageSquare, iconColor: "text-amber-400",  bg: "from-amber-500/25 to-orange-500/20", label: "Unread",      value: isLoading ? "—" : String(unreadCount)           },
    { icon: Trophy,        iconColor: "text-violet-400", bg: "from-violet-500/25 to-indigo-500/20",label: "Tournaments", value: isLoading ? "—" : String(tournamentCount)        },
    { icon: Wallet,        iconColor: "text-green-400",  bg: "from-green-500/25 to-teal-500/20",   label: "Wallet",      value: isLoading ? "—" : String(walletCount)            },
  ];

  return (
    <div className="min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative bg-slate-900 border-b border-slate-800/60 overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute -top-40 right-0 w-175 h-100 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-125 h-50 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        {/* Fine grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-7">

          {/* Title + actions */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">
                Notifications
              </h1>
              <p className="text-base text-slate-400 mt-3">
                Stay up to date with your tournament activity.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1 shrink-0">
              <button
                onClick={refresh}
                disabled={isLoading}
                title="Refresh"
                className="p-2 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-300 text-sm font-medium hover:text-white hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Stats — mobile toggle */}
          <div className="sm:hidden mt-4">
            <button
              onClick={() => setStatsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs font-semibold text-slate-400 uppercase tracking-widest"
            >
              <span>Stats</span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${statsOpen ? "rotate-180" : ""}`} />
            </button>
            {statsOpen && (
              <div className="mt-1 grid grid-cols-2 gap-2">
                {statItems.map((s) => (
                  <div key={s.label} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3">
                    <div className={`w-9 h-9 rounded-lg bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-base font-bold tabular-nums text-white leading-none">{s.value}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats — desktop always visible */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-3 mt-6">
            {statItems.map((s) => (
              <div key={s.label} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3">
                <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold tabular-nums text-white leading-none">{s.value}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-6">
            {(["all", "unread"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all border shrink-0 ${
                  tab === t
                    ? "bg-cyan-500 text-slate-950 border-cyan-500"
                    : "bg-slate-900/60 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                }`}
              >
                {t === "all" ? "All" : "Unread"}
                {t === "unread" && unreadCount > 0 && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                    tab === "unread" ? "bg-slate-950/20 text-slate-950" : "bg-slate-700 text-slate-400"
                  }`}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Notification List ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">

          {error ? (
            <div className="py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-sm font-semibold text-red-400">Failed to load notifications</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">{error}</p>
              <button onClick={refresh} className="mt-4 text-xs text-cyan-400 hover:underline">
                Try again
              </button>
            </div>

          ) : displayed.length === 0 && !isLoading ? (
            <div className="py-24 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-5">
                {tab === "unread" ? (
                  <BellOff className="w-7 h-7 text-slate-600" />
                ) : (
                  <Bell className="w-7 h-7 text-slate-600" />
                )}
              </div>
              <p className="font-display text-lg font-semibold text-slate-300">
                {tab === "unread" ? "All caught up" : "No notifications yet"}
              </p>
              <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
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
                  onNavigate={n.actionUrl ? () => { markRead(n.id); navigate(resolveNotifUrl(n.actionUrl!)); } : undefined}
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
                <div className="px-4 py-4 text-center border-t border-slate-800">
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
