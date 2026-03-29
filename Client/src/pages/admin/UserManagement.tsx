import { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { adminService, type UsersListParams, type UsersListResult } from '../../services/admin.service';
import type { ManagedUser } from '../../types/admin.types';

type ActionType =
  | 'ban'
  | 'unban'
  | 'deactivate'
  | 'reactivate'
  | 'verify-email'
  | 'force-logout'
  | 'unlock';

const roleBadge: Record<string, string> = {
  player: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  organizer: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  admin: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  super_admin: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const statusBadge = (user: ManagedUser) => {
  if (user.isBanned) return { label: 'Banned', cls: 'bg-red-500/15 text-red-300 border-red-500/30' };
  if (!user.isActive) return { label: 'Deactivated', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
  if (!user.isEmailVerified) return { label: 'Unverified', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
  return { label: 'Active', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
};

const UserManagement = () => {
  const [data, setData] = useState<UsersListResult>({
    users: [],
    pagination: { total: 0, page: 1, limit: 20, pages: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState<UsersListParams>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banTarget, setBanTarget] = useState<ManagedUser | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchUsers = useCallback(async (p: UsersListParams) => {
    setLoading(true);
    setActionError('');
    try {
      const result = await adminService.fetchUsers(p);
      setData(result);
    } catch {
      setActionError('Failed to load users.');
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

  const handleFilterChange = (key: 'role' | 'status', value: string) => {
    setParams((p) => ({ ...p, [key]: value || undefined, page: 1 }));
  };

  const handleAction = async (user: ManagedUser, action: ActionType) => {
    if (action === 'ban') {
      setBanTarget(user);
      setActiveMenu(null);
      return;
    }

    setActionLoading(user.id);
    setActiveMenu(null);
    setActionError('');

    const actions: Record<Exclude<ActionType, 'ban'>, () => Promise<boolean>> = {
      unban: () => adminService.unbanUser(user.id),
      deactivate: () => adminService.deactivateUser(user.id),
      reactivate: () => adminService.reactivateUser(user.id),
      'verify-email': () => adminService.forceVerifyEmail(user.id),
      'force-logout': () => adminService.forceLogout(user.id),
      unlock: () => adminService.unlockUser(user.id),
    };

    try {
      const success = await actions[action]();
      if (success) {
        await fetchUsers(params);
      } else {
        setActionError(`Failed to ${action.replace('-', ' ')} user.`);
      }
    } catch {
      setActionError(`Failed to ${action.replace('-', ' ')} user.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanSubmit = async () => {
    if (!banTarget || !banReason.trim()) return;
    setActionLoading(banTarget.id);
    setActionError('');

    try {
      const success = await adminService.banUser(banTarget.id, banReason.trim());
      if (success) {
        await fetchUsers(params);
      } else {
        setActionError('Failed to ban user.');
      }
    } catch {
      setActionError('Failed to ban user.');
    } finally {
      setActionLoading(null);
      setBanTarget(null);
      setBanReason('');
    }
  };

  const getAvailableActions = (user: ManagedUser): { action: ActionType; label: string; icon: React.ElementType }[] => {
    const actions: { action: ActionType; label: string; icon: React.ElementType }[] = [];

    if (user.isBanned) {
      actions.push({ action: 'unban', label: 'Unban', icon: ShieldCheck });
    } else {
      actions.push({ action: 'ban', label: 'Ban', icon: Ban });
    }

    if (user.isActive) {
      actions.push({ action: 'deactivate', label: 'Deactivate', icon: UserX });
    } else if (!user.isBanned) {
      actions.push({ action: 'reactivate', label: 'Reactivate', icon: UserCheck });
    }

    if (!user.isEmailVerified) {
      actions.push({ action: 'verify-email', label: 'Verify Email', icon: MailCheck });
    }

    actions.push({ action: 'force-logout', label: 'Force Logout', icon: LogOut });
    actions.push({ action: 'unlock', label: 'Unlock', icon: Unlock });

    return actions;
  };

  const { pagination } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">User Management</h1>

      {actionError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {actionError}
        </div>
      )}

      {/* Ban Modal */}
      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-1">Ban User</h3>
            <p className="text-sm text-slate-400 mb-4">
              Ban <span className="text-white font-medium">{banTarget.username}</span> ({banTarget.email})
            </p>
            <label className="block text-sm font-medium text-slate-200 mb-1">Reason</label>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent resize-none"
              rows={3}
              placeholder="Reason for banning this user..."
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setBanTarget(null); setBanReason(''); }}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBanSubmit}
                disabled={!banReason.trim() || actionLoading === banTarget.id}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {actionLoading === banTarget.id ? 'Banning...' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by email, username..."
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-700 bg-slate-900/60 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/25 transition-colors"
          >
            Search
          </button>
        </form>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            showFilters
              ? 'border-amber-500/30 bg-amber-500/15 text-amber-300'
              : 'border-slate-700 text-slate-300 hover:border-slate-600'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 rounded-lg border border-slate-800 bg-slate-900/40">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Role</label>
            <select
              value={params.role ?? ''}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950/60 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <option value="">All roles</option>
              <option value="player">Player</option>
              <option value="organizer">Organizer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Status</label>
            <select
              value={params.status ?? ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950/60 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="deactivated">Deactivated</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
          {(params.role || params.status) && (
            <button
              onClick={() => setParams((p) => ({ ...p, role: undefined, status: undefined, page: 1 }))}
              className="self-end flex items-center gap-1 px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-3 font-medium text-slate-400">User</th>
                <th className="px-4 py-3 font-medium text-slate-400">Role</th>
                <th className="px-4 py-3 font-medium text-slate-400">Status</th>
                <th className="px-4 py-3 font-medium text-slate-400">Joined</th>
                <th className="px-4 py-3 font-medium text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && data.users.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    <td className="px-4 py-4" colSpan={5}>
                      <div className="h-5 w-full bg-slate-800 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : data.users.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    No users found.
                  </td>
                </tr>
              ) : (
                data.users.map((user) => {
                  const status = statusBadge(user);
                  const initials = `${(user.firstName?.[0] ?? '').toUpperCase()}${(user.lastName?.[0] ?? '').toUpperCase()}` || '?';

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{user.username}</p>
                            <p className="text-slate-500 text-xs truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${roleBadge[user.role] ?? roleBadge.player}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                            disabled={actionLoading === user.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
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
                              <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1">
                                {getAvailableActions(user).map(({ action, label, icon: Icon }) => (
                                  <button
                                    key={action}
                                    onClick={() => handleAction(user, action)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                      action === 'ban'
                                        ? 'text-red-400 hover:bg-red-500/10'
                                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                    {label}
                                  </button>
                                ))}
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 px-2">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
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
  );
};

export default UserManagement;
