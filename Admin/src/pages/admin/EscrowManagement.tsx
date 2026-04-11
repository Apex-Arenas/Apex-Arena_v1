import { useCallback, useState } from 'react';
import {
  Lock,
  Search,
  Loader2,
  AlertCircle,
  XCircle,
  Play,
  RefreshCw,
} from 'lucide-react';
import { adminService, type AdminEscrowInfo } from '../../services/admin.service';

const inputCls =
  'bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-800 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  );
}

function formatGHS(n: number) {
  return `GHS ${n.toFixed(2)}`;
}

export default function EscrowManagement() {
  const [tournamentId, setTournamentId] = useState('');
  const [escrow, setEscrow] = useState<AdminEscrowInfo | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [cancelling, setCancelling] = useState(false);
  const [runningProcessor, setRunningProcessor] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');

  const handleFetch = useCallback(async () => {
    if (!tournamentId.trim()) return;
    setFetching(true);
    setFetchError('');
    setEscrow(null);
    setActionMsg('');
    setActionError('');
    try {
      const data = await adminService.getAdminEscrowStatus(tournamentId.trim());
      if (data) setEscrow(data);
      else setFetchError('No escrow found for that tournament ID.');
    } catch {
      setFetchError('Failed to fetch escrow status.');
    } finally {
      setFetching(false);
    }
  }, [tournamentId]);

  const handleCancel = async () => {
    if (!escrow) return;
    setCancelling(true);
    setActionError('');
    setActionMsg('');
    const ok = await adminService.cancelEscrow(escrow.tournamentId);
    setCancelling(false);
    if (ok) { setActionMsg('Escrow cancelled successfully.'); handleFetch(); }
    else setActionError('Failed to cancel escrow.');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/15 p-2.5 rounded-xl">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Escrow Management</h1>
            <p className="text-sm text-slate-400">Inspect and manage tournament escrow accounts</p>
          </div>
        </div>
        <button
          onClick={handleRunProcessor}
          disabled={runningProcessor}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {runningProcessor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run Escrow Processor
        </button>
      </div>

      {/* Action feedback */}
      {actionMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
          <RefreshCw className="w-4 h-4" /> {actionMsg}
        </div>
      )}
      {actionError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" /> {actionError}
        </div>
      )}

      {/* Lookup */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Look Up Tournament Escrow</h2>
        <div className="flex gap-3">
          <input
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            className={`flex-1 ${inputCls}`}
            placeholder="Tournament ID..."
          />
          <button
            onClick={handleFetch}
            disabled={fetching || !tournamentId.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Lookup
          </button>
        </div>

        {fetchError && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" /> {fetchError}
          </div>
        )}
      </div>

      {/* Escrow detail */}
      {escrow && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">{escrow.tournamentName || escrow.tournamentId}</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 capitalize">
              {escrow.status}
            </span>
          </div>

          <div>
            <InfoRow label="Prize Pool" value={formatGHS(escrow.prizePool)} />
            <InfoRow label="Deposited" value={formatGHS(escrow.depositedAmount)} />
            <InfoRow label="Balance" value={formatGHS(escrow.balance)} />
            <InfoRow label="Currency" value={escrow.currency} />
            <InfoRow label="Created" value={new Date(escrow.createdAt).toLocaleString()} />
            <InfoRow label="Updated" value={new Date(escrow.updatedAt).toLocaleString()} />
          </div>

          {['pending', 'active', 'funded'].includes(escrow.status) && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Cancel Escrow
            </button>
          )}
        </div>
      )}
    </div>
  );
}
