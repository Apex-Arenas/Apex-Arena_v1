import { useAuth } from "../lib/auth-context";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { FadeImage } from "./ui/FadeImage";
import Sidebar from "./Sidebar";
import {
  Bell, Menu, LayoutDashboard, Home, Swords, Trophy, Wallet, UserCircle,
  CheckCheck, X, Trophy as TrophyIcon, ShieldAlert, Star, Zap, Users,
  Check, Info,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNotifications } from "../lib/notification-context";
import type { NotificationItem } from "../services/notification.service";

// ── Notification dropdown helpers ─────────────────────────────────────────────

function relTime(iso?: string) {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const NOTIF_TYPE_META: Record<string, { color: string; bar: string; bg: string; icon: React.ElementType }> = {
  tournament_registration:  { color: "text-cyan-400",   bar: "bg-cyan-500",   bg: "bg-cyan-500/25",   icon: TrophyIcon  },
  tournament_cancelled:     { color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25",    icon: TrophyIcon  },
  tournament_started:       { color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25",  icon: TrophyIcon  },
  tournament_completed:     { color: "text-amber-400",  bar: "bg-amber-500",  bg: "bg-amber-500/25",  icon: TrophyIcon  },
  tournament_open:          { color: "text-cyan-400",   bar: "bg-cyan-500",   bg: "bg-cyan-500/25",   icon: TrophyIcon  },
  match_scheduled:          { color: "text-indigo-400", bar: "bg-indigo-500", bg: "bg-indigo-500/25", icon: Swords      },
  match_starting:           { color: "text-orange-400", bar: "bg-orange-500", bg: "bg-orange-500/25", icon: Swords      },
  match_result_submitted:   { color: "text-slate-400",  bar: "bg-slate-500",  bg: "bg-slate-700/50",  icon: Swords      },
  match_disputed:           { color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25",    icon: ShieldAlert },
  match_dispute_resolved:   { color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25",  icon: ShieldAlert },
  match_result_confirmed:   { color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25",  icon: Check       },
  match_forfeit:            { color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25",    icon: Swords      },
  prize_won:                { color: "text-amber-400",  bar: "bg-amber-500",  bg: "bg-amber-500/25",  icon: Star        },
  prize_credited:           { color: "text-amber-400",  bar: "bg-amber-500",  bg: "bg-amber-500/25",  icon: Star        },
  payout_completed:         { color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25",  icon: Wallet      },
  payout_failed:            { color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25",    icon: Wallet      },
  payout_requested:         { color: "text-cyan-400",   bar: "bg-cyan-500",   bg: "bg-cyan-500/25",   icon: Wallet      },
  deposit_confirmed:        { color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25",  icon: Wallet      },
  refund_processed:         { color: "text-blue-400",   bar: "bg-blue-500",   bg: "bg-blue-500/25",   icon: Wallet      },
  new_device_login:         { color: "text-orange-400", bar: "bg-orange-500", bg: "bg-orange-500/25", icon: ShieldAlert },
  password_changed:         { color: "text-orange-400", bar: "bg-orange-500", bg: "bg-orange-500/25", icon: ShieldAlert },
  two_fa_enabled:           { color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25",  icon: ShieldAlert },
  two_fa_disabled:          { color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25",    icon: ShieldAlert },
  account_unbanned:         { color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25",  icon: Users       },
  organizer_approved:       { color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25",  icon: Users       },
  organizer_rejected:       { color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25",    icon: Users       },
  team_invite:              { color: "text-indigo-400", bar: "bg-indigo-500", bg: "bg-indigo-500/25", icon: Users       },
  new_follower:             { color: "text-cyan-400",   bar: "bg-cyan-500",   bg: "bg-cyan-500/25",   icon: Users       },
  game_request_approved:    { color: "text-green-400",  bar: "bg-green-500",  bg: "bg-green-500/25",  icon: Zap         },
  game_request_rejected:    { color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25",    icon: Zap         },
};

function inferNotifMeta(type: string): { color: string; bar: string; bg: string; icon: React.ElementType } {
  const t = type.toLowerCase();
  if (t.includes("cancel") || t.includes("fail") || t.includes("reject") || t.includes("forfeit") || t.includes("disput") || t.includes("ban"))
    return { icon: ShieldAlert, color: "text-red-400",    bar: "bg-red-500",    bg: "bg-red-500/25"    };
  if (t.includes("complet") || t.includes("confirm") || t.includes("approv") || t.includes("success") || t.includes("unbann"))
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
    return { icon: TrophyIcon,  color: "text-cyan-400",   bar: "bg-cyan-500",   bg: "bg-cyan-500/25"   };
  return { icon: Info,          color: "text-slate-400",  bar: "bg-slate-500",  bg: "bg-slate-700/50"  };
}

function getNotifMeta(type: string) {
  return NOTIF_TYPE_META[type] ?? inferNotifMeta(type);
}

function DropdownNotifRow({
  notif,
  onMarkRead,
  onClick,
}: {
  notif: NotificationItem;
  onMarkRead: (id: string) => void;
  onClick: () => void;
}) {
  const { icon: Icon, color, bar, bg } = getNotifMeta(notif.type);
  return (
    <div
      onClick={onClick}
      className={`relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group
        ${notif.isRead ? "hover:bg-slate-800/30" : "bg-cyan-500/4 hover:bg-cyan-500/8"}`}
    >
      {/* Left color bar */}
      <span className={`absolute left-0 inset-y-0 w-0.75 ${bar} rounded-r-full ${notif.isRead ? "opacity-20" : "opacity-100"}`} />

      {/* Icon */}
      <div className={`shrink-0 w-8 h-8 rounded-lg ${bg} flex items-center justify-center mt-0.5 ring-1 ring-inset ring-white/5`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-semibold leading-snug truncate ${notif.isRead ? "text-slate-300" : "text-white"}`}>
            {notif.title}
            {!notif.isRead && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 align-middle -mt-0.5" />}
          </p>
          <span className="shrink-0 text-[10px] text-slate-500">{relTime(notif.createdAt)}</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{notif.message}</p>
      </div>

      {/* Mark read button */}
      {!notif.isRead && (
        <button
          onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }}
          className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
          title="Mark as read"
        >
          <Check className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

const DashboardLayout = () => {
  const { user } = useAuth();
  const { unreadCount, notifications, markRead, markAllRead } = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!notifOpen) return;
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [notifOpen]);

  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  const initials = user
    ? `${(user.firstName?.[0] ?? "").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}`
    : "?";

  const profilePath =
    user?.role === "organizer"
      ? "/auth/organizer/profile"
      : "/auth/player/profile";

  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const profileName = fullName || user?.username || "User";

  return (
    <div className="relative flex h-dvh bg-slate-950 text-slate-100 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-0 w-lg h-128 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 w-120 h-120 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <Sidebar mobileOpen={mobileOpen} onMobileClose={handleMobileClose} />

      <div className="relative flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 px-4 sm:px-6 pt-3">
          <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-4 sm:px-5 py-3 shadow-[0_14px_40px_-24px_rgba(14,165,233,0.35)]">
            <div className="flex items-center gap-3">
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-semibold text-orange-400 tracking-wider uppercase">
                    Player Dashboard
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
                  Match Center
                </p>
              </div>
            </div>

            {/* Right side: bell + user */}
            <div className="flex items-center gap-2">
              {/* Bell dropdown */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-85 max-w-[calc(100vw-1rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-white">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="min-w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <button
                            onClick={() => void markAllRead()}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          >
                            <CheckCheck className="w-3 h-3" />
                            All read
                          </button>
                        )}
                        <button
                          onClick={() => setNotifOpen(false)}
                          className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Notification rows */}
                    <div className="max-h-90 overflow-y-auto divide-y divide-slate-800/60">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center">
                          <Bell className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.slice(0, 6).map((n) => (
                          <DropdownNotifRow
                            key={n.id}
                            notif={n}
                            onMarkRead={markRead}
                            onClick={() => {
                              setNotifOpen(false);
                              navigate(n.actionUrl ?? "/auth/notifications");
                            }}
                          />
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-800 px-4 py-2.5">
                      <Link
                        to="/auth/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors py-1"
                      >
                        View all notifications
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <Link
                to={profilePath}
                className="flex items-center gap-2 pl-3 py-1.5 pr-2 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900 transition-colors"
              >
                {user?.avatarUrl ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-slate-700 relative shrink-0">
                    <FadeImage
                      src={user.avatarUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-orange-500/20 to-cyan-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-semibold text-orange-300">
                    {initials}
                  </div>
                )}
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-200 leading-tight">
                    {profileName}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Secure session
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-y-auto pt-3 pb-20 md:pb-6">
          <Outlet />
        </main>

        {/* ── Mobile bottom nav ── md:hidden ─────────────────────── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80">
          <div className="flex items-center justify-around px-2 py-2">
            {[
              { icon: Home,        label: "Home",         to: "/auth",                          end: true  },
              { icon: Swords,      label: "Tournaments",  to: "/auth/player/join-tournament",   end: false },
              { icon: Trophy,      label: "Leaderboard",  to: "/auth/leaderboard",              end: false },
              { icon: Wallet,      label: "Wallet",       to: "/auth/wallet",                   end: false },
              { icon: UserCircle,  label: "Profile",      to: profilePath,                      end: false },
            ].map(({ icon: Icon, label, to, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                    isActive ? "text-orange-400" : "text-slate-500 hover:text-slate-300"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default DashboardLayout;
