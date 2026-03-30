import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Trophy,
  CalendarDays,
  UserCheck,
  Search,
  CheckSquare,
  X,
  Send,
  Trash2,
} from "lucide-react";
import { organizerService, type TournamentRegistrant } from "../../../services/organizer.service";
import { tournamentService, type Tournament } from "../../../services/tournament.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  registered: "bg-cyan-500/20 text-cyan-300",
  checked_in: "bg-green-500/20 text-green-300",
  pending_payment: "bg-amber-500/20 text-amber-300",
  disqualified: "bg-red-500/20 text-red-300",
  withdrawn: "bg-slate-600/20 text-slate-400",
  cancelled: "bg-slate-600/20 text-slate-400",
  waitlist: "bg-purple-500/20 text-purple-300",
};

function formatDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Registrant Row ───────────────────────────────────────────────────────────

function RegistrantRow({
  registrant,
  onCheckIn,
  onUndoCheckIn,
  isActionLoading,
}: {
  registrant: TournamentRegistrant;
  onCheckIn: (userId: string) => void;
  onUndoCheckIn: (userId: string) => void;
  isActionLoading: boolean;
}) {
  const statusColor =
    STATUS_COLORS[registrant.status] ?? "bg-slate-700/50 text-slate-400";

  return (
    <tr className="border-b border-slate-800 hover:bg-white/2 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {registrant.avatarUrl ? (
            <img
              src={registrant.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-slate-700"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
              {registrant.displayName?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-white">{registrant.displayName}</p>
            <p className="text-xs text-slate-500">@{registrant.username}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-300">{registrant.inGameId}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor}`}>
          {registrant.status.replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">{formatDate(registrant.registeredAt)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {registrant.checkedIn ? (
            <button
              onClick={() => onUndoCheckIn(registrant.userId)}
              disabled={isActionLoading}
              title="Undo check-in"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Undo
            </button>
          ) : (
            <button
              onClick={() => onCheckIn(registrant.userId)}
              disabled={isActionLoading || registrant.status === "disqualified" || registrant.status === "withdrawn"}
              title="Check in player"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-slate-950 disabled:opacity-40 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Check In
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TournamentManage = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrants, setRegistrants] = useState<TournamentRegistrant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasFetched = useRef(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    if (!tournamentId) return;
    setIsLoading(true);
    try {
      const [t, regs] = await Promise.all([
        tournamentService.getTournamentDetail(tournamentId),
        organizerService.getRegistrations(tournamentId),
      ]);
      setTournament(t);
      setRegistrants(regs);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void loadData();
  }, [loadData]);

  const handleCheckIn = async (userId: string) => {
    if (!tournamentId) return;
    setActionLoading(userId);
    try {
      await organizerService.forceCheckIn(tournamentId, userId);
      setRegistrants((prev) =>
        prev.map((r) => (r.userId === userId ? { ...r, checkedIn: true, status: "checked_in" } : r))
      );
      showToast("success", "Player checked in successfully.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Check-in failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUndoCheckIn = async (userId: string) => {
    if (!tournamentId) return;
    setActionLoading(userId);
    try {
      await organizerService.undoCheckIn(tournamentId, userId);
      setRegistrants((prev) =>
        prev.map((r) => (r.userId === userId ? { ...r, checkedIn: false, status: "registered" } : r))
      );
      showToast("success", "Check-in undone.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Undo failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkCheckIn = async () => {
    if (!tournamentId) return;
    const eligible = registrants.filter((r) => !r.checkedIn && r.status === "registered");
    if (eligible.length === 0) {
      showToast("error", "No eligible players to bulk check-in.");
      return;
    }
    setActionLoading("bulk");
    try {
      await organizerService.bulkCheckIn(tournamentId, eligible.map((r) => r.userId));
      setRegistrants((prev) =>
        prev.map((r) =>
          eligible.some((e) => e.userId === r.userId)
            ? { ...r, checkedIn: true, status: "checked_in" }
            : r
        )
      );
      showToast("success", `${eligible.length} players checked in.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Bulk check-in failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async () => {
    if (!tournamentId) return;
    setIsPublishing(true);
    try {
      await organizerService.publishTournament(tournamentId);
      setTournament((prev) => prev ? { ...prev, status: "published" } : prev);
      showToast("success", "Tournament published successfully.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Publish failed.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancel = async () => {
    if (!tournamentId) return;
    setShowCancelConfirm(false);
    setIsCancelling(true);
    try {
      await organizerService.cancelTournament(tournamentId);
      setTournament((prev) => prev ? { ...prev, status: "cancelled" } : prev);
      showToast("success", "Tournament cancelled.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Cancel failed.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDelete = async () => {
    if (!tournamentId) return;
    setShowDeleteConfirm(false);
    try {
      await organizerService.deleteTournament(tournamentId);
      navigate("/auth/organizer/tournaments");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Delete failed.");
    }
  };

  const filteredRegistrants = search
    ? registrants.filter(
        (r) =>
          r.displayName.toLowerCase().includes(search.toLowerCase()) ||
          r.username.toLowerCase().includes(search.toLowerCase()) ||
          r.inGameId.toLowerCase().includes(search.toLowerCase())
      )
    : registrants;

  const checkedInCount = registrants.filter((r) => r.checkedIn).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="px-6 py-6 max-w-5xl mx-auto">
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Tournament not found.</p>
          <button
            onClick={() => navigate("/auth/organizer/tournaments")}
            className="mt-4 text-cyan-400 text-sm hover:underline"
          >
            Back to My Tournaments
          </button>
        </div>
      </div>
    );
  }

  const canPublish = tournament.status === "draft";
  const canCancel = !["completed", "cancelled"].includes(tournament.status);

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-500/15 border border-green-500/30 text-green-300"
              : "bg-red-500/15 border border-red-500/30 text-red-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.msg}
          <button onClick={() => setToast(null)}>
            <X className="w-4 h-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <button
          onClick={() => navigate("/auth/organizer/tournaments")}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors mt-0.5"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-bold text-white truncate">
              {tournament.title}
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full capitalize
              ${tournament.status === "published" || tournament.status === "open"
                ? "bg-green-500/20 text-green-300"
                : tournament.status === "draft"
                ? "bg-slate-600/20 text-slate-400"
                : tournament.status === "cancelled"
                ? "bg-red-500/20 text-red-400"
                : "bg-cyan-500/20 text-cyan-300"
              }`}
            >
              {tournament.status}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            {tournament.game?.name ?? "Unknown Game"} &middot;{" "}
            {tournament.format ?? "Solo"} &middot;{" "}
            {tournament.isFree ? "Free" : `GHS ${(tournament.entryFee / 100).toFixed(2)}`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canPublish && (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-60 transition-colors"
            >
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Publish
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={isCancelling}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Cancel Tournament
            </button>
          )}
          {tournament.status === "draft" && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Total Registrants", value: registrants.length },
          { icon: UserCheck, label: "Checked In", value: checkedInCount },
          {
            icon: Trophy,
            label: "Capacity",
            value: `${tournament.currentCount}/${tournament.maxParticipants}`,
          },
          {
            icon: CalendarDays,
            label: "Starts",
            value: tournament.schedule.tournamentStart
              ? new Date(tournament.schedule.tournamentStart).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "TBD",
          },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <div className="flex items-end gap-2">
              <p className="text-xl font-bold text-white">{value}</p>
              <Icon className="w-4 h-4 text-cyan-400 mb-0.5" />
            </div>
          </div>
        ))}
      </div>

      {/* Participants Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-wrap gap-3">
          <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Participants ({registrants.length})
          </h2>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search players..."
                className="bg-slate-800/60 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors w-44"
              />
            </div>

            {/* Bulk Check-In */}
            <button
              onClick={handleBulkCheckIn}
              disabled={actionLoading === "bulk"}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500 hover:text-slate-950 hover:border-green-500 disabled:opacity-50 transition-colors"
            >
              {actionLoading === "bulk" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckSquare className="w-3.5 h-3.5" />
              )}
              Bulk Check-In
            </button>
          </div>
        </div>

        {filteredRegistrants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm text-slate-500">
              {search ? "No players match your search." : "No players registered yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {["Player", "In-Game ID", "Status", "Registered", "Action"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRegistrants.map((r) => (
                  <RegistrantRow
                    key={r.registrationId}
                    registrant={r}
                    onCheckIn={handleCheckIn}
                    onUndoCheckIn={handleUndoCheckIn}
                    isActionLoading={actionLoading === r.userId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Confirm Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">Cancel Tournament?</h3>
            </div>
            <p className="text-sm text-slate-400">
              This will cancel the tournament and refund all registered players. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Keep Tournament
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-400 transition-colors"
              >
                Cancel Tournament
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">Delete Draft?</h3>
            </div>
            <p className="text-sm text-slate-400">
              This will permanently delete the tournament draft. You cannot recover it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Keep Draft
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentManage;
