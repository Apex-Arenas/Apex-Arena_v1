import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  CalendarDays,
  UserCircle,
  Bell,
  Receipt,
  Crown,
  LogOut,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../lib/auth-context";

const navItems = [
  { to: "/auth", icon: Home, label: "Home", end: true },
  { to: "/auth/events", icon: CalendarDays, label: "Events" },
  { to: "/auth/player/profile", icon: UserCircle, label: "Profile" },
  { to: "/auth/notifications", icon: Bell, label: "Notifications" },
  { to: "/auth/transactions", icon: Receipt, label: "Transactions" },
  { to: "/auth/upgrade", icon: Crown, label: "Upgrade" },
] as const;

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className={`sticky top-0 h-dvh flex flex-col border-r border-slate-800 bg-slate-950/80 transition-all duration-200 ${
        collapsed ? "w-[68px]" : "w-56"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-slate-800">
        <div className="bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 w-9 h-9 rounded-lg flex items-center justify-center text-slate-950 shrink-0">
          <Trophy className="w-5 h-5" />
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-sm text-white whitespace-nowrap">
            APEX ARENAS
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-1 px-2 py-4 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={"end" in rest}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-cyan-500/15 text-cyan-300"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 pb-4 space-y-1 border-t border-slate-800 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors w-full"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
