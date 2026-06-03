import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Lock,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import { adminService, type AdminEscrowInfo } from '../../services/admin.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(pesewas: number) {
  return `GHS ${(pesewas / 100).toFixed(2)}`;
}

function statusColors(status: string): string {
  const map: Record<string, string> = {
    open:             'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    active:           'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    funded:           'bg-blue-500/15 text-blue-300 border-blue-500/30',
    awaiting_deposit: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    locked:           'bg-amber-500/15 text-amber-300 border-amber-500/30',
    processing_fees:  'bg-violet-500/15 text-violet-300 border-violet-500/30',
    distributing:     'bg-violet-500/15 text-violet-300 border-violet-500/30',
    completed:        'bg-slate-700/60 text-slate-300 border-slate-600/30',
    cancelled:        'bg-red-500/15 text-red-300 border-red-500/30',
    pending:          'bg-slate-700/60 text-slate-400 border-slate-600/30',
  };
  return map[status] ?? 'bg-slate-700/60 text-slate-300 border-slate-600/30';
}

function tournamentStatusColors(status: string): string {
  const map: Record<string, string> = {
    open:             'text-emerald-400',
    published:        'text-cyan-400',
    awaiting_deposit: 'text-amber-400',
    locked:           'text-amber-400',
    started:          'text-orange-400',
    completed:        'text-slate-400',
    cancelled:        'text-red-400',
    draft:            'text-slate-500',
  };
  return map[status] ?? 'text-slate-400';
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-800 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TournamentRow {
  id: string;
  name: string;
  status: string;
  entryFee: number;
  fundingType: string;
  currentParticipants: number;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function EscrowManagement() {
  // Tournament list
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PER_PAGE = 20;

  // Selected tournament + escrow details
  const [selected, setSelected] = useState<TournamentRow | null>(null);
  const [escrow, setEscrow] = useState<AdminEscrowInfo | null>(null);
  const [escrowLoading, setEscrowLoading] = useState(false);
  const [escrowError, setEscrowError] = useState('');

  // Actions
  const [cancelling, setCancelling] = useState(false);
  const [runningProcessor, setRunningProcessor] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load tournament list ──────────────────────────────────────────────────

  const loadTournaments = useCallback(async (q: string, s: string, p: number) => {
    setListLoading(true);
    setListError('');
    try {
      const result = await adminService.listTournaments({
        search: q || undefined,
        status: s || undefined,
        page: p,
        limit: PER_PAGE,
      });

      const rows: TournamentRow[] = result.data.map((t) => {
        const cap = (t.capacity as Record<string, unknown>) ?? {};
        return {
          id: String(t._id ?? t.id ?? ''),
          name: String(t.title ?? t.name ?? 'Untitled'),
          status: String(t.status ?? ''),
          entryFee: Number(t.entry_fee ?? 0),
          fundingType: String(t.funding_type ?? t.is_free ? 'free' : 'paid'),
          currentParticipants: Number(cap.current_participants ?? 0),
        };
      });

      setTournaments(rows);
      setTotalPages(Math.max(1, Math.ceil(result.total / PER_PAGE)));
    } catch {
      setListError('Failed to load tournaments.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTournaments(search, statusFilter, page);
  }, [page, statusFilter, loadTournaments]);

  // Debounce search
  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadTournaments(val, statusFilter, 1), 380);
  };

  // ── Load escrow on select ─────────────────────────────────────────────────

  const handleSelect = async (t: TournamentRow) => {
    setSelected(t);
    setEscrow(null);
    setEscrowError('');
    setActionMsg('');
    setActionError('');
    setEscrowLoading(true);
    try {
      const data = await adminService.getAdminEscrowStatus(t.id);
      if (data) setEscrow(data);
      else setEscrowError('No escrow account found for this tournament. It may be a free tournament or not yet funded.');
    } catch {
      setEscrowError('Failed to fetch escrow details.');
    } finally {
      setEscrowLoading(false);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleCancel = async () => {
    if (!escrow) return;
    setCancelling(true);
    setActionError('');
    setActionMsg('');
    const ok = await adminService.cancelEscrow(escrow.tournamentId);
    setCancelling(false);
    if (ok) {
      setActionMsg('Escrow cancelled successfully.');
      if (selected) handleSelect(selected);
    } else {
      setActionError('Failed to cancel escrow.');
    }
  };

  const handleRunProcessor = async () => {
    setRunningProcessor(true);
    setActionError('');
    setActionMsg('');
    const ok = await adminService.runEscrowProcessor();
    setRunningProcessor(false);
    if (ok) setActionMsg('Escrow processor triggered successfully.');
    else setActionError('Failed to run escrow processor.');
  };

  const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'awaiting_deposit', label: 'Awaiting Deposit' },
    { value: 'open', label: 'Open' },
    { value: 'locked', label: 'Locked' },
    { value: 'started', label: 'Started' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="min-h-screen bg-slate-950">

      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <h1 className="text-2xl font-display font-bold text-white">Escrow Management</h1>
                <p className="text-sm text-slate-400 mt-0.5">Select a tournament to inspect and manage its escrow account.</p>
              </div>
            </div>
            <button
              onClick={handleRunProcessor}
              disabled={runningProcessor}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
            >
              {runningProcessor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Escrow Processor
            </button>
          </div>
        </div>
      </div>

      {/* Action feedback */}
      {(actionMsg || actionError) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
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
        </div>
      )}

      {/* Two-panel layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">

          {/* ── LEFT: Tournament list ───────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">

            {/* Search + filter */}
            <div className="p-4 border-b border-slate-800 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search tournaments…"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors [&>option]:bg-slate-800"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-800 max-h-[calc(100vh-280px)] overflow-y-auto">
              {listLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                </div>
              ) : listError ? (
                <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-sm text-red-400">{listError}</p>
                  <button
                    onClick={() => loadTournaments(search, statusFilter, page)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mt-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </div>
              ) : tournaments.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-500">No tournaments found.</p>
                </div>
              ) : (
                tournaments.map((t) => {
                  const isSelected = selected?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelect(t)}
                      className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors group ${
                        isSelected
                          ? 'bg-amber-500/10 border-l-2 border-l-amber-500'
                          : 'hover:bg-slate-800/40 border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-amber-300' : 'text-white group-hover:text-white'}`}>
                          {t.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs capitalize ${tournamentStatusColors(t.status)}`}>
                            {t.status.replace(/_/g, ' ')}
                          </span>
                          {t.entryFee > 0 && (
                            <>
                              <span className="text-slate-700">·</span>
                              <span className="text-xs text-slate-500">{formatGHS(t.entryFee)} entry</span>
                            </>
                          )}
                          {t.entryFee === 0 && (
                            <>
                              <span className="text-slate-700">·</span>
                              <span className="text-xs text-slate-500">Free</span>
                            </>
                          )}
                          <span className="text-slate-700">·</span>
                          <span className="text-xs text-slate-500 flex items-center gap-0.5">
                            <Users className="w-2.5 h-2.5" /> {t.currentParticipants}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-amber-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                    </button>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors"
                >
                  Prev
                </button>
                <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* ── RIGHT: Escrow detail ────────────────────────────────────── */}
          <div>
            {!selected ? (
              <div className="rounded-2xl border border-slate-800 border-dashed bg-slate-900/30 flex flex-col items-center justify-center py-20 px-6 text-center">
                <Lock className="w-8 h-8 text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">Select a tournament from the list to view its escrow account.</p>
              </div>
            ) : escrowLoading ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
              </div>
            ) : escrowError ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
                <h2 className="text-base font-semibold text-white truncate">{selected.name}</h2>
                <div className="flex items-start gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{escrowError}</span>
                </div>
              </div>
            ) : escrow ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-white truncate">{escrow.tournamentName || selected.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{escrow.tournamentId}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize shrink-0 ${statusColors(escrow.status)}`}>
                    {escrow.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800/60">
                  {[
                    { label: 'Net Prize Pool', value: formatGHS(escrow.prizePool) },
                    { label: 'Deposited', value: formatGHS(escrow.depositedAmount) },
                    { label: 'Balance', value: formatGHS(escrow.balance) },
                    { label: 'Currency', value: escrow.currency },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-900/60 px-5 py-4">
                      <p className="text-xs text-slate-500 mb-1">{label}</p>
                      <p className="text-base font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Detail rows */}
                <div className="p-6 space-y-5">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Timeline</p>
                    <InfoRow label="Created" value={escrow.createdAt ? new Date(escrow.createdAt).toLocaleString() : '—'} />
                    <InfoRow label="Last Updated" value={escrow.updatedAt ? new Date(escrow.updatedAt).toLocaleString() : '—'} />
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Tournament</p>
                    <InfoRow label="Name" value={escrow.tournamentName || selected.name} />
                    <InfoRow label="Status" value={
                      <span className={`capitalize text-sm ${tournamentStatusColors(selected.status)}`}>
                        {selected.status.replace(/_/g, ' ')}
                      </span>
                    } />
                    <InfoRow label="Entry Fee" value={selected.entryFee > 0 ? formatGHS(selected.entryFee) : 'Free'} />
                    <InfoRow label="Participants" value={selected.currentParticipants} />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => handleSelect(selected)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" /> Refresh
                    </button>

                    {['pending', 'active', 'funded', 'open', 'awaiting_organizer_deposit'].includes(escrow.status) && (
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/25 disabled:opacity-50 transition-colors"
                      >
                        {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Cancel Escrow
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
