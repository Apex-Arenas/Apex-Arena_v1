import { useCallback, useEffect, useState } from 'react';
import {
  Puzzle,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  Filter,
} from 'lucide-react';
import { adminService, type GameRequest } from '../../services/admin.service';

const inputCls =
  'w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors';

const statusColors: Record<string, string> = {
  pending:  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/30',
  duplicate:'bg-slate-700/60 text-slate-300 border-slate-600/30',
};

const statusBorder: Record<string, string> = {
  pending:  'border-l-amber-500',
  approved: 'border-l-emerald-500',
  rejected: 'border-l-red-500',
  duplicate:'border-l-slate-600',
};

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

export default function GameRequests() {
  const [requests, setRequests] = useState<GameRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [duplicateOf, setDuplicateOf] = useState('');
  const [actionError, setActionError] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.fetchGameRequests(filterStatus || undefined);
      setRequests(data);
    } catch {
      setError('Failed to load game requests.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !notes.trim()) { setActionError('Notes are required when rejecting.'); return; }
    setActionError('');
    setReviewingId(id);
    const ok = await adminService.reviewGameRequest(id, action, notes || undefined);
    setReviewingId(null);
    if (ok) {
      setExpandedId(null);
      setNotes('');
      loadRequests();
    } else {
      setActionError(`Failed to ${action} request.`);
    }
  };

  const handleMarkDuplicate = async (id: string) => {
    if (!duplicateOf.trim()) { setActionError('Provide the ID of the original request.'); return; }
    setActionError('');
    setDuplicatingId(id);
    const ok = await adminService.markGameRequestDuplicate(id, duplicateOf.trim());
    setDuplicatingId(null);
    if (ok) {
      setExpandedId(null);
      setDuplicateOf('');
      loadRequests();
    } else {
      setActionError('Failed to mark as duplicate.');
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Full-bleed Hero */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
                <Puzzle className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-display font-bold text-white">Game Requests</h1>
                  {pendingCount > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      {pendingCount} pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-0.5">Review community requests for new game support.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <Filter className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-8 pr-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="duplicate">Duplicate</option>
                </select>
              </div>
              <button
                onClick={loadRequests}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
        )}

        {/* Empty */}
        {!loading && !error && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-4">
              <Puzzle className="w-7 h-7 text-slate-600" />
            </div>
            <h2 className="text-base font-semibold text-white mb-1">No game requests found</h2>
            <p className="text-sm text-slate-500">Try changing the status filter above.</p>
          </div>
        )}

        {/* List */}
        {!loading && requests.length > 0 && (
          <div className="space-y-2.5">
            {requests.map((req) => {
              const expanded = expandedId === req.id;
              const borderColor = statusBorder[req.status] ?? 'border-l-slate-600';
              return (
                <div
                  key={req.id}
                  className={`bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden border-l-4 ${borderColor}`}
                >
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/30 transition-colors"
                    onClick={() => { setExpandedId(expanded ? null : req.id); setActionError(''); }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold text-sm">{req.gameName}</span>
                          {req.genre && (
                            <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700/50 capitalize">{req.genre}</span>
                          )}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          by {req.username} · {formatDate(req.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {req.upvoteCount}
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[req.status] ?? 'bg-slate-700/60 text-slate-300 border-slate-600/30'}`}>
                        {req.status}
                      </span>
                      {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-5 pb-5 border-t border-slate-800 space-y-4">
                      {req.description && (
                        <p className="text-slate-400 text-sm mt-4 leading-relaxed">{req.description}</p>
                      )}

                      {req.platform && req.platform.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {req.platform.map((p) => (
                            <span key={p} className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700/50 capitalize">{p}</span>
                          ))}
                        </div>
                      )}

                      {req.duplicateOfId && (
                        <div className="text-xs text-slate-500 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
                          Duplicate of: <span className="text-slate-300 font-mono">{req.duplicateOfId}</span>
                        </div>
                      )}

                      {actionError && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {actionError}
                        </div>
                      )}

                      {req.status === 'pending' && (
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="text-xs text-slate-400 mb-1.5 block">Admin Notes <span className="text-slate-600">(optional for approve, required for reject)</span></label>
                            <input
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              className={inputCls}
                              placeholder="Notes..."
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleReview(req.id, 'approve')}
                              disabled={reviewingId === req.id}
                              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                            >
                              {reviewingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(req.id, 'reject')}
                              disabled={reviewingId === req.id}
                              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/25 transition-colors disabled:opacity-50"
                            >
                              {reviewingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              Reject
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              value={duplicateOf}
                              onChange={(e) => setDuplicateOf(e.target.value)}
                              className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                              placeholder="Original request ID..."
                            />
                            <button
                              onClick={() => handleMarkDuplicate(req.id)}
                              disabled={duplicatingId === req.id}
                              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-700/60 border border-slate-600/50 text-slate-300 text-sm hover:bg-slate-700 transition-colors disabled:opacity-50 shrink-0"
                            >
                              {duplicatingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                              Mark Duplicate
                            </button>
                          </div>
                        </div>
                      )}

                      {req.adminNotes && (
                        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs text-slate-400">
                          <span className="text-slate-500 font-medium">Admin Notes: </span>{req.adminNotes}
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
