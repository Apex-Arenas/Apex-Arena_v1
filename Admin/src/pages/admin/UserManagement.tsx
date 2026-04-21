import { useCallback, useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Ban,
  ShieldCheck,
  UserX,
  UserCheck,
  MailCheck,
  LogOut,
  Unlock,
  MoreHorizontal,
  Filter,
  X,
  BadgeCheck,
  RefreshCw,
  Users,
  AlertTriangle,
  UserCircle,
} from "lucide-react";
import {
  adminService,
  type UsersListParams,
  type UsersListResult,
} from "../../services/admin.service";
import type { ManagedUser } from "../../types/admin.types";

type ActionType =
  | "ban"
  | "unban"
  | "deactivate"
  | "reactivate"
  | "verify-email"
  | "force-logout"
  | "unlock"
  | "verify-organizer"
  | "change-role";

// ─── Badge helpers ─────────────────────────────────────────────────────────────

const ROLE_CLS: Record<string, { bg: string; text: string }> = {
  player: { bg: "bg-blue-500/15", text: "text-blue-300" },
  organizer: { bg: "bg-purple-500/15", text: "text-purple-300" },
  admin: { bg: "bg-amber-500/15", text: "text-amber-300" },
  super_admin: { bg: "bg-red-500/15", text: "text-red-300" },
};

function accountStatus(user: ManagedUser) {
  if (user.isBanned)
    return {
      label: "Banned",
      dot: "bg-red-400",
      text: "text-red-300",
      bg: "bg-red-500/10",
    };
  if (!user.isActive)
    return {
      label: "Deactivated",
      dot: "bg-slate-500",
      text: "text-slate-400",
      bg: "bg-slate-500/10",
    };
  return {
    label: "Active",
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
  };
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function BanModal({
  user,
  onClose,
  onConfirm,
  loading,
}: {
  user: ManagedUser;
  onClose: () => void;
  onConfirm: (r: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Ban className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Ban User</h3>
            <p className="text-xs text-slate-400">@{user.username}</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Reason <span className="text-red-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Reason for banning this user…"
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-40"
          >
            {loading ? "Banning…" : "Ban User"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RoleModal({
  user,
  onClose,
  onConfirm,
  loading,
}: {
  user: ManagedUser;
  onClose: () => void;
  onConfirm: (r: string) => void;
  loading: boolean;
}) {
  const [role, setRole] = useState(user.role);
  return (
    <Modal>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Change Role</h3>
            <p className="text-xs text-slate-400">@{user.username}</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            New Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="player">Player</option>
            <option value="organizer">Organizer</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(role)}
            disabled={role === user.role || loading}
            className="flex-1 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-40"
          >
            {loading ? "Updating…" : "Update Role"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function UserManagement() {
  const [data, setData] = useState<UsersListResult>({
    users: [],
    pagination: { total: 0, page: 1, limit: 20, pages: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState<UsersListParams>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [banTarget, setBanTarget] = useState<ManagedUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<ManagedUser | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchUsers = useCallback(async (p: UsersListParams) => {
    setLoading(true);
    setActionError("");
    try {
      setData(await adminService.fetchUsers(p));
    } catch {
      setActionError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(params);
  }, [fetchUsers, params]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams((p) => ({ ...p, search: searchInput || undefined, page: 1 }));
  };

  const handleFilter = (key: "role" | "emailVerified", value: string) => {
    if (key === "emailVerified") {
      setParams((p) => ({
        ...p,
        emailVerified: value === "" ? undefined : value === "true",
        page: 1,
      }));
    } else {
      setParams((p) => ({ ...p, role: value || undefined, page: 1 }));
    }
  };

  const runAction = async (
    user: ManagedUser,
    action: Exclude<ActionType, "ban" | "change-role">,
  ) => {
    setActionLoading(user.id);
    setActiveMenu(null);
    setActionError("");
    const map: Record<typeof action, () => Promise<boolean>> = {
      unban: () => adminService.unbanUser(user.id),
      deactivate: () => adminService.deactivateUser(user.id),
      reactivate: () => adminService.reactivateUser(user.id),
      "verify-email": () => adminService.forceVerifyEmail(user.id),
      "force-logout": () => adminService.forceLogout(user.id),
      unlock: () => adminService.unlockUser(user.id),
      "verify-organizer": () => adminService.verifyOrganizer(user.id),
    };
    try {
      const ok = await map[action]();
      if (ok) await fetchUsers(params);
      else setActionError(`Failed to ${action.replace("-", " ")} user.`);
    } catch {
      setActionError(`Failed to ${action.replace("-", " ")} user.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = (user: ManagedUser, action: ActionType) => {
    if (action === "ban") {
      setBanTarget(user);
      setActiveMenu(null);
      return;
    }
    if (action === "change-role") {
      setRoleTarget(user);
      setActiveMenu(null);
      return;
    }
    void runAction(user, action);
  };

  const handleBanSubmit = async (reason: string) => {
    if (!banTarget || !reason.trim()) return;
    setActionLoading(banTarget.id);
    setActionError("");
    try {
      const ok = await adminService.banUser(banTarget.id, reason.trim());
      if (ok) await fetchUsers(params);
      else setActionError("Failed to ban user.");
    } catch {
      setActionError("Failed to ban user.");
    } finally {
      setActionLoading(null);
      setBanTarget(null);
    }
  };

  const handleRoleSubmit = async (newRole: string) => {
    if (!roleTarget) return;
    setActionLoading(roleTarget.id);
    setActionError("");
    try {
      const ok = await adminService.changeUserRole(roleTarget.id, newRole);
      if (ok) await fetchUsers(params);
      else setActionError("Failed to change role.");
    } catch {
      setActionError("Failed to change role.");
    } finally {
      setActionLoading(null);
      setRoleTarget(null);
    }
  };

  const getActions = (
    user: ManagedUser,
  ): {
    action: ActionType;
    label: string;
    icon: React.ElementType;
    danger?: boolean;
  }[] => {
    const a: {
      action: ActionType;
      label: string;
      icon: React.ElementType;
      danger?: boolean;
    }[] = [];
    if (user.isBanned)
      a.push({ action: "unban", label: "Unban", icon: ShieldCheck });
    else a.push({ action: "ban", label: "Ban User", icon: Ban, danger: true });
    if (user.isActive)
      a.push({ action: "deactivate", label: "Deactivate", icon: UserX });
    else if (!user.isBanned)
      a.push({ action: "reactivate", label: "Reactivate", icon: UserCheck });
    if (!user.isEmailVerified)
      a.push({
        action: "verify-email",
        label: "Verify Email",
        icon: MailCheck,
      });
    if (user.role === "player")
      a.push({
        action: "verify-organizer",
        label: "Verify as Organizer",
        icon: BadgeCheck,
      });
    a.push({ action: "change-role", label: "Change Role", icon: RefreshCw });
    a.push({ action: "force-logout", label: "Force Logout", icon: LogOut });
    a.push({ action: "unlock", label: "Unlock Account", icon: Unlock });
    return a;
  };

  const hasFilters = !!(params.role || params.emailVerified !== undefined);
  const { pagination } = data;

  return (
    <div className="min-h-full">
      {/* Modals */}
      {banTarget && (
        <BanModal
          user={banTarget}
          onClose={() => setBanTarget(null)}
          onConfirm={handleBanSubmit}
          loading={actionLoading === banTarget.id}
        />
      )}
      {roleTarget && (
        <RoleModal
          user={roleTarget}
          onClose={() => setRoleTarget(null)}
          onConfirm={handleRoleSubmit}
          loading={actionLoading === roleTarget.id}
        />
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/55 backdrop-blur-xl">
        <div className="absolute inset-0 bg-linear-to-br from-blue-500/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-size-[48px_48px]" />
        <div className="relative px-4 sm:px-6 py-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-white">
                  User Management
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  {loading ? (
                    "Loading…"
                  ) : (
                    <>
                      <span className="text-white font-medium">
                        {pagination.total.toLocaleString()}
                      </span>{" "}
                      registered accounts
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => fetchUsers(params)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/70 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Error */}
        {actionError && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {actionError}
          </div>
        )}

        {/* Search & Filter */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by username or email…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-[border-color,box-shadow] duration-200 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-linear-to-r from-amber-500/25 to-orange-500/20 text-amber-200 border border-amber-500/30 text-sm font-semibold hover:from-amber-500/35 hover:to-orange-500/30 transition-[background-color,transform,box-shadow] duration-200 ease-out hover:-translate-y-px hover:shadow-[0_12px_24px_-16px_rgba(245,158,11,0.8)]"
              >
                Search
              </button>
            </form>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilters || hasFilters ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"}`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              )}
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl border border-slate-700/60 bg-slate-900/40">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Role
                </label>
                <select
                  value={params.role ?? ""}
                  onChange={(e) => handleFilter("role", e.target.value)}
                  className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="">All roles</option>
                  <option value="player">Player</option>
                  <option value="organizer">Organizer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Email Status
                </label>
                <select
                  value={
                    params.emailVerified === undefined
                      ? ""
                      : String(params.emailVerified)
                  }
                  onChange={(e) =>
                    handleFilter("emailVerified", e.target.value)
                  }
                  className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="">All</option>
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
              </div>
              {hasFilters && (
                <button
                  onClick={() =>
                    setParams((p) => ({
                      ...p,
                      role: undefined,
                      emailVerified: undefined,
                      page: 1,
                    }))
                  }
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/55 backdrop-blur-xl overflow-hidden shadow-[0_24px_50px_-30px_rgba(14,165,233,0.4)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    Email
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Joined
                  </th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading && data.users.length === 0 ? (
                  Array.from({ length: 7 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4" colSpan={6}>
                        <div className="flex items-center gap-3 animate-pulse">
                          <div className="w-9 h-9 rounded-full bg-slate-800 shrink-0" />
                          <div className="space-y-2 flex-1">
                            <div className="h-3 w-36 bg-slate-800 rounded" />
                            <div className="h-2.5 w-52 bg-slate-800/70 rounded" />
                          </div>
                          <div className="h-5 w-16 bg-slate-800 rounded-full hidden sm:block" />
                          <div className="h-5 w-14 bg-slate-800 rounded-full" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : data.users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <Users className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                      <p className="text-slate-500 text-sm">No users found.</p>
                    </td>
                  </tr>
                ) : (
                  data.users.map((user) => {
                    const st = accountStatus(user);
                    const role = ROLE_CLS[user.role] ?? ROLE_CLS.player;
                    return (
                      <tr
                        key={user.id}
                        className="group transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-slate-800/25 hover:-translate-y-px hover:shadow-[0_16px_26px_-22px_rgba(148,163,184,0.9)]"
                      >
                        {/* User cell */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt=""
                                  className="w-9 h-9 rounded-full object-cover border border-slate-700"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-linear-to-br from-amber-500/20 to-cyan-500/20 border border-slate-700 flex items-center justify-center text-slate-200">
                                  <UserCircle className="w-4 h-4 text-slate-200/90" />
                                </div>
                              )}
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${st.dot}`}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-semibold truncate leading-tight text-[13px]">
                                {user.username}
                              </p>
                              <p className="text-slate-500 text-xs truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        {/* Role */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg ${role.bg} ${role.text}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg ${st.bg} ${st.text}`}
                            >
                              {st.label}
                            </span>
                            {user.isLocked && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-orange-500/10 text-orange-300">
                                Locked
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Email */}
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg ${user.isEmailVerified ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}
                          >
                            {user.isEmailVerified ? "Verified" : "Unverified"}
                          </span>
                        </td>
                        {/* Joined */}
                        <td className="px-5 py-3.5 hidden md:table-cell text-slate-500 text-xs whitespace-nowrap">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={() =>
                                setActiveMenu(
                                  activeMenu === user.id ? null : user.id,
                                )
                              }
                              disabled={actionLoading === user.id}
                              className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-[color,background-color,transform] duration-180 ease-out hover:-translate-y-px disabled:opacity-40"
                            >
                              {actionLoading === user.id ? (
                                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <MoreHorizontal className="w-4 h-4" />
                              )}
                            </button>

                            {activeMenu === user.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setActiveMenu(null)}
                                />
                                <div className="admin-menu-pop absolute right-0 top-full mt-1.5 z-50 w-52 bg-slate-800 border border-slate-700/60 rounded-xl shadow-2xl py-1.5 overflow-hidden">
                                  {getActions(user).map(
                                    ({ action, label, icon: Icon, danger }) => (
                                      <button
                                        key={action}
                                        onClick={() =>
                                          handleAction(user, action)
                                        }
                                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-[background-color,color,padding-left] duration-180 ease-out ${danger ? "text-red-400 hover:bg-red-500/10 hover:pl-4" : "text-slate-300 hover:bg-white/5 hover:text-white hover:pl-4"}`}
                                      >
                                        <Icon className="w-3.5 h-3.5 shrink-0" />
                                        {label}
                                      </button>
                                    ),
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-900/30">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="text-slate-300 font-semibold">
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}
                </span>{" "}
                of{" "}
                <span className="text-slate-300 font-semibold">
                  {pagination.total.toLocaleString()}
                </span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))
                  }
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 px-2 tabular-nums">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() =>
                    setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))
                  }
                  disabled={pagination.page >= pagination.pages}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
