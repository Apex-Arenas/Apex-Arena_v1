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
  ChevronLeft,
  ChevronRight,
  Clock,
  Zap,
  Ban,
  CheckCheck,
  AlertTriangle,
  ArrowDownCircle,
} from 'lucide-react';
import { adminService, type AdminPayoutRequest } from '../../services/admin.service';

// ─── Styles ────────────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors';

const STATUS_TABS = [
  { key: 'all',        label: 'All',        Icon: ArrowDownCircle },
  { key: 'pending',    label: 'Pending',     Icon: Clock          },
  { key: 'processing', label: 'Processing',  Icon: Zap            },
  { key: 'approved',   label: 'Approved',    Icon: CheckCircle2   },
  { key: 'completed',  label: 'Completed',   Icon: CheckCheck     },
  { key: 'rejected',   label: 'Rejected',    Icon: Ban            },
  { key: 'failed',     label: 'Failed',      Icon: AlertTriangle  },
] as const;

type StatusKey = (typeof STATUS_TABS)[number]['key'];

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
  completed:  'border-l-emerald-500',
  failed:     'border-l-red-500',
};

const tabActiveColors: Record<StatusKey, string> = {
  all:        'border-b-slate-300  text-white',
  pending:    'border-b-amber-500  text-amber-400',
  processing: 'border-b-blue-500   text-blue-400',
  approved:   'border-b-emerald-500 text-emerald-400',
  completed:  'border-b-emerald-400 text-emerald-300',
  rejected:   'border-b-red-500    text-red-400',
  failed:     'border-b-red-400    text-red-300',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatGHS(amount: number) {
  return `GHS ${(amount / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const PAGE_SIZE = 15;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PayoutsManagement() {
  const [payouts,   setPayouts]   = useState<AdminPayoutRequest[]>([]);
  const [total,     setTotal]     = useState(0);
  const [pages,     setPages]     = useState(1);
  const [page,      setPage]      = useState(1);
  const [activeTab, setActiveTab] = useState<StatusKey>('all');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [approvingId,  setApprovingId]  = useState<string | null>(null);
  const [rejectingId,  setRejectingId]  = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [momoRef,      setMomoRef]      = useState('');
  const [actionError,  setActionError]  = useState('');

  const loadPayouts = useCallback(async (tabKey: StatusKey, p: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await adminService.fetchAllPayouts({
        page:   p,
        limit:  PAGE_SIZE,
        status: tabKey === 'all' ? undefined : tabKey,
      });
      setPayouts(result.payouts);
      setTotal(result.total);
      setPages(result.pages);
    } catch {
      setError('Failed to load payout requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayouts(activeTab, page);
  }, [activeTab, page, loadPayouts]);

  const switchTab = (key: StatusKey) => {
    setActiveTab(key);
    setPage(1);
    setExpandedId(null);
  };

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleApprove = async (id: string) => {
    setActionError('');
    setApprovingId(id);
    const ok = await adminService.approvePayout(id, approveNotes || undefined);
    setApprovingId(null);
    if (ok) {
      setExpandedId(null);
      setApproveNotes('');
      loadPayouts(activeTab, page);
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
      loadPayouts(activeTab, page);
    } else {
      setActionError('Failed to reject payout.');
    }
  };

  const handleConfirm = async (id: string) => {
    setActionError('');
    setConfirmingId(id);
    const ok = await adminService.confirmPayout(id, momoRef || undefined);
    setConfirmingId(null);
    if (ok) {
      setExpandedId(null);
      setMomoRef('');
      loadPayouts(activeTab, page);
    } else {
      setActionError('Failed to mark payout as completed.');
    }
  };

  // ─── Stats bar ────────────────────────────────────────────────────────────

  const pendingCount = activeTab === 'all'
    ? payouts.filter((p) => p.status === 'pending').length
    : activeTab === 'pending' ? total : 0;

  return (
    <div className="min-h-screen bg-slate-950">

      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-white">Payout Requests</h1>
                  {pendingCount > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      {pendingCount} pending
                    </span>
                  )}
                  {total > 0 && (
                    <span className="text-xs text-slate-500">
                      {total} total
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Review, approve, or reject user withdrawal requests.</p>
              </div>
            </div>
            <button
              onClick={() => loadPayouts(activeTab, page)}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            {STATUS_TABS.map(({ key, label, Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => switchTab(key)}
                  className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? `${tabActiveColors[key]} border-b-2`
                      : 'border-b-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
        )}

        {/* Empty */}
        {!loading && !error && payouts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6 text-slate-600" />
            </div>
            <h2 className="text-sm font-semibold text-white mb-1">No payout requests</h2>
            <p className="text-xs text-slate-500">
              {activeTab === 'all' ? 'No requests have been submitted yet.' : `No ${activeTab} requests found.`}
            </p>
          </div>
        )}

        {/* Payout list */}
        {!loading && payouts.length > 0 && (
          <div className="space-y-2">
            {payouts.map((p) => {
              const expanded    = expandedId === p.id;
              const borderColor = statusBorder[p.status] ?? 'border-l-slate-600';

              return (
                <div
                  key={p.id}
                  className={`bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden border-l-4 ${borderColor} transition-all`}
                >
                  {/* Row header */}
                  <button
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-800/30 transition-colors"
                    onClick={() => {
                      setExpandedId(expanded ? null : p.id);
                      setActionError('');
                      setApproveNotes('');
                      setRejectReason('');
                      setMomoRef('');
                    }}
                  >
                    {/* Left */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold text-sm">{p.username}</span>
                          <span className="text-slate-500 text-xs hidden sm:inline">{p.email}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-amber-400 font-bold text-sm">{formatGHS(p.amount)}</span>
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700/50 capitalize">
                            {p.type.replace('_', ' ')}
                          </span>
                          {p.network && (
                            <span className="text-xs text-slate-500">{p.network}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${statusColors[p.status] ?? 'bg-slate-700/60 text-slate-300 border-slate-600/30'}`}>
                        {p.status}
                      </span>
                      <span className="text-xs text-slate-500 hidden md:block">{formatDate(p.requestedAt)}</span>
                      {expanded
                        ? <ChevronUp className="w-4 h-4 text-slate-500" />
                        : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="px-5 pb-5 border-t border-slate-800/60 space-y-4 pt-4">

                      {/* Info grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/40">
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
                        <div>
                          <span className="text-slate-500 block text-xs mb-1">Requested</span>
                          <span className="text-white text-sm font-medium">{formatDate(p.requestedAt)}</span>
                        </div>
                        {p.tournamentName && (
                          <div className="col-span-2">
                            <span className="text-slate-500 block text-xs mb-1">Tournament</span>
                            <span className="text-white text-sm font-medium">{p.tournamentName}</span>
                          </div>
                        )}
                        {p.processedAt && (
                          <div className="col-span-2">
                            <span className="text-slate-500 block text-xs mb-1">Processed At</span>
                            <span className="text-white text-sm font-medium">{formatDate(p.processedAt)}</span>
                          </div>
                        )}
                      </div>

                      {p.adminNotes && (
                        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs text-slate-400">
                          <span className="text-slate-500 font-medium">Admin Notes: </span>{p.adminNotes}
                        </div>
                      )}

                      {actionError && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {actionError}
                        </div>
                      )}

                      {/* Actions for pending */}
                      {p.status === 'pending' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs text-slate-400">
                              Admin Notes <span className="text-slate-600">(optional)</span>
                            </label>
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
                              {approvingId === p.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <CheckCircle2 className="w-4 h-4" />}
                              Approve
                            </button>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs text-slate-400">
                              Rejection Reason <span className="text-red-400">*</span>
                            </label>
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
                              {rejectingId === p.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <XCircle className="w-4 h-4" />}
                              Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action for approved / processing — mark as completed */}
                      {(p.status === 'approved' || p.status === 'processing') && (
                        <div className="space-y-2 max-w-sm">
                          <p className="text-xs text-slate-400">
                            Once you have manually sent the MoMo transfer, enter the reference and mark as completed.
                          </p>
                          <input
                            value={momoRef}
                            onChange={(e) => setMomoRef(e.target.value)}
                            className={inputCls}
                            placeholder="MoMo reference (optional)..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirm(p.id)}
                              disabled={confirmingId === p.id}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-sm font-medium hover:bg-blue-500/25 transition-colors disabled:opacity-50"
                            >
                              {confirmingId === p.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <CheckCheck className="w-4 h-4" />}
                              Mark as Completed
                            </button>
                            {p.status === 'approved' && (
                              <button
                                onClick={() => handleReject(p.id)}
                                disabled={rejectingId === p.id}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                              >
                                {rejectingId === p.id
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <XCircle className="w-4 h-4" />}
                                Reject
                              </button>
                            )}
                          </div>
                          {p.status === 'approved' && rejectingId !== p.id && (
                            <input
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className={inputCls}
                              placeholder="Rejection reason (if rejecting)..."
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-500">
              Page {page} of {pages} &nbsp;·&nbsp; {total} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>

              {/* Page numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (pages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= pages - 3) {
                    pageNum = pages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'text-slate-500 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-40"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
