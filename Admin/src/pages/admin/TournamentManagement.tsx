import { useCallback, useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  Trophy,
  Filter,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { adminService } from "../../services/admin.service";
import { toast } from "react-toastify";

// ─── Status Badge Helpers ─────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-slate-500/15", text: "text-slate-300" },
  awaiting_deposit: { bg: "bg-amber-500/15", text: "text-amber-300" },
  published: { bg: "bg-blue-500/15", text: "text-blue-300" },
  open: { bg: "bg-emerald-500/15", text: "text-emerald-300" },
  locked: { bg: "bg-amber-500/15", text: "text-amber-300" },
  started: { bg: "bg-orange-500/15", text: "text-orange-300" },
  ongoing: { bg: "bg-orange-500/15", text: "text-orange-300" },
  in_progress: { bg: "bg-orange-500/15", text: "text-orange-300" },
  ready_to_start: { bg: "bg-violet-500/15", text: "text-violet-300" },
  completed: { bg: "bg-slate-600/15", text: "text-slate-400" },
  cancelled: { bg: "bg-red-500/15", text: "text-red-300" },
};

const BLOCKED_STATUSES = new Set([
  "started",
  "ongoing",
  "in_progress",
  "ready_to_start",
]);

// ─── Delete Confirmation Modal ─────────────────────────────────────────────────

function DeleteModal({
  tournament,
  onClose,
  onConfirm,
  loading,
}: {
  tournament: Record<string, unknown> | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}): React.ReactNode {
  if (!tournament) return null;

  const status = String(tournament.status || "");
  const isBlocked = BLOCKED_STATUSES.has(status);
  const title = String(tournament.title || "Tournament");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isBlocked ? "bg-red-500/15" : "bg-red-500/15"
            }`}>
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Tournament</h3>
              <p className="text-xs text-slate-400">{title}</p>
            </div>
          </div>

          {isBlocked && (
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-300">
                Cannot delete {status.replace(/_/g, " ")} tournaments. The tournament is currently active.
              </div>
            </div>
          )}

          {!isBlocked && (
            <p className="text-sm text-slate-400">
              Are you sure you want to permanently delete this tournament? This action cannot be undone.
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            >
              Cancel
            </button>
            {!isBlocked && (
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-40"
              >
                {loading ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Table Row ───────────────────────────────────────────────────────────────────

interface TournamentRow {
  _id: string;
  id?: string;
  title: string;
  status: string;
  organizer_id?: Record<string, unknown>;
  schedule?: { tournament_start?: string };
  currentCount?: number;
  maxParticipants?: number;
  current_count?: number;
  max_participants?: number;
  created_at?: string;
  createdAt?: string;
}

function TournamentRow({
  tournament,
  onDelete,
  deleting,
}: {
  tournament: TournamentRow;
  onDelete: () => void;
  deleting: boolean;
}) {
  const id = tournament._id || tournament.id;
  const status = tournament.status || "unknown";
  const isBlocked = BLOCKED_STATUSES.has(status);
  const currentCount = tournament.currentCount || tournament.current_count || 0;
  const maxParticipants = tournament.maxParticipants || tournament.max_participants || 0;
  const badge = STATUS_BADGE[status] || STATUS_BADGE.draft;

  return (
    <tr className="border-t border-slate-800/40 hover:bg-slate-800/20 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-white">{tournament.title}</p>
          <p className="text-xs text-slate-500">
            {id}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
          {status.replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">
        {currentCount} / {maxParticipants}
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">
        {typeof tournament.organizer_id === "object" && tournament.organizer_id
          ? String((tournament.organizer_id as any).username ?? "Unknown")
          : "Unknown"}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onDelete}
          disabled={isBlocked || deleting}
          title={isBlocked ? "Cannot delete active tournaments" : "Delete tournament"}
          className={`p-2 rounded-lg transition-colors ${
            isBlocked || deleting
              ? "text-slate-600 cursor-not-allowed opacity-50"
              : "text-red-400 hover:bg-red-500/15 hover:text-red-300"
          }`}
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </td>
    </tr>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────────

const TournamentManagement = () => {
  const [tournaments, setTournaments] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await adminService.listTournaments({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        page,
        limit,
      });
      setTournaments(result.data);
      setTotal(result.total);
    } catch (error) {
      toast.error("Failed to load tournaments");
      setTournaments([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDeleteClick = (tournament: Record<string, unknown>) => {
    setDeleteTarget(tournament);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const id = String(deleteTarget._id || deleteTarget.id);
    setIsDeleting(true);
    try {
      const success = await adminService.deleteTournament(id);
      if (success) {
        toast.success("Tournament deleted successfully");
        setDeleteTarget(null);
        await load();
      } else {
        toast.error("Failed to delete tournament");
      }
    } catch (error: any) {
      toast.error(error.message || "Error deleting tournament");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Tournament Management</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage and monitor all tournaments across the platform
        </p>
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {/* Search */}
        <div className="flex-1 relative">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status filter */}
        <div className="sm:w-48 relative">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="awaiting_deposit">Awaiting Deposit</option>
              <option value="published">Published</option>
              <option value="open">Open</option>
              <option value="locked">Locked</option>
              <option value="started">Started</option>
              <option value="ongoing">Ongoing</option>
              <option value="in_progress">In Progress</option>
              <option value="ready_to_start">Ready to Start</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Refresh */}
        <button
          onClick={() => load()}
          disabled={isLoading}
          className="p-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="border border-slate-800/60 rounded-xl overflow-hidden">
        {isLoading && !tournaments.length ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading tournaments…</span>
            </div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Trophy className="w-8 h-8" />
              <span className="text-sm">No tournaments found</span>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-slate-800/40 border-b border-slate-800/60">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-300">Tournament</th>
                    <th className="px-4 py-3 font-semibold text-slate-300">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-300">Players</th>
                    <th className="px-4 py-3 font-semibold text-slate-300">Organizer</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-300">Action</th>
                  </tr>
                </thead>
              </table>
            </div>

            {/* Rows */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody>
                  {tournaments.map((tournament: any) => (
                    <TournamentRow
                      key={tournament._id || tournament.id}
                      tournament={tournament}
                      onDelete={() => handleDeleteClick(tournament)}
                      deleting={!!(
                        isDeleting &&
                        deleteTarget &&
                        (deleteTarget._id === tournament._id ||
                          deleteTarget.id === tournament.id)
                      )}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────── */}
      {tournaments.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Page {page} of {totalPages} ({total} tournaments)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Delete Modal ────────────────────────────────────── */}
      <DeleteModal
        tournament={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />
    </div>
  );
};

export default TournamentManagement;
