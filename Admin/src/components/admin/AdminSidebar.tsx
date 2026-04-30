import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  UserCircle,
  Wallet,
  Lock,
  Clock,
  FileText,
  ShieldCheck,
  Puzzle,
  X,
  AlertTriangle,
  Trophy,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useAdminAuth } from "../../lib/admin-auth-context";

// ─── Nav structure ─────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
      { to: "/admin/users", icon: Users, label: "Users" },
      { to: "/admin/tournaments", icon: Trophy, label: "Tournaments" },
      { to: "/admin/verifications", icon: BadgeCheck, label: "Verifications" },
      { to: "/admin/games", icon: Gamepad2, label: "Games" },
      { to: "/admin/game-requests", icon: Puzzle, label: "Game Requests" },
      { to: "/admin/disputes", icon: AlertTriangle, label: "Disputes" },
      { to: "/admin/payouts", icon: Wallet, label: "Payouts" },
      { to: "/admin/escrow", icon: Lock, label: "Escrow" },
      { to: "/admin/scheduler", icon: Clock, label: "Scheduler" },
      { to: "/admin/audit-logs", icon: FileText, label: "Audit Logs" },
      { to: "/admin/admins", icon: ShieldCheck, label: "Admins" },
      { to: "/admin/profile", icon: UserCircle, label: "Profile" },
    ],
  },
] as const;

interface AdminSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const AdminSidebar = ({ mobileOpen, onMobileClose }: AdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    onMobileClose();
  }, [location.pathname, onMobileClose]);

  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  const sidebarContent = (isMobile: boolean) => (
    <div className="relative h-full flex flex-col overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-20 w-56 h-56 rounded-full bg-amber-500/12 blur-3xl" />

      {/* Logo */}
      <div
        className={`relative flex items-center justify-between px-3 py-3 border-b border-slate-800/80 bg-slate-950/70 shrink-0 ${collapsed && !isMobile ? "px-2.5" : ""}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white p-0.5 shrink-0">
            <img
              src="/apex-logo.png"
              alt="Apex Arenas"
              className="w-full h-full object-contain"
            />
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-[13px] text-white leading-tight tracking-wide">
                APEX ARENAS
              </span>
              <span className="text-[9px] text-amber-400 font-semibold tracking-widest uppercase">
                Admin
              </span>
            </div>
          )}
        </div>
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav
        ref={navRef}
        className={`relative flex-1 py-2 space-y-3 px-2 ${isMobile ? "overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" : "overflow-hidden"}`}
      >
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label}>
            {(!collapsed || isMobile) && group.label && (
              <p
                className={`px-2.5 mb-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest ${index === 0 ? "mt-1" : ""}`}
              >
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label, ...rest }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={"end" in rest}
                  title={collapsed && !isMobile ? label : undefined}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-[color,background-color,border-color,transform,box-shadow] duration-200 ease-out group border ${
                      isActive
                        ? "bg-linear-to-r from-amber-500/18 via-amber-500/8 to-transparent text-amber-200 border-amber-500/25 shadow-[0_14px_24px_-20px_rgba(245,158,11,0.95)]"
                        : "text-slate-400 border-transparent hover:text-white hover:bg-white/4 hover:shadow-[0_10px_18px_-14px_rgba(148,163,184,0.6)]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-amber-400" />
                      )}
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ease-out group-hover:scale-105 ${isActive ? "text-amber-400" : ""}`}
                      />
                      {(!collapsed || isMobile) && <span>{label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User info + bottom actions */}
      <div className="relative px-2 pb-2 pt-2 border-t border-slate-800/80 bg-slate-950/65 space-y-1 shrink-0">
        <button
          onClick={handleLogout}
          title={collapsed && !isMobile ? "Logout" : undefined}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/8 transition-[color,background-color] duration-200 ease-out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span>Logout</span>}
        </button>

        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-[color,background-color] duration-200 ease-out"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" />
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
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex h-dvh flex-col border-r border-slate-800/80 bg-slate-950 transition-all duration-200 ${collapsed ? "w-15" : "w-56"}`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden transition-opacity duration-200 ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onMobileClose}
      />
      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-dvh w-72 bg-slate-950 border-r border-slate-800 md:hidden transition-transform duration-250 ease-in-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebarContent(true)}
      </aside>
    </>
  );
};

export default AdminSidebar;
