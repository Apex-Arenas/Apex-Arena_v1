import { useAuth } from "../lib/auth-context";
import { Link, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Bell, Menu } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { notificationService } from "../services/notification.service";

const DashboardLayout = () => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    let cancelled = false;
    notificationService.getUnreadCount()
      .then((n) => { if (!cancelled) setUnreadCount(n); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const initials = user
    ? `${(user.firstName?.[0] ?? "").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}`
    : "?";

  return (
    <div className="flex min-h-dvh bg-slate-950 text-slate-100">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={handleMobileClose} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm px-4 sm:px-6 py-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Right side: bell + user */}
          <div className="flex items-center gap-3 ml-auto">
            <Link
              to="/auth/notifications"
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-2">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
                  {initials}
                </div>
              )}
              <span className="text-sm font-medium text-slate-200 hidden sm:block">
                {user?.username ?? "User"}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
