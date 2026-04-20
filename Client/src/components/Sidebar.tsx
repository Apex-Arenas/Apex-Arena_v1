import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  UserCircle,
  Bell,
  Receipt,
  LogOut,
  Trophy,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  ListTodo,
  Shield,
  Swords,
  X,
  Wallet,
  Users,
  Settings,
  BarChart2,
  DollarSign,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { notificationService } from "../services/notification.service";

const playerNavItems = [
  { to: "/auth", icon: Home, label: "Home", end: true },
  { to: "/auth/player/join-tournament", icon: Swords, label: "Tournaments" },
  { to: "/auth/leaderboard", icon: Trophy, label: "Leaderboard" },
  { to: "/auth/wallet", icon: Wallet, label: "Wallet" },
  { to: "/auth/friends", icon: Users, label: "Friends" },
  { to: "/auth/player/profile", icon: UserCircle, label: "Profile" },
  { to: "/auth/notifications", icon: Bell, label: "Notifications" },
  { to: "/auth/settings", icon: Settings, label: "Settings" },
] as const;

const organizerNavItems = [
  { to: "/auth", icon: Home, label: "Home", end: true },
  { to: "/auth/organizer/tournaments", icon: ListTodo, label: "My Tournaments" },
  { to: "/auth/organizer/create-tournament", icon: PlusCircle, label: "Create" },
  { to: "/auth/organizer/analytics", icon: BarChart2, label: "Analytics" },
  { to: "/auth/organizer/payouts", icon: DollarSign, label: "Payouts" },
  { to: "/auth/organizer/profile", icon: UserCircle, label: "Profile" },
  { to: "/auth/notifications", icon: Bell, label: "Notifications" },
  { to: "/auth/transactions", icon: Receipt, label: "Transactions" },
  { to: "/auth/settings", icon: Settings, label: "Settings" },
] as const;

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar = ({ mobileOpen, onMobileClose }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch unread count once on mount — no polling until the endpoint is stable
  useEffect(() => {
    let cancelled = false;
    notificationService.getUnreadCount()
      .then((n) => { if (!cancelled) setUnreadCount(n); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const isOrganizer = user?.role === "organizer";
  const navItems = isOrganizer ? organizerNavItems : playerNavItems;

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileClose();
  }, [location.pathname, onMobileClose]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const sidebarContent = (isMobile: boolean) => (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white p-0.5 shrink-0">
            <img src="/apex-logo.png" alt="Apex Arenas" className="w-full h-full object-contain" />
          </div>
          {(!collapsed || isMobile) && (
            <span className="font-display font-bold text-sm text-white whitespace-nowrap">
              APEX ARENAS
            </span>
          )}
        </div>
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
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
            <div className="relative shrink-0">
              <Icon className="w-5 h-5" />
              {to === "/auth/notifications" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            {(!collapsed || isMobile) && <span>{label}</span>}
          </NavLink>
        ))}

        {/* Become an Organizer — players only */}
        {!isOrganizer && (
          <NavLink
            to="/auth/become-organizer"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-2 ${
                isActive
                  ? "bg-indigo-500/15 text-indigo-300"
                  : "text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
              }`
            }
          >
            <Shield className="w-5 h-5 shrink-0" />
            {(!collapsed || isMobile) && <span>Become an Organizer</span>}
          </NavLink>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 pb-4 space-y-1 border-t border-slate-800 pt-3 shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {(!collapsed || isMobile) && <span>Logout</span>}
        </button>

        {!isMobile && (
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
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar (md+) ───────────────────────── */}
      <aside
        className={`hidden md:flex sticky top-0 h-dvh flex-col border-r border-slate-800 bg-slate-950/80 transition-all duration-200 ${
          collapsed ? "w-17" : "w-56"
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* ── Mobile drawer ──────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-200 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onMobileClose}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-dvh w-72 bg-slate-950 border-r border-slate-800 md:hidden transition-transform duration-250 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent(true)}
      </aside>
    </>
  );
};

export default Sidebar;
