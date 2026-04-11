import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { adminService, type AdminUser } from '../../services/admin.service';

const inputCls =
  'w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors';
const selectCls =
  'w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors';

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function AdminManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [forcing2FA, setForcing2FA] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.fetchAdmins();
      setAdmins(data);
    } catch {
      setError('Failed to load admin users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) { setFormError('Email is required.'); return; }
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');
    const ok = await adminService.setupAdmin(newEmail.trim(), newRole);
    setSubmitting(false);
    if (ok) {
      setFormSuccess('Admin setup initiated. They will receive login credentials.');
      setNewEmail('');
      setNewRole('admin');
      loadAdmins();
    } else {
      setFormError('Failed to setup admin. Email may already be in use.');
    }
  };

  const handleForce2FA = async (adminId: string) => {
    setForcing2FA(adminId);
    setActionMsg('');
    setActionError('');
    const ok = await adminService.forceAdmin2FA(adminId);
    setForcing2FA(null);
    if (ok) setActionMsg('2FA enforcement triggered.');
    else setActionError('Failed to force 2FA setup.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/15 p-2.5 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Management</h1>
            <p className="text-sm text-slate-400">Manage admin accounts and permissions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAdmins}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setFormError(''); setFormSuccess(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Admin
          </button>
        </div>
      </div>

      {/* Action feedback */}
      {actionMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4" /> {actionMsg}
        </div>
      )}
      {actionError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" /> {actionError}
        </div>
      )}

      {/* Setup form */}
      {showForm && (
        <form onSubmit={handleSetup} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Setup New Admin</h2>

          {formError && (
            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
              <AlertCircle className="w-3 h-3" /> {formError}
            </div>
          )}
          {formSuccess && (
            <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-xs">
              <CheckCircle2 className="w-3 h-3" /> {formSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Email <span className="text-red-400">*</span></label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={inputCls}
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className={selectCls}>
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Setup Admin
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
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
        <div className="text-center py-12 text-slate-500">No admin accounts found.</div>
      )}

      {!loading && admins.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">Admin</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">Role</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">2FA</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">Last Login</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">Status</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="text-white font-medium">{admin.firstName} {admin.lastName}</div>
                    <div className="text-slate-500 text-xs">{admin.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-medium capitalize">
                      {admin.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {admin.twoFactorEnabled ? (
                      <span className="text-green-400 text-xs">Enabled</span>
                    ) : (
                      <span className="text-red-400 text-xs">Disabled</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">{formatDate(admin.lastLogin)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium ${admin.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {!admin.twoFactorEnabled && (
                      <button
                        onClick={() => handleForce2FA(admin.id)}
                        disabled={forcing2FA === admin.id}
                        title="Force 2FA setup"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-amber-300 hover:bg-amber-500/10 text-xs transition-colors disabled:opacity-50"
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
