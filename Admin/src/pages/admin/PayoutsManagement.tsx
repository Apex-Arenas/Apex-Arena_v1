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
  'w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300',
  approved: 'bg-green-500/15 text-green-300',
  rejected: 'bg-red-500/15 text-red-300',
  processing: 'bg-blue-500/15 text-blue-300',
  completed: 'bg-emerald-500/15 text-emerald-300',
  failed: 'bg-red-500/15 text-red-400',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/15 p-2.5 rounded-xl">
            <Wallet className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Payout Requests</h1>
            <p className="text-sm text-slate-400">Review and process user withdrawal requests</p>
          </div>
        </div>
        <button
          onClick={loadPayouts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
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
        <div className="text-center py-16 text-slate-500">
          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No pending payout requests</p>
        </div>
      )}

      {/* List */}
      {!loading && payouts.length > 0 && (
        <div className="space-y-3">
          {payouts.map((p) => {
            const expanded = expandedId === p.id;
            return (
              <div
                key={p.id}
                className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden"
              >
                {/* Row */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/40 transition-colors"
                  onClick={() => { setExpandedId(expanded ? null : p.id); setActionError(''); }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">{p.username}</span>
                        <span className="text-slate-500 text-xs">{p.email}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-amber-400 font-semibold text-sm">{formatGHS(p.amount)}</span>
                        <span className="text-xs text-slate-500 capitalize">{p.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[p.status] ?? 'bg-slate-700 text-slate-300'}`}>
                      {p.status}
                    </span>
                    <span className="text-xs text-slate-500">{formatDate(p.requestedAt)}</span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div className="px-5 pb-5 border-t border-slate-800 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
                      <div>
                        <span className="text-slate-500 block text-xs mb-1">MoMo Number</span>
                        <span className="text-white">{p.momoNumber ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-xs mb-1">Network</span>
                        <span className="text-white">{p.network ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-xs mb-1">Account Name</span>
                        <span className="text-white">{p.accountName ?? '—'}</span>
                      </div>
                      {p.tournamentName && (
                        <div>
                          <span className="text-slate-500 block text-xs mb-1">Tournament</span>
                          <span className="text-white">{p.tournamentName}</span>
                        </div>
                      )}
                    </div>

                    {actionError && (
                      <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {actionError}
                      </div>
                    )}

                    {p.status === 'pending' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Approve */}
                        <div className="space-y-2">
                          <label className="text-xs text-slate-400">Admin Notes (optional)</label>
                          <input
                            value={approveNotes}
                            onChange={(e) => setApproveNotes(e.target.value)}
                            className={inputCls}
                            placeholder="Notes for approval..."
                          />
                          <button
                            onClick={() => handleApprove(p.id)}
                            disabled={approvingId === p.id}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
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
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {rejectingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {p.adminNotes && (
                      <div className="mt-2 p-3 bg-slate-800/60 rounded-lg text-xs text-slate-400">
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
  );
}
