import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Shield,
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
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAdminAuth } from '../../lib/admin-auth-context';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/verifications', icon: BadgeCheck, label: 'Verifications' },
  { to: '/admin/games', icon: Gamepad2, label: 'Games' },
  { to: '/admin/game-requests', icon: Puzzle, label: 'Game Requests' },
  { to: '/admin/payouts', icon: Wallet, label: 'Payouts' },
  { to: '/admin/escrow', icon: Lock, label: 'Escrow' },
  { to: '/admin/scheduler', icon: Clock, label: 'Scheduler' },
  { to: '/admin/audit-logs', icon: FileText, label: 'Audit Logs' },
  { to: '/admin/admins', icon: ShieldCheck, label: 'Admins' },
  { to: '/admin/profile', icon: UserCircle, label: 'Profile' },
] as const;

interface AdminSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const AdminSidebar = ({ mobileOpen, onMobileClose }: AdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileClose();
  }, [location.pathname, onMobileClose]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const sidebarContent = (isMobile: boolean) => (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-linear-to-r from-amber-400 via-orange-400 to-red-400 w-9 h-9 rounded-lg flex items-center justify-center text-slate-950 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex flex-col">
              <span className="font-display font-bold text-sm text-white whitespace-nowrap leading-tight">
                APEX ARENAS
              </span>
              <span className="text-[10px] text-amber-400 font-medium tracking-wider">
                ADMIN
              </span>
            </div>
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

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-2 py-4 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in rest}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {(!collapsed || isMobile) && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
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
          collapsed ? 'w-17' : 'w-56'
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* ── Mobile drawer ──────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-200 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onMobileClose}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-dvh w-72 bg-slate-950 border-r border-slate-800 md:hidden transition-transform duration-250 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent(true)}
      </aside>
    </>
  );
};

export default AdminSidebar;
