import { useAuth } from "../lib/auth-context";
import { Link, Outlet } from "react-router-dom";
import { FadeImage } from "./ui/FadeImage";
import Sidebar from "./Sidebar";
import { Bell, Menu, LayoutDashboard } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { notificationService } from "../services/notification.service";

const DashboardLayout = () => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    let cancelled = false;
    notificationService
      .getUnreadCount()
      .then((n) => {
        if (!cancelled) setUnreadCount(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
              <Link
                to="/auth/notifications"
                className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>

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
        <main className="flex-1 min-h-0 overflow-y-auto pt-3 pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
