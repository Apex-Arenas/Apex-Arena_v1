import { Outlet, useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { useAdminAuth } from "../../lib/admin-auth-context";
import { Menu, Shield, UserCircle } from "lucide-react";
import { useCallback, useState } from "react";

const AdminLayout = () => {
  const { admin } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  const fullName = [admin?.firstName, admin?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const profileName = fullName || admin?.username || "Admin";

  return (
    <div className="relative flex h-dvh bg-slate-950 text-slate-100 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-0 w-lg h-128 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 w-120 h-120 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={handleMobileClose} />

      <div className="relative flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 px-4 sm:px-6 pt-3">
          <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-4 sm:px-5 py-3 shadow-[0_14px_40px_-24px_rgba(14,165,233,0.45)]">
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
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase">
                    Admin Panel
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
                  Operations Console
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/admin/profile")}
              className="flex items-center gap-2 pl-3 py-1.5 pr-2 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900 transition-colors"
            >
              {admin?.avatarUrl ? (
                <img
                  src={admin.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  <UserCircle className="w-4 h-4" />
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
            </button>
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

export default AdminLayout;
