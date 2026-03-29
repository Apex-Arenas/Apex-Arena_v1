import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../lib/auth-context";
import { Bell } from "lucide-react";

const DashboardLayout = () => {
  const { user } = useAuth();

  const initials = user
    ? `${(user.firstName?.[0] ?? "").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}`
    : "?";

  return (
    <div className="flex min-h-dvh bg-slate-950 text-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm px-6 py-3">
          <button className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <Bell className="w-5 h-5" />
          </button>

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
