import { useCallback, useEffect, useState } from 'react';
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { adminService, type AdminPayoutRequest } from '../../services/admin.service';

const inputCls =
  'w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors';

const statusColors: Record<string, string> = {
  pending:    'bg-amber-500/15 text-amber-300 border-amber-500/30',
  approved:   'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected:   'bg-red-500/15 text-red-300 border-red-500/30',
  processing: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  completed:  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  failed:     'bg-red-500/15 text-red-400 border-red-500/30',
};

const statusBorder: Record<string, string> = {
  pending:    'border-l-amber-500',
  approved:   'border-l-emerald-500',
  rejected:   'border-l-red-500',
  processing: 'border-l-blue-500',
  completed:  'border-l-blue-500',
  failed:     'border-l-red-500',
};

function formatGHS(amount: number) {
  return `GHS ${(amount / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function PayoutsManagement() {
  const [payouts, setPayouts] = useState<AdminPayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.fetchPendingPayouts();
      setPayouts(data);
    } catch {
      setError('Failed to load payout requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPayouts(); }, [loadPayouts]);

  const handleApprove = async (id: string) => {
    setActionError('');
    setApprovingId(id);
    const ok = await adminService.approvePayout(id, approveNotes || undefined);
    setApprovingId(null);
    if (ok) {
      setExpandedId(null);
      setApproveNotes('');
      loadPayouts();
    } else {
      setActionError('Failed to approve payout.');
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) { setActionError('Rejection reason is required.'); return; }
    setActionError('');
    setRejectingId(id);
    const ok = await adminService.rejectPayout(id, rejectReason);
    setRejectingId(null);
    if (ok) {
      setExpandedId(null);
      setRejectReason('');
      loadPayouts();
    } else {
      setActionError('Failed to reject payout.');
    }
  };

  const pendingCount = payouts.filter((p) => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Full-bleed Hero */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-display font-bold text-white">Payout Requests</h1>
                  {pendingCount > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      {pendingCount} pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-0.5">Review and process user withdrawal requests.</p>
              </div>
            </div>
            <button
              onClick={loadPayouts}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
        )}

        {/* Empty */}
        {!loading && !error && payouts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-4">
              <Wallet className="w-7 h-7 text-slate-600" />
            </div>
            <h2 className="text-base font-semibold text-white mb-1">No pending payout requests</h2>
            <p className="text-sm text-slate-500">All payouts have been processed.</p>
          </div>
        )}

        {/* List */}
        {!loading && payouts.length > 0 && (
          <div className="space-y-2.5">
            {payouts.map((p) => {
              const expanded = expandedId === p.id;
              const borderColor = statusBorder[p.status] ?? 'border-l-slate-600';
              return (
                <div
                  key={p.id}
                  className={`bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden border-l-4 ${borderColor}`}
                >
                  {/* Row */}
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/30 transition-colors"
                    onClick={() => { setExpandedId(expanded ? null : p.id); setActionError(''); }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold text-sm">{p.username}</span>
                          <span className="text-slate-500 text-xs">{p.email}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-amber-400 font-bold text-base">{formatGHS(p.amount)}</span>
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700/50 capitalize">{p.type.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[p.status] ?? 'bg-slate-700/60 text-slate-300 border-slate-600/30'}`}>
                        {p.status}
                      </span>
                      <span className="text-xs text-slate-500 hidden sm:block">{formatDate(p.requestedAt)}</span>
                      {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="px-5 pb-5 border-t border-slate-800 space-y-4">
                      {/* MoMo details grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                        <div>
                          <span className="text-slate-500 block text-xs mb-1">MoMo Number</span>
                          <span className="text-white text-sm font-medium">{p.momoNumber ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs mb-1">Network</span>
                          <span className="text-white text-sm font-medium">{p.network ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs mb-1">Account Name</span>
                          <span className="text-white text-sm font-medium">{p.accountName ?? '—'}</span>
                        </div>
                        {p.tournamentName && (
                          <div>
                            <span className="text-slate-500 block text-xs mb-1">Tournament</span>
                            <span className="text-white text-sm font-medium">{p.tournamentName}</span>
                          </div>
                        )}
                      </div>

                      {actionError && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {actionError}
                        </div>
                      )}

                      {p.status === 'pending' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Approve */}
                          <div className="space-y-2">
                            <label className="text-xs text-slate-400">Admin Notes <span className="text-slate-600">(optional)</span></label>
                            <input
                              value={approveNotes}
                              onChange={(e) => setApproveNotes(e.target.value)}
                              className={inputCls}
                              placeholder="Notes for approval..."
                            />
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={approvingId === p.id}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                            >
                              {approvingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              Approve
                            </button>
                          </div>

                          {/* Reject */}
                          <div className="space-y-2">
                            <label className="text-xs text-slate-400">Rejection Reason <span className="text-red-400">*</span></label>
                            <input
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className={inputCls}
                              placeholder="Reason for rejection..."
                            />
                            <button
                              onClick={() => handleReject(p.id)}
                              disabled={rejectingId === p.id}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/25 transition-colors disabled:opacity-50"
                            >
                              {rejectingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {p.adminNotes && (
                        <div className="mt-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs text-slate-400">
                          <span className="text-slate-500 font-medium">Admin Notes: </span>{p.adminNotes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
