import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Shield,
} from 'lucide-react';
import { adminService, type AuditLog, type AuditSearchParams } from '../../services/admin.service';

const inputCls =
  'bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors';

const severityColors: Record<string, string> = {
  info:     'bg-blue-500/15 text-blue-300 border-blue-500/30',
  warning:  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  critical: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const SeverityIcon = ({ s }: { s?: string }) => {
  if (s === 'critical') return <ShieldAlert className="w-3.5 h-3.5" />;
  if (s === 'warning') return <AlertTriangle className="w-3.5 h-3.5" />;
  return null;
};

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [suspicious, setSuspicious] = useState<AuditLog[]>([]);
  const [loadingSuspicious, setLoadingSuspicious] = useState(false);
  const [tab, setTab] = useState<'search' | 'suspicious'>('search');

  // Filter state
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const searchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    const params: AuditSearchParams = { page: p, limit: LIMIT };
    if (userId.trim()) params.userId = userId.trim();
    if (action.trim()) params.action = action.trim();
    if (category.trim()) params.category = category.trim();
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    try {
      const result = await adminService.searchAuditLogs(params);
      setLogs(result.logs);
      setTotal(result.total);
      setPage(p);
    } catch {
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [userId, action, category, startDate, endDate]);

  const loadSuspicious = useCallback(async () => {
    setLoadingSuspicious(true);
    try {
      const data = await adminService.getSuspiciousActivity();
      setSuspicious(data);
    } catch {
      setSuspicious([]);
    } finally {
      setLoadingSuspicious(false);
    }
  }, []);

  useEffect(() => { searchLogs(1); }, []);

  useEffect(() => {
    if (tab === 'suspicious' && suspicious.length === 0) loadSuspicious();
  }, [tab]);

  const totalPages = Math.ceil(total / LIMIT);

  const LogTable = ({ items }: { items: AuditLog[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900/40">
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">Time</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">User</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">Action</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">Category</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">IP</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs">Severity</th>
          </tr>
        </thead>
        <tbody>
          {items.map((log) => (
            <tr key={log.id} className="border-t border-slate-800/50 hover:bg-slate-800/30 transition-colors">
              <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-xs">{formatDate(log.createdAt)}</td>
              <td className="py-3 px-4">
                <span className="text-white text-sm">{log.username ?? log.userId}</span>
              </td>
              <td className="py-3 px-4 text-slate-300 font-mono text-xs">{log.action}</td>
              <td className="py-3 px-4 text-slate-400 capitalize text-sm">{log.category}</td>
              <td className="py-3 px-4 text-slate-500 font-mono text-xs">{log.ipAddress ?? '—'}</td>
              <td className="py-3 px-4">
                {log.severity ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${severityColors[log.severity] ?? 'bg-slate-700/60 text-slate-300 border-slate-600/30'}`}>
                    <SeverityIcon s={log.severity} />
                    {log.severity}
                  </span>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Full-bleed Hero */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-700/40 border border-slate-600/30 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-white">Audit Logs</h1>
                <p className="text-sm text-slate-400 mt-0.5">Search system activity and review security events.</p>
              </div>
            </div>

            {/* Tab switcher pills */}
            <div className="flex items-center gap-1 p-1 bg-slate-800/60 border border-slate-700/60 rounded-xl self-start sm:self-auto">
              {(['search', 'suspicious'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    tab === t
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'suspicious' ? 'Suspicious Activity' : 'Search Logs'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Search tab */}
        {tab === 'search' && (
          <>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <input value={userId} onChange={(e) => setUserId(e.target.value)} className={inputCls} placeholder="User ID..." />
                <input value={action} onChange={(e) => setAction(e.target.value)} className={inputCls} placeholder="Action..." />
                <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} placeholder="Category..." />
                <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
              </div>
              <button
                onClick={() => searchLogs(1)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              </div>
            )}

            {!loading && logs.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">No logs found for the given filters.</p>
              </div>
            )}

            {!loading && logs.length > 0 && (
              <div className="rounded-2xl border border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
                  <span className="text-sm text-slate-400">{total} total results</span>
                </div>
                <LogTable items={logs} />

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 p-4 border-t border-slate-800 bg-slate-900/40">
                    <button
                      onClick={() => searchLogs(page - 1)}
                      disabled={page === 1 || loading}
                      className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-sm disabled:opacity-40 transition-colors"
                    >
                      Prev
                    </button>
                    <span className="text-sm text-slate-400 px-2">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => searchLogs(page + 1)}
                      disabled={page === totalPages || loading}
                      className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-sm disabled:opacity-40 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Suspicious tab */}
        {tab === 'suspicious' && (
          <>
            <div className="flex justify-end">
              <button
                onClick={loadSuspicious}
                disabled={loadingSuspicious}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingSuspicious ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loadingSuspicious && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              </div>
            )}

            {!loadingSuspicious && suspicious.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-emerald-500/60" />
                </div>
                <p className="text-sm text-slate-400 font-medium">No suspicious activity detected.</p>
                <p className="text-xs text-slate-500 mt-1">Everything looks normal.</p>
              </div>
            )}

            {!loadingSuspicious && suspicious.length > 0 && (
              <div className="rounded-2xl border border-slate-800 overflow-hidden">
                <LogTable items={suspicious} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
