import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { useAdminAuth } from '../../lib/admin-auth-context';
import { Menu, Shield } from 'lucide-react';
import { useCallback, useState } from 'react';

const AdminLayout = () => {
  const { admin } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  const initials = admin
    ? `${(admin.firstName?.[0] ?? '').toUpperCase()}${(admin.lastName?.[0] ?? '').toUpperCase()}`
    : '?';

  return (
    <div className="flex min-h-dvh bg-slate-950 text-slate-100">
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={handleMobileClose} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-400 tracking-wider uppercase">
                Admin Panel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {admin?.avatarUrl ? (
              <img
                src={admin.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xs font-semibold text-amber-300">
                {initials}
              </div>
            )}
            <span className="text-sm font-medium text-slate-200 hidden sm:block">
              {admin?.username ?? 'Admin'}
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

export default AdminLayout;
