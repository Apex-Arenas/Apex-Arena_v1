import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { FadeImage } from "./ui/FadeImage";
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
  BarChart2,
  DollarSign,
  Mail,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { notificationService } from "../services/notification.service";

const playerNavItems = [
  { to: "/auth",                        icon: Home,       label: "Home",         end: true },
  { to: "/auth/player/join-tournament", icon: Swords,     label: "Tournaments"              },
  { to: "/auth/leaderboard",            icon: Trophy,     label: "Leaderboard"              },
  { to: "/auth/wallet",                 icon: Wallet,     label: "Wallet"                   },
  { to: "/auth/player/profile",         icon: UserCircle, label: "Profile"                  },
  { to: "/auth/notifications",          icon: Bell,       label: "Notifications"            },
  { to: "/auth/contact-us",              icon: Mail,       label: "Contact Us"               },
] as const;

const organizerNavItems = [
  { to: "/auth",                           icon: Home,       label: "Home",           end: true },
  { to: "/auth/organizer/tournaments",     icon: ListTodo,   label: "My Tournaments"            },
  { to: "/auth/organizer/analytics",       icon: BarChart2,  label: "Analytics"                 },
  { to: "/auth/organizer/payouts",         icon: DollarSign, label: "Payouts"                   },
  { to: "/auth/transactions",              icon: Receipt,    label: "Transactions"              },
  { to: "/auth/organizer/profile",         icon: UserCircle, label: "Profile"                   },
  { to: "/auth/notifications",             icon: Bell,       label: "Notifications"             },
  { to: "/auth/contact-us",                icon: Mail,       label: "Contact Us"                },
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

  useEffect(() => {
    let cancelled = false;
    notificationService.getUnreadCount()
      .then((n) => { if (!cancelled) setUnreadCount(n); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const isOrganizer = user?.role === "organizer";
  const navItems = isOrganizer ? organizerNavItems : playerNavItems;

  useEffect(() => {
    onMobileClose();
  }, [location.pathname, onMobileClose]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const userInitials = user
    ? `${(user.firstName?.[0] ?? "").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}` || (user.username?.[0]?.toUpperCase() ?? "?")
    : "?";

  const displayName = user
    ? (`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username)
    : "User";

  const show = !collapsed; // expanded on desktop

  const sidebarContent = (isMobile: boolean) => {
    const expanded = isMobile || show;

    return (
      <div className="relative h-full flex flex-col overflow-hidden">
        {/* Ambient top glow */}
        <div
          className="absolute top-0 inset-x-0 h-40 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 100% 100% at 50% 0%, rgba(249,115,22,0.09), transparent)" }}
        />

        {/* ── Logo ─────────────────────────────────────────────── */}
        <div className="relative flex items-center justify-between px-4 py-4 border-b border-slate-800/70 shrink-0">
          <NavLink to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white p-0.5 shrink-0 shadow-md shadow-orange-500/20">
              <img src="/apex-logo.png" alt="Apex Arenas" className="w-full h-full object-contain" />
            </div>
            {expanded && (
              <span className="font-display font-bold text-sm text-white tracking-wide whitespace-nowrap">
                APEX ARENAS
              </span>
            )}
          </NavLink>
          {isMobile && (
            <button
              onClick={onMobileClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ── User card ────────────────────────────────────────── */}
        <div className="relative px-3 py-3 border-b border-slate-800/50 shrink-0">
          <div className={`flex items-center gap-2.5 rounded-xl bg-slate-900/70 border border-slate-800/60 transition-all ${expanded ? "px-3 py-2.5" : "justify-center px-0 py-2.5"}`}>
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center text-xs font-bold text-white relative">
                {user?.avatarUrl
                  ? <FadeImage src={user.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  : userInitials
                }
              </div>
              {/* Online dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
            </div>
            {expanded && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate leading-tight">{displayName}</p>
                <span className={`inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-px rounded-full ${
                  isOrganizer
                    ? "bg-orange-500/15 text-orange-300 border border-orange-500/25"
                    : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                }`}>
                  {user?.role ?? "player"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Nav ──────────────────────────────────────────────── */}
        <nav className="relative flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={"end" in rest}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl text-sm font-medium transition-all ${
                  expanded ? "px-3 py-2.5" : "justify-center px-0 py-2.5"
                } ${
                  isActive
                    ? "bg-linear-to-r from-orange-500/15 to-orange-500/5 text-orange-300 border border-orange-500/20 shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent"
                }`
              }
            >
              <div className="relative shrink-0">
                <Icon className="w-5 h-5" />
                {to === "/auth/notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              {expanded && <span className="truncate">{label}</span>}
            </NavLink>
          ))}

          {/* ── Organizer CTA ─── */}
          {isOrganizer && (
            <div className="pt-3">
              {expanded ? (
                <NavLink
                  to="/auth/organizer/create-tournament"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-orange-500/20 hover:from-orange-400 hover:to-amber-300 hover:shadow-orange-500/30 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  New Tournament
                </NavLink>
              ) : (
                <NavLink
                  to="/auth/organizer/create-tournament"
                  className="flex items-center justify-center w-full py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-400 hover:bg-orange-500/25 transition-colors"
                  title="Create Tournament"
                >
                  <PlusCircle className="w-5 h-5" />
                </NavLink>
              )}
            </div>
          )}

          {/* ── Become an Organizer ─── */}
          {!isOrganizer && (
            <div className="pt-3">
              <NavLink
                to="/auth/become-organizer"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl text-sm font-medium transition-all border ${
                    expanded ? "px-3 py-2.5" : "justify-center px-0 py-2.5"
                  } ${
                    isActive
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                      : "border-dashed border-slate-700 text-amber-400/70 hover:text-amber-400 hover:border-amber-500/40 hover:bg-amber-500/5"
                  }`
                }
                title="Become an Organizer"
              >
                <Shield className="w-5 h-5 shrink-0" />
                {expanded && <span>Become Organizer</span>}
              </NavLink>
            </div>
          )}
        </nav>

        {/* ── Bottom ───────────────────────────────────────────── */}
        <div className="relative px-2 pb-3 pt-2 border-t border-slate-800/70 shrink-0 space-y-0.5">
          <button
            onClick={() => void handleLogout()}
            className={`flex items-center gap-3 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full ${
              expanded ? "px-3 py-2.5" : "justify-center px-0 py-2.5"
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {expanded && <span>Log out</span>}
          </button>

          {!isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`flex items-center gap-3 rounded-xl text-xs text-slate-600 hover:text-slate-400 hover:bg-slate-800/40 transition-colors w-full ${
                show ? "px-3 py-2" : "justify-center px-0 py-2"
              }`}
            >
              {show ? (
                <><ChevronLeft className="w-4 h-4 shrink-0" /><span>Collapse</span></>
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside
        className={`hidden md:flex sticky top-0 h-dvh flex-col border-r border-slate-800/70 bg-slate-950 transition-all duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* ── Mobile backdrop ─────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden transition-opacity duration-200 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* ── Mobile drawer ───────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 z-50 h-dvh w-72 bg-slate-950 border-r border-slate-800/70 md:hidden transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent(true)}
      </aside>
    </>
  );
};

export default Sidebar;
