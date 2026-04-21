import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  X,
  Users,
  UserCircle,
} from "lucide-react";
import { adminService, type AdminUser } from "../../services/admin.service";

const inputCls =
  "w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors";
const selectCls =
  "w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function AdminManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [forcing2FA, setForcing2FA] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState("");
  const [actionError, setActionError] = useState("");

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminService.fetchAdmins();
      setAdmins(data);
    } catch {
      setError("Failed to load admin users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      setFormError("Email is required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    setFormSuccess("");
    const ok = await adminService.setupAdmin(newEmail.trim(), newRole);
    setSubmitting(false);
    if (ok) {
      setFormSuccess(
        "Admin setup initiated. They will receive login credentials.",
      );
      setNewEmail("");
      setNewRole("admin");
      loadAdmins();
    } else {
      setFormError("Failed to setup admin. Email may already be in use.");
    }
  };

  const handleForce2FA = async (adminId: string) => {
    setForcing2FA(adminId);
    setActionMsg("");
    setActionError("");
    const result = await adminService.forceAdmin2FA(adminId);
    setForcing2FA(null);
    if (result.ok) {
      setActionMsg(
        `${result.message ?? "2FA setup required on next login."} Status may still show Disabled until the admin completes setup at login.`,
      );
      void loadAdmins();
    } else if (result.code === "SUPER_ADMIN_REQUIRED") {
      setActionError("Only the super admin can force 2FA for admin accounts.");
    } else {
      setActionError(result.message || "Failed to force 2FA setup.");
    }
  };

  const roleColors: Record<string, string> = {
    admin: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    super_admin: "bg-red-500/15 text-red-300 border-red-500/30",
    moderator: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Full-bleed Hero */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-linear-to-br from-red-500/8 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-display font-bold text-white">
                    Admin Management
                  </h1>
                  {!loading && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                      {admins.length} admins
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  Manage admin accounts and permissions.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadAdmins}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setFormError("");
                  setFormSuccess("");
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 transition-colors"
              >
                {showForm ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {showForm ? "Close" : "Add Admin"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Action feedback */}
        {actionMsg && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {actionMsg}
          </div>
        )}
        {actionError && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {actionError}
          </div>
        )}

        {/* Setup form - amber tinted card */}
        {showForm && (
          <form
            onSubmit={handleSetup}
            className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4"
          >
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Setup New Admin
            </h2>

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                <AlertCircle className="w-3 h-3 shrink-0" /> {formError}
              </div>
            )}
            {formSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs">
                <CheckCircle2 className="w-3 h-3 shrink-0" /> {formSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={inputCls}
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className={selectCls}
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Setup Admin
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
        )}

        {/* Admin list */}
        {!loading && admins.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-slate-600" />
            </div>
            <h2 className="text-base font-semibold text-white mb-1">
              No admin accounts found
            </h2>
            <p className="text-sm text-slate-500">
              Add the first admin using the button above.
            </p>
          </div>
        )}

        {!loading && admins.length > 0 && (
          <div className="rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900/40">
                  <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">
                    Admin
                  </th>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">
                    2FA
                  </th>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs hidden md:table-cell">
                    Last Login
                  </th>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">
                    Status
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => {
                  return (
                    <tr
                      key={admin.id}
                      className="border-t border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center text-amber-200 shrink-0">
                            <UserCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-white font-medium text-sm">
                              {admin.firstName} {admin.lastName}
                            </div>
                            <div className="text-slate-500 text-xs">
                              {admin.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${roleColors[admin.role] ?? "bg-slate-700/60 text-slate-300 border-slate-600/30"}`}
                        >
                          {admin.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {admin.twoFactorEnabled ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-emerald-400 text-xs">
                              Enabled
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span className="text-red-400 text-xs">
                              Disabled
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs hidden md:table-cell">
                        {formatDate(admin.lastLogin)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${admin.isActive ? "bg-emerald-400" : "bg-red-400"}`}
                          />
                          <span
                            className={`text-xs font-medium ${admin.isActive ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {admin.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!admin.twoFactorEnabled && (
                          <button
                            onClick={() => handleForce2FA(admin.id)}
                            disabled={forcing2FA === admin.id}
                            title="Force 2FA setup"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-300 hover:border-amber-500/30 hover:bg-amber-500/10 text-xs transition-colors disabled:opacity-50"
                          >
                            {forcing2FA === admin.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <KeyRound className="w-3.5 h-3.5" />
                            )}
                            Force 2FA
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
