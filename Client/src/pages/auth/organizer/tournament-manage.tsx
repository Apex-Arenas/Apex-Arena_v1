import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../../lib/auth-context";
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
  Wallet,
  Circle,
  RefreshCw,
  Play,
  Gavel,
  List,
  ChevronDown,
  Share2,
} from "lucide-react";
import {
  organizerService,
  type EscrowStatusSummary,
  type EscrowWinnerSummary,
  type TournamentRegistrant,
  type WinnerSubmissionInput,
} from "../../../services/organizer.service";
import {
  tournamentService,
  type Tournament,
} from "../../../services/tournament.service";
import { LeagueView } from "../../../components/league/LeagueView";
import { apiGet } from "../../../utils/api.utils";
import { TOURNAMENT_ENDPOINTS } from "../../../config/api.config";
import { showSuccess, showError } from "../../../utils/toast.utils";
import { DateTimePicker } from "../../../components/ui/DateTimePicker";
import {
  BracketView,
  extractBracketRounds,
  type BracketRound,
} from "../../../components/tournament-detail";

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

const ACTIVE_REGISTRANT_STATUSES = new Set([
  "registered",
  "checked_in",
  "pending_payment",
  "waitlist",
]);

const ESCROW_STATUS_COLORS: Record<string, string> = {
  awaiting_organizer_deposit: "bg-amber-500/20 text-amber-300",
  open: "bg-green-500/20 text-green-300",
  locked: "bg-amber-500/20 text-amber-300",
  processing_fees: "bg-cyan-500/20 text-cyan-300",
  tournament_active: "bg-blue-500/20 text-blue-300",
  awaiting_results: "bg-purple-500/20 text-purple-300",
  verifying_winners: "bg-indigo-500/20 text-indigo-300",
  distributing_prizes: "bg-cyan-500/20 text-cyan-300",
  distributing_organizer: "bg-cyan-500/20 text-cyan-300",
  completed: "bg-green-500/20 text-green-300",
  disputed: "bg-red-500/20 text-red-300",
  cancelled: "bg-slate-600/20 text-slate-400",
};

const FINAL_ESCROW_STATUSES = new Set(["completed", "cancelled", "disputed"]);

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

function formatGhsFromPesewas(amount: number): string {
  return `GHS ${(amount / 100).toFixed(2)}`;
}

function normalizeEscrowStatusLabel(status?: string): string {
  if (!status) return "unknown";
  return status.replace(/_/g, " ");
}

type EscrowStageState = "pending" | "active" | "completed";

interface EscrowStageItem {
  key: string;
  label: string;
  hint: string;
  state: EscrowStageState;
  timestamp?: string;
  detail?: string;
}

interface OrganizerBracketMatch {
  id: string;
  round: number;
  roundName?: string;
  matchNumber: number;
  status: string;
  participants: Array<{
    userId?: string;
    inGameId: string;
    score: number;
    result: string;
    isReady: boolean;
  }>;
  scheduledTime?: string;
}

function toFlatBracketMatchRecords(
  payload: unknown,
): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    const hasRoundShape = payload.some(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        Array.isArray((item as Record<string, unknown>).matches),
    );

    if (hasRoundShape) {
      return payload.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const matches = (item as Record<string, unknown>).matches;
        return Array.isArray(matches)
          ? (matches as Record<string, unknown>[])
          : [];
      });
    }

    return payload.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object",
    );
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  return toFlatBracketMatchRecords(record.rounds ?? record.bracket ?? []);
}

function extractOrganizerBracketMatches(
  payload: unknown,
): OrganizerBracketMatch[] {
  const rawMatches = toFlatBracketMatchRecords(payload);

  return rawMatches.map((raw) => {
    const roundCandidate = Number(raw.round ?? raw.round_number ?? 1);
    const schedule = (raw.schedule ?? {}) as Record<string, unknown>;
    const participants = Array.isArray(raw.participants)
      ? (raw.participants as Record<string, unknown>[]).map((p) => ({
          userId: p.user_id as string | undefined,
          inGameId: String(p.in_game_id ?? ""),
          score: Number(p.score ?? 0),
          result: String(p.result ?? "pending"),
          isReady: Boolean(p.is_ready ?? false),
        }))
      : [];

    return {
      id: String(raw._id ?? raw.id ?? ""),
      round:
        Number.isFinite(roundCandidate) && roundCandidate > 0
          ? roundCandidate
          : 1,
      roundName: raw.round_name as string | undefined,
      matchNumber: Number(raw.match_number ?? 0),
      status: String(raw.status ?? "pending"),
      participants,
      scheduledTime: schedule.scheduled_time as string | undefined,
    };
  });
}

function buildEscrowStages(escrow: EscrowStatusSummary): EscrowStageItem[] {
  const status = escrow.status;
  const schedule = escrow.processingSchedule;
  const winnerSubmissions = escrow.winnerSubmissions;
  const organizerDepositAt = escrow.organizerDeposit?.depositedAt;
  const winnersSubmitted = Boolean(escrow.processingSchedule?.winnersSubmitted);
  const prizesDistributed = Boolean(
    escrow.processingSchedule?.prizesDistributed,
  );

  const isStatus = (values: string[]) => values.includes(status);

  const depositState: EscrowStageState =
    status === "awaiting_organizer_deposit" ? "active" : "completed";

  const entriesState: EscrowStageState = isStatus(["open"])
    ? "active"
    : isStatus([
          "locked",
          "processing_fees",
          "tournament_active",
          "awaiting_results",
          "verifying_winners",
          "distributing_prizes",
          "distributing_organizer",
          "completed",
          "disputed",
          "cancelled",
        ])
      ? "completed"
      : "pending";

  const resultsState: EscrowStageState = isStatus([
    "tournament_active",
    "awaiting_results",
  ])
    ? "active"
    : winnersSubmitted ||
        isStatus([
          "verifying_winners",
          "distributing_prizes",
          "distributing_organizer",
          "completed",
        ])
      ? "completed"
      : "pending";

  const verifyState: EscrowStageState =
    status === "verifying_winners"
      ? "active"
      : isStatus(["distributing_prizes", "distributing_organizer", "completed"])
        ? "completed"
        : "pending";

  const prizeState: EscrowStageState =
    status === "distributing_prizes"
      ? "active"
      : prizesDistributed || isStatus(["distributing_organizer", "completed"])
        ? "completed"
        : "pending";

  const organizerState: EscrowStageState =
    status === "distributing_organizer"
      ? "active"
      : status === "completed"
        ? "completed"
        : "pending";

  return [
    {
      key: "deposit",
      label: "Organizer Deposit",
      hint: "Prize pool funding",
      state: depositState,
      timestamp: organizerDepositAt,
      detail:
        depositState === "completed" && !organizerDepositAt
          ? "Completed (timestamp unavailable)"
          : undefined,
    },
    {
      key: "entries",
      label: "Player Entries",
      hint: "Registration and lock",
      state: entriesState,
      timestamp: schedule?.cancellationCutoff,
      detail:
        entriesState === "active"
          ? "Currently accepting entries"
          : entriesState === "completed" && !schedule?.cancellationCutoff
            ? "Closed (timestamp unavailable)"
            : undefined,
    },
    {
      key: "results",
      label: "Results Phase",
      hint: "Await winners",
      state: resultsState,
      timestamp: schedule?.tournamentEnd,
    },
    {
      key: "verify",
      label: "Winner Verification",
      hint: "ID matching checks",
      state: verifyState,
      timestamp: winnerSubmissions?.submittedAt,
      detail:
        winnerSubmissions && winnerSubmissions.allWinnersVerified === false
          ? "Winner verification has unresolved matches"
          : undefined,
    },
    {
      key: "prizes",
      label: "Prize Distribution",
      hint: "Player payout allocation",
      state: prizeState,
      detail:
        prizesDistributed && winnerSubmissions?.totalPrizeDistributedLabel
          ? `Distributed: ${winnerSubmissions.totalPrizeDistributedLabel}`
          : prizesDistributed
            ? "Completed (timestamp unavailable)"
            : undefined,
    },
    {
      key: "organizer",
      label: "Organizer Payout",
      hint: "Final release",
      state: organizerState,
      detail:
        organizerState === "completed"
          ? "Released (timestamp unavailable)"
          : undefined,
    },
  ];
}

function getEscrowStageVisual(state: EscrowStageState): {
  cardClass: string;
  dotClass: string;
  badgeClass: string;
  label: string;
} {
  if (state === "completed") {
    return {
      cardClass:
        "border-emerald-400/35 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-100",
      dotClass: "bg-emerald-300",
      badgeClass:
        "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30",
      label: "Completed",
    };
  }

  if (state === "active") {
    return {
      cardClass:
        "border-cyan-400/35 bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-100",
      dotClass: "bg-cyan-300 animate-pulse",
      badgeClass: "bg-cyan-500/20 text-cyan-200 border border-cyan-400/30",
      label: "In Progress",
    };
  }

  return {
    cardClass: "border-slate-700 bg-slate-900/70 text-slate-300",
    dotClass: "bg-slate-500",
    badgeClass: "bg-slate-800 text-slate-400 border border-slate-700",
    label: "Pending",
  };
}

// ─── Registrant Row ───────────────────────────────────────────────────────────

function RegistrantRow({
  registrant,
  onCheckIn,
  onUndoCheckIn,
  onRemove,
  isActionLoading,
}: {
  registrant: TournamentRegistrant;
  onCheckIn: (userId: string) => void;
  onUndoCheckIn: (userId: string) => void;
  onRemove: (userId: string, displayName: string) => void;
  isActionLoading: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const statusColor =
    STATUS_COLORS[registrant.status] ?? "bg-slate-700/50 text-slate-400";
  const initials = registrant.displayName?.[0]?.toUpperCase() ?? "?";
  const showImg = Boolean(registrant.avatarUrl) && !imgFailed;

  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors group">
      {/* Player */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {showImg ? (
              <img
                src={registrant.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-700 group-hover:ring-slate-600 transition-all"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-cyan-500/30 to-indigo-500/30 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-300">
                {initials}
              </div>
            )}
            {registrant.checkedIn && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {registrant.displayName}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              @{registrant.username}
            </p>
          </div>
        </div>
      </td>
      {/* In-Game ID */}
      <td className="px-5 py-3.5 min-w-36">
        <span className="text-xs font-mono text-slate-300 bg-slate-800/60 px-2 py-1 rounded-md border border-slate-700/50">
          {registrant.inGameId || (
            <span className="text-slate-600 italic">—</span>
          )}
        </span>
      </td>
      {/* Status */}
      <td className="px-5 py-3.5 min-w-36">
        <span
          className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${statusColor}`}
        >
          {registrant.status.replace(/_/g, " ")}
        </span>
      </td>
      {/* Registered */}
      <td className="px-5 py-3.5 min-w-48">
        <span className="text-xs text-slate-500">
          {formatDate(registrant.registeredAt)}
        </span>
      </td>
      {/* Actions */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1.5">
          {registrant.checkedIn ? (
            <button
              onClick={() => onUndoCheckIn(registrant.userId)}
              disabled={isActionLoading}
              title="Undo check-in"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/25 disabled:opacity-50 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Undo
            </button>
          ) : (
            <button
              onClick={() => onCheckIn(registrant.userId)}
              disabled={
                isActionLoading ||
                registrant.status === "disqualified" ||
                registrant.status === "withdrawn"
              }
              title="Check in player"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700/60 hover:bg-emerald-500/15 hover:text-emerald-400 hover:border-emerald-500/25 disabled:opacity-40 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Check In
            </button>
          )}
          {registrant.status !== "disqualified" &&
            registrant.status !== "withdrawn" && (
              <button
                onClick={() =>
                  onRemove(registrant.userId, registrant.displayName)
                }
                disabled={isActionLoading}
                title="Remove player"
                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 disabled:opacity-40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
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
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrants, setRegistrants] = useState<TournamentRegistrant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{
    userId: string;
    displayName: string;
  } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [escrowSummary, setEscrowSummary] =
    useState<EscrowStatusSummary | null>(null);
  const [showWinnersModal, setShowWinnersModal] = useState(false);
  const [isSubmittingWinners, setIsSubmittingWinners] = useState(false);
  const [winnerRows, setWinnerRows] = useState<WinnerSubmissionInput[]>([
    { position: 1, inGameId: "", prizePercentage: 60 },
    { position: 2, inGameId: "", prizePercentage: 30 },
    { position: 3, inGameId: "", prizePercentage: 10 },
  ]);
  const [bracketMatches, setBracketMatches] = useState<OrganizerBracketMatch[]>(
    [],
  );
  const [isRefreshingBracketProgress, setIsRefreshingBracketProgress] =
    useState(false);
  const [bracketRounds, setBracketRounds] = useState<BracketRound[]>([]);
  const [showBracketView, setShowBracketView] = useState(false);
  const [escrowFlowView, setEscrowFlowView] = useState<"single" | "all">(
    "single",
  );
  const [matchActionLoading, setMatchActionLoading] = useState<string | null>(
    null,
  );
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeMatchId, setDisputeMatchId] = useState<string | null>(null);
  const [disputeWinnerId, setDisputeWinnerId] = useState("");
  const [disputeResolution, setDisputeResolution] = useState("");
  const [tournamentResults, setTournamentResults] = useState<Array<
    Record<string, unknown>
  > | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isGeneratingFixtures, setIsGeneratingFixtures] = useState(false);
  const [isAdvancingMatchweek, setIsAdvancingMatchweek] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showRegistrationAlert, setShowRegistrationAlert] = useState(true);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [extendDate, setExtendDate] = useState("");
  const [isExtending, setIsExtending] = useState(false);

  const hasFetched = useRef(false);

  const showToast = (type: "success" | "error", msg: string) => {
    if (type === "success") showSuccess(msg);
    else showError(msg);
  };

  const refreshEscrowSummary = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!tournamentId) return null;

      try {
        const escrow = await organizerService.getEscrowStatus(tournamentId);
        setEscrowSummary(escrow);
        return escrow;
      } catch {
        if (!options?.silent) {
          setEscrowSummary(null);
        }
        return null;
      }
    },
    [tournamentId],
  );

  const loadBracketProgress = useCallback(
    async (tid: string, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsRefreshingBracketProgress(true);
      }

      try {
        const response = await apiGet(
          `${TOURNAMENT_ENDPOINTS.BRACKET}/${tid}/bracket`,
        );

        if (response.success) {
          setBracketMatches(extractOrganizerBracketMatches(response.data));
          setBracketRounds(extractBracketRounds(response.data));
        } else if (!options?.silent) {
          setBracketMatches([]);
          setBracketRounds([]);
        }
      } catch {
        if (!options?.silent) {
          setBracketMatches([]);
        }
      } finally {
        if (!options?.silent) {
          setIsRefreshingBracketProgress(false);
        }
      }
    },
    [],
  );

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

      if (
        t &&
        [
          "locked",
          "ready_to_start",
          "ongoing",
          "awaiting_results",
          "verifying_results",
          "completed",
        ].includes(t.status)
      ) {
        await loadBracketProgress(tournamentId, { silent: true });
      } else {
        setBracketMatches([]);
        setBracketRounds([]);
      }

      if (t && !t.isFree) {
        await refreshEscrowSummary();
      } else {
        setEscrowSummary(null);
      }

      if (t && t.status === "completed") {
        try {
          setIsLoadingResults(true);
          const results =
            await organizerService.getTournamentResults(tournamentId);
          const standings = Array.isArray(results)
            ? (results as Array<Record<string, unknown>>)
            : ((results.standings ?? results.data ?? []) as Array<
                Record<string, unknown>
              >);
          setTournamentResults(standings);
        } catch {
          setTournamentResults(null);
        } finally {
          setIsLoadingResults(false);
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [loadBracketProgress, refreshEscrowSummary, tournamentId]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!tournamentId || !tournament || tournament.isFree) return;

    // If escrow is missing (ESCROW_NOT_FOUND), avoid polling repeatedly.
    if (!escrowSummary) return;

    const escrowStatus = escrowSummary?.status;
    const shouldPoll =
      !escrowStatus || !FINAL_ESCROW_STATUSES.has(escrowStatus);

    if (!shouldPoll) return;

    const intervalId = window.setInterval(() => {
      void refreshEscrowSummary({ silent: true });
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [escrowSummary?.status, refreshEscrowSummary, tournament, tournamentId]);

  const handleCheckIn = async (userId: string) => {
    if (!tournamentId) return;
    setActionLoading(userId);
    try {
      await organizerService.forceCheckIn(tournamentId, userId);
      setRegistrants((prev) =>
        prev.map((r) =>
          r.userId === userId
            ? { ...r, checkedIn: true, status: "checked_in" }
            : r,
        ),
      );
      showToast("success", "Player checked in successfully.");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Check-in failed.",
      );
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
        prev.map((r) =>
          r.userId === userId
            ? { ...r, checkedIn: false, status: "registered" }
            : r,
        ),
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
    const eligible = registrants.filter(
      (r) => !r.checkedIn && r.status === "registered",
    );
    if (eligible.length === 0) {
      showToast("error", "No eligible players to bulk check-in.");
      return;
    }
    setActionLoading("bulk");
    try {
      await organizerService.bulkCheckIn(
        tournamentId,
        eligible.map((r) => r.userId),
      );
      setRegistrants((prev) =>
        prev.map((r) =>
          eligible.some((e) => e.userId === r.userId)
            ? { ...r, checkedIn: true, status: "checked_in" }
            : r,
        ),
      );
      showToast("success", `${eligible.length} players checked in.`);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Bulk check-in failed.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemovePlayer = async () => {
    if (!tournamentId || !removeTarget) return;
    setIsRemoving(true);
    try {
      await organizerService.removePlayer(tournamentId, removeTarget.userId);
      setRegistrants((prev) =>
        prev.filter((r) => r.userId !== removeTarget.userId),
      );
      showSuccess(
        `${removeTarget.displayName} has been removed from the tournament.`,
      );
    } catch (err: any) {
      showError(err.message ?? "Failed to remove player.");
    } finally {
      setIsRemoving(false);
      setRemoveTarget(null);
    }
  };

  const handlePublish = async () => {
    if (!tournamentId) return;
    setIsPublishing(true);
    try {
      const published = await organizerService.publishTournament(tournamentId);
      setTournament((prev) =>
        prev
          ? {
              ...prev,
              ...published,
              status: published.status || prev.status,
            }
          : published,
      );
      showToast(
        "success",
        published.status === "open"
          ? "Tournament published and open for registration."
          : "Tournament published. Complete the prize deposit to open registration.",
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Publish failed.",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleGenerateBracket = async () => {
    if (!tournamentId) return;
    setIsGeneratingBracket(true);
    try {
      await organizerService.generateBracket(tournamentId);
      showToast("success", "Bracket generated successfully.");
      await loadData();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to generate bracket.",
      );
    } finally {
      setIsGeneratingBracket(false);
    }
  };

  const handleGenerateLeagueFixtures = async () => {
    if (!tournamentId) return;
    setIsGeneratingFixtures(true);
    try {
      await tournamentService.generateLeagueFixtures(tournamentId);
      showToast("success", "League fixtures generated successfully.");
      await loadData();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to generate fixtures.",
      );
    } finally {
      setIsGeneratingFixtures(false);
    }
  };

  const handleAdvanceLeagueMatchweek = async () => {
    if (!tournamentId) return;
    setIsAdvancingMatchweek(true);
    try {
      const newWeek =
        await tournamentService.advanceLeagueMatchweek(tournamentId);
      showToast("success", `Advanced to matchweek ${newWeek}.`);
      await loadData();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to advance matchweek.",
      );
    } finally {
      setIsAdvancingMatchweek(false);
    }
  };

  const handleRecalculateStandings = async () => {
    if (!tournamentId) return;
    setIsRecalculating(true);
    try {
      await tournamentService.recalculateLeagueStandings(tournamentId);
      showToast("success", "Standings recalculated.");
      await loadData();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to recalculate.",
      );
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleCancel = async () => {
    if (!tournamentId) return;
    const reason = cancelReason.trim();
    if (reason.length < 5) {
      showToast(
        "error",
        "Please provide a cancellation reason (at least 5 characters).",
      );
      return;
    }
    setShowCancelConfirm(false);
    setIsCancelling(true);
    try {
      await organizerService.cancelTournament(tournamentId, reason);
      setTournament((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
      setCancelReason("");
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

  const handleExtendRegistration = async () => {
    if (!tournamentId || !extendDate) return;
    setIsExtending(true);
    const isoDate = new Date(extendDate).toISOString();
    try {
      await organizerService.updateTournament(tournamentId, {
        registrationEnd: isoDate,
      });
      setTournament((prev) =>
        prev
          ? {
              ...prev,
              schedule: { ...prev.schedule, registrationEnd: isoDate },
            }
          : prev,
      );
      setShowExtendModal(false);
      setExtendDate("");
      showToast("success", "Registration deadline extended successfully.");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to extend registration.",
      );
    } finally {
      setIsExtending(false);
    }
  };

  const handleStartMatch = async (matchId: string) => {
    setMatchActionLoading(matchId);
    try {
      await organizerService.startMatch(matchId);
      showToast("success", "Match started.");
      if (tournamentId)
        await loadBracketProgress(tournamentId, { silent: true });
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to start match.",
      );
    } finally {
      setMatchActionLoading(null);
    }
  };

  const handleCancelMatchById = async (matchId: string) => {
    setMatchActionLoading(matchId);
    try {
      await organizerService.cancelMatchById(matchId);
      showToast("success", "Match cancelled.");
      if (tournamentId)
        await loadBracketProgress(tournamentId, { silent: true });
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to cancel match.",
      );
    } finally {
      setMatchActionLoading(null);
    }
  };

  const handleForfeitMatch = async (
    matchId: string,
    noShowUserId: string,
    inGameId: string,
  ) => {
    setMatchActionLoading(`${matchId}-forfeit`);
    try {
      await organizerService.forfeitMatch(matchId, noShowUserId);
      showToast("success", `Forfeit recorded for ${inGameId}.`);
      if (tournamentId)
        await loadBracketProgress(tournamentId, { silent: true });
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to forfeit match.",
      );
    } finally {
      setMatchActionLoading(null);
    }
  };

  const handleOpenDisputeModal = (matchId: string) => {
    setDisputeMatchId(matchId);
    setDisputeWinnerId("");
    setDisputeResolution("");
    setShowDisputeModal(true);
  };

  const handleResolveDispute = async () => {
    if (
      !disputeMatchId ||
      !disputeWinnerId.trim() ||
      !disputeResolution.trim()
    ) {
      showToast("error", "Winner in-game ID and resolution are required.");
      return;
    }
    setMatchActionLoading(disputeMatchId);
    try {
      await organizerService.resolveDispute(
        disputeMatchId,
        disputeWinnerId.trim(),
        disputeResolution.trim(),
      );
      setShowDisputeModal(false);
      showToast("success", "Dispute resolved.");
      if (tournamentId)
        await loadBracketProgress(tournamentId, { silent: true });
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to resolve dispute.",
      );
    } finally {
      setMatchActionLoading(null);
    }
  };

  const handlePayPrizePool = async () => {
    if (!tournamentId || !tournament) return;

    const requiredPesewas =
      tournament.organizerGrossDeposit ?? tournament.prizePool ?? 0;
    if (requiredPesewas <= 0) {
      showToast("error", "Prize pool amount is not set for this tournament.");
      return;
    }

    const amountGhs = requiredPesewas / 100;
    setIsInitiatingPayment(true);
    try {
      const result = await organizerService.initiateEscrowDeposit(
        tournamentId,
        amountGhs,
      );
      if (!result.authorizationUrl) {
        throw new Error("Payment link was not returned. Please try again.");
      }
      window.location.href = result.authorizationUrl;
    } catch (err) {
      showToast(
        "error",
        err instanceof Error
          ? err.message
          : "Failed to initiate prize deposit.",
      );
      setIsInitiatingPayment(false);
    }
  };

  const handleOpenWinnersModal = () => {
    const distributionByPosition = new Map<number, number>(
      (tournament?.prizeDistribution ?? []).map((item) => [
        item.position,
        item.percentage,
      ]),
    );

    const unresolved = (escrowSummary?.winnerSubmissions?.winners ?? [])
      .filter((winner) => winner.matchStatus !== "matched")
      .sort((a, b) => a.position - b.position);

    let defaults: WinnerSubmissionInput[] = [];

    if (unresolved.length > 0) {
      defaults = unresolved.map((winner) => ({
        position: winner.position,
        inGameId: winner.inGameId,
        prizePercentage: distributionByPosition.get(winner.position) ?? 0,
      }));

      const hasPercentages = defaults.some((row) => row.prizePercentage > 0);
      if (!hasPercentages && defaults.length > 0) {
        const equalShare = Number((100 / defaults.length).toFixed(2));
        defaults = defaults.map((row, index) => {
          if (index === defaults.length - 1) {
            const accumulated = equalShare * (defaults.length - 1);
            return {
              ...row,
              prizePercentage: Number((100 - accumulated).toFixed(2)),
            };
          }

          return {
            ...row,
            prizePercentage: equalShare,
          };
        });
      }
    } else {
      defaults =
        tournament?.prizeDistribution && tournament.prizeDistribution.length > 0
          ? [...tournament.prizeDistribution]
              .sort((a, b) => a.position - b.position)
              .slice(0, 10)
              .map((item) => ({
                position: item.position,
                inGameId: "",
                prizePercentage: item.percentage,
              }))
          : [
              { position: 1, inGameId: "", prizePercentage: 60 },
              { position: 2, inGameId: "", prizePercentage: 30 },
              { position: 3, inGameId: "", prizePercentage: 10 },
            ];
    }

    setWinnerRows(defaults);
    setShowWinnersModal(true);
  };

  const handleWinnerRowChange = (
    index: number,
    key: "inGameId" | "prizePercentage",
    value: string,
  ) => {
    setWinnerRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        if (key === "prizePercentage") {
          const parsed = Number(value);
          return {
            ...row,
            prizePercentage: Number.isFinite(parsed) ? parsed : 0,
          };
        }

        return {
          ...row,
          inGameId: value,
        };
      }),
    );
  };

  const handleSubmitWinners = async () => {
    if (!tournamentId) return;

    if (!canSubmitWinners) {
      showToast(
        "error",
        "Winner submission is only available when escrow is awaiting results or tournament active.",
      );
      return;
    }

    const normalized = winnerRows.map((row) => ({
      ...row,
      inGameId: row.inGameId.trim(),
    }));

    if (normalized.some((row) => row.inGameId.length === 0)) {
      showToast("error", "Each winner must include an in-game ID.");
      return;
    }

    const uniqueIds = new Set(
      normalized.map((row) => row.inGameId.toLowerCase()),
    );
    if (uniqueIds.size !== normalized.length) {
      showToast("error", "Winner in-game IDs must be unique.");
      return;
    }

    const totalPercentage = normalized.reduce(
      (sum, row) => sum + row.prizePercentage,
      0,
    );
    if (Math.abs(totalPercentage - 100) > 0.001) {
      showToast("error", "Prize percentages must add up to 100.");
      return;
    }

    setIsSubmittingWinners(true);
    try {
      await organizerService.submitWinners(tournamentId, normalized);
      setShowWinnersModal(false);
      showToast("success", "Winners submitted successfully.");
      await loadData();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to submit winners.",
      );
    } finally {
      setIsSubmittingWinners(false);
    }
  };

  const activeRegistrants = registrants.filter((r) =>
    ACTIVE_REGISTRANT_STATUSES.has(r.status),
  );

  const filteredRegistrants = search
    ? activeRegistrants.filter(
        (r) =>
          r.displayName.toLowerCase().includes(search.toLowerCase()) ||
          r.username.toLowerCase().includes(search.toLowerCase()) ||
          r.inGameId.toLowerCase().includes(search.toLowerCase()),
      )
    : activeRegistrants;

  const checkedInCount = activeRegistrants.filter((r) => r.checkedIn).length;

  const totalBracketMatches = bracketMatches.length;
  const completedBracketMatches = bracketMatches.filter(
    (match) => match.status === "completed",
  ).length;
  const bracketCompletionPercent =
    totalBracketMatches > 0
      ? Math.round((completedBracketMatches / totalBracketMatches) * 100)
      : 0;

  const bracketRoundStats = Array.from(
    bracketMatches.reduce((acc, match) => {
      const existing = acc.get(match.round) ?? { total: 0, completed: 0 };
      existing.total += 1;
      if (match.status === "completed") {
        existing.completed += 1;
      }
      acc.set(match.round, existing);
      return acc;
    }, new Map<number, { total: number; completed: number }>()),
  )
    .sort(([a], [b]) => a - b)
    .map(([round, stats]) => ({
      round,
      total: stats.total,
      completed: stats.completed,
      done: stats.total > 0 && stats.completed === stats.total,
    }));

  const currentBracketRound =
    bracketRoundStats.find((round) => !round.done) ??
    bracketRoundStats[bracketRoundStats.length - 1] ??
    null;

  const hasBracketGenerated =
    totalBracketMatches > 0 ||
    [
      "ready_to_start",
      "ongoing",
      "awaiting_results",
      "verifying_results",
      "completed",
    ].includes(tournament?.status ?? "");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-2 border-t-cyan-400 animate-spin" />
        </div>
        <p className="text-xs font-medium text-slate-500 tracking-wider uppercase">
          Loading tournament
        </p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-slate-600" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-white">
            Tournament not found
          </p>
          <p className="text-sm text-slate-500 mt-1">
            This tournament may have been deleted or you don't have access.
          </p>
        </div>
        <button
          onClick={() => navigate("/auth/organizer/tournaments")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to My Tournaments
        </button>
      </div>
    );
  }

  const isLeague = tournament.tournamentType === "league";
  const registrationShortfall =
    tournament.status === "open" &&
    tournament.currentCount < tournament.minParticipants &&
    tournament.minParticipants > 0;
  const leagueSettings = tournament.leagueSettings;
  const canPublish = tournament.status === "draft";
  const canGenerateBracket =
    !isLeague && ["locked", "ready_to_start"].includes(tournament.status);
  const canGenerateLeagueFixtures =
    isLeague &&
    !leagueSettings?.fixturesGenerated &&
    !["draft", "cancelled", "completed"].includes(tournament.status);
  const canAdvanceMatchweek =
    isLeague &&
    leagueSettings?.fixturesGenerated &&
    leagueSettings.currentMatchweek < leagueSettings.totalMatchweeks;
  const canCancel = !["completed", "cancelled"].includes(tournament.status);
  const canDepositPrizePool =
    tournament.status === "awaiting_deposit" && !tournament.isFree;
  const canSubmitWinners =
    escrowSummary !== null &&
    ["awaiting_results", "tournament_active"].includes(escrowSummary.status);
  const disputedWinners = (
    escrowSummary?.winnerSubmissions?.winners ?? []
  ).filter((winner: EscrowWinnerSummary) => winner.matchStatus !== "matched");
  const canOpenWinnersModal = canSubmitWinners || disputedWinners.length > 0;
  const escrowStages = escrowSummary ? buildEscrowStages(escrowSummary) : [];
  const escrowStageCounts = escrowStages.reduce(
    (acc, stage) => {
      acc[stage.state] += 1;
      return acc;
    },
    { completed: 0, active: 0, pending: 0 } as Record<EscrowStageState, number>,
  );
  const escrowCompletionPercent =
    escrowStages.length > 0
      ? Math.round((escrowStageCounts.completed / escrowStages.length) * 100)
      : 0;
  const focusedEscrowStage =
    escrowStages.find((stage) => stage.state === "active") ??
    escrowStages.find((stage) => stage.state === "pending") ??
    escrowStages[escrowStages.length - 1] ??
    null;
  const visibleEscrowStages =
    escrowFlowView === "all"
      ? escrowStages
      : focusedEscrowStage
        ? [focusedEscrowStage]
        : [];
  const escrowNeedsAttention =
    escrowSummary !== null &&
    ["disputed", "cancelled"].includes(escrowSummary.status);

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-slate-800/80 bg-slate-900">
        {/* Glows */}
        <div className="absolute -top-24 -right-24 w-125 h-[500px] rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-1/3 w-[500px] h-64 rounded-full bg-cyan-500/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />
        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[48px_48px]" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-linear-to-r from-transparent via-slate-600/40 to-transparent pointer-events-none" />

        <div className="relative px-6 pt-8 pb-7 sm:px-10 sm:pt-10 sm:pb-8 space-y-7">
          {/* Back + title + actions row */}
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate("/auth/organizer/tournaments")}
              className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-slate-700/60 transition-all mt-0.5"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight truncate min-w-0">
                      {tournament.title}
                    </h1>
                    <span
                      className={`shrink-0 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide ${
                        tournament.status === "open"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/25"
                          : tournament.status === "awaiting_deposit" ||
                              tournament.status === "published"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/25"
                            : tournament.status === "draft"
                              ? "bg-slate-600/20 text-slate-400 border border-slate-600/25"
                              : tournament.status === "cancelled"
                                ? "bg-red-500/20 text-red-400 border border-red-500/25"
                                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/25"
                      }`}
                    >
                      {tournament.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-2 flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-300">
                      {tournament.game?.name ?? "Unknown Game"}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                    <span>{tournament.format ?? "Solo"}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                    <span
                      className={
                        tournament.isFree
                          ? "text-emerald-400 font-semibold"
                          : "text-amber-400 font-semibold"
                      }
                    >
                      {tournament.isFree
                        ? "Free Entry"
                        : `GHS ${(tournament.entryFee / 100).toFixed(2)}`}
                    </span>
                  </p>
                  {/* Fixtures Generated badge */}
                  {leagueSettings?.fixturesGenerated &&
                    !canGenerateLeagueFixtures && (
                      <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Fixtures Generated
                        {leagueSettings?.currentMatchweek != null &&
                          leagueSettings?.totalMatchweeks != null && (
                            <span className="text-emerald-400/70">
                              · Wk {leagueSettings.currentMatchweek}/
                              {leagueSettings.totalMatchweeks}
                            </span>
                          )}
                      </span>
                    )}
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap sm:shrink-0 sm:justify-end">
                  {canPublish && (
                    <button
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-xs sm:text-sm font-bold hover:shadow-lg hover:shadow-orange-500/20 disabled:opacity-60 transition-all"
                    >
                      {isPublishing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Publish
                    </button>
                  )}
                  {canGenerateLeagueFixtures && (
                    <button
                      onClick={() => {
                        void handleGenerateLeagueFixtures();
                      }}
                      disabled={isGeneratingFixtures}
                      className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-indigo-500 text-white text-xs sm:text-sm font-bold hover:bg-indigo-400 disabled:opacity-60 transition-colors"
                    >
                      {isGeneratingFixtures ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <List className="w-3.5 h-3.5" />
                      )}
                      {isGeneratingFixtures
                        ? "Generating…"
                        : "Generate Fixtures"}
                    </button>
                  )}
                  {leagueSettings?.fixturesGenerated && (
                    <button
                      onClick={() => {
                        void handleRecalculateStandings();
                      }}
                      disabled={isRecalculating}
                      title="Force-recalculate the league table from all completed matches"
                      className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-slate-700 text-slate-300 text-xs sm:text-sm font-medium hover:border-slate-500 hover:text-white disabled:opacity-60 transition-colors"
                    >
                      {isRecalculating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {isRecalculating
                          ? "Recalculating…"
                          : "Recalculate Table"}
                      </span>
                      <span className="sm:hidden">
                        {isRecalculating ? "Recalculating…" : "Recalculate"}
                      </span>
                    </button>
                  )}
                  {canAdvanceMatchweek && (
                    <button
                      onClick={() => {
                        void handleAdvanceLeagueMatchweek();
                      }}
                      disabled={isAdvancingMatchweek}
                      className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs sm:text-sm font-bold hover:bg-cyan-400 disabled:opacity-60 transition-colors"
                    >
                      {isAdvancingMatchweek ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {isAdvancingMatchweek
                          ? "Advancing…"
                          : leagueSettings?.legs === 2
                            ? `Advance to Week ${(leagueSettings?.currentMatchweek ?? 0) + 1} – ${(leagueSettings?.currentMatchweek ?? 0) + 2}`
                            : `Advance to Week ${(leagueSettings?.currentMatchweek ?? 0) + 1}`}
                      </span>
                      <span className="sm:hidden">
                        {isAdvancingMatchweek
                          ? "Advancing…"
                          : leagueSettings?.legs === 2
                            ? `Wk ${(leagueSettings?.currentMatchweek ?? 0) + 1}/${(leagueSettings?.currentMatchweek ?? 0) + 2}`
                            : `Wk ${(leagueSettings?.currentMatchweek ?? 0) + 1}`}
                      </span>
                    </button>
                  )}
                  {(canGenerateBracket || hasBracketGenerated) && (
                    <button
                      onClick={() => {
                        if (!hasBracketGenerated) void handleGenerateBracket();
                      }}
                      disabled={isGeneratingBracket || hasBracketGenerated}
                      className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-60 ${
                        hasBracketGenerated
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                          : "bg-indigo-500 text-white hover:bg-indigo-400"
                      }`}
                    >
                      {isGeneratingBracket ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : hasBracketGenerated ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Trophy className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {isGeneratingBracket
                          ? "Generating…"
                          : hasBracketGenerated
                            ? "Bracket Generated"
                            : "Generate Bracket"}
                      </span>
                      <span className="sm:hidden">
                        {isGeneratingBracket
                          ? "Generating…"
                          : hasBracketGenerated
                            ? "Generated"
                            : "Gen Bracket"}
                      </span>
                    </button>
                  )}
                  {canDepositPrizePool && (
                    <button
                      onClick={() => {
                        void handlePayPrizePool();
                      }}
                      disabled={isInitiatingPayment}
                      className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-amber-500 text-slate-950 text-xs sm:text-sm font-bold hover:bg-amber-400 disabled:opacity-60 transition-colors"
                    >
                      {isInitiatingPayment ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wallet className="w-3.5 h-3.5" />
                      )}
                      Pay Prize Pool
                    </button>
                  )}
                  {canOpenWinnersModal && (
                    <button
                      onClick={handleOpenWinnersModal}
                      className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-indigo-500 text-white text-xs sm:text-sm font-bold hover:bg-indigo-400 transition-colors"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      {canSubmitWinners ? "Submit Winners" : "Review Winners"}
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={isCancelling}
                      className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-red-500/30 text-red-400 text-xs sm:text-sm font-medium hover:bg-red-500/10 hover:border-red-500/50 disabled:opacity-60 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/tournaments/${tournament.id}`;
                      if (navigator.share) {
                        void navigator.share({ title: tournament.title, url });
                      } else {
                        void navigator.clipboard.writeText(url);
                        showSuccess("Link copied to clipboard");
                      }
                    }}
                    title="Share tournament"
                    className="p-1.5 sm:p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  {tournament.status === "draft" && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-1.5 sm:p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <button
            onClick={() => setStatsOpen((o) => !o)}
            className="sm:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-700/50 bg-slate-800/40 text-xs font-semibold text-slate-300 hover:border-slate-600 transition-all"
          >
            <span>Tournament Stats</span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${statsOpen ? "rotate-180" : ""}`}
            />
          </button>
          <div
            className={`grid grid-cols-2 sm:grid-cols-4 gap-3 sm:mt-0 ${statsOpen ? "mt-2" : "hidden sm:grid"}`}
          >
            {[
              {
                icon: Users,
                label: "Registrants",
                value: String(activeRegistrants.length),
                accent: "text-white",
                iconBg: "bg-slate-700/60 border-slate-600/50",
                glow: "",
              },
              {
                icon: UserCheck,
                label: "Checked In",
                value: String(checkedInCount),
                accent: "text-emerald-400",
                iconBg: "bg-emerald-500/15 border-emerald-500/25",
                glow: "hover:border-emerald-500/30",
              },
              {
                icon: Trophy,
                label: "Capacity",
                value: `${tournament.currentCount}/${tournament.maxParticipants}`,
                accent: "text-cyan-400",
                iconBg: "bg-cyan-500/15 border-cyan-500/25",
                glow: "hover:border-cyan-500/30",
              },
              {
                icon: CalendarDays,
                label: "Starts",
                value: tournament.schedule.tournamentStart
                  ? new Date(
                      tournament.schedule.tournamentStart,
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "TBD",
                accent: "text-orange-400",
                iconBg: "bg-orange-500/15 border-orange-500/25",
                glow: "hover:border-orange-500/30",
              },
            ].map(({ icon: Icon, label, value, accent, iconBg, glow }) => (
              <div
                key={label}
                className={`flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-2xl px-5 py-4 transition-colors ${glow}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}
                >
                  <Icon className={`w-5 h-5 ${accent}`} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    {label}
                  </p>
                  <p
                    className={`font-display text-2xl font-bold tabular-nums leading-tight mt-0.5 ${accent}`}
                  >
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="px-6 py-6 sm:px-8 space-y-5">
        {/* Registration Shortfall Alert */}
        {registrationShortfall && showRegistrationAlert && (
          <div className="rounded-2xl border border-amber-500/30 bg-linear-to-r from-amber-500/10 to-amber-500/5 p-4 flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-300">
                Registration below minimum
              </p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                {tournament.currentCount} / {tournament.minParticipants} players
                registered. Extend the deadline or close registration.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setShowExtendModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition-colors"
                >
                  Extend Registration
                </button>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300 hover:border-slate-600 transition-colors"
                >
                  Close Tournament
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowRegistrationAlert(false)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 shrink-0 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* League Section (organizer) */}
        {isLeague &&
          !["draft", "cancelled"].includes(tournament.status) &&
          tournament.id && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                    <List className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-bold text-white">
                      League Management
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {leagueSettings?.fixturesGenerated
                        ? `${leagueSettings.legs === 2 ? "Double" : "Single"} leg · ${leagueSettings.totalMatchweeks} matchweeks`
                        : "Fixtures not yet generated"}
                    </p>
                  </div>
                </div>
                {leagueSettings?.fixturesGenerated && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <span className="text-[11px] text-slate-500">Week</span>
                    <span className="text-sm font-bold text-cyan-300 tabular-nums">
                      {leagueSettings.currentMatchweek}
                    </span>
                    <span className="text-slate-600">/</span>
                    <span className="text-sm font-semibold text-white tabular-nums">
                      {leagueSettings.totalMatchweeks}
                    </span>
                  </div>
                )}
              </div>

              {!leagueSettings?.fixturesGenerated ? (
                <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center">
                    <List className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300">
                      Fixtures not generated yet
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {registrants.length} player
                      {registrants.length !== 1 ? "s" : ""} registered.
                      {canGenerateLeagueFixtures
                        ? " Use Generate Fixtures above to build the schedule."
                        : " Complete the registration phase first."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: "Current Week",
                        value: String(leagueSettings.currentMatchweek),
                        accent: "text-cyan-400",
                      },
                      {
                        label: "Total Weeks",
                        value: String(leagueSettings.totalMatchweeks),
                        accent: "text-white",
                      },
                      {
                        label: "Legs",
                        value: String(leagueSettings.legs),
                        accent: "text-white",
                      },
                    ].map(({ label, value, accent }) => (
                      <div
                        key={label}
                        className="rounded-xl bg-slate-800/40 border border-slate-800 px-4 py-3 text-center"
                      >
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                          {label}
                        </p>
                        <p
                          className={`font-display text-xl font-bold tabular-nums ${accent}`}
                        >
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <LeagueView
                    tournamentId={tournament.id}
                    currentMatchweek={leagueSettings.currentMatchweek}
                    totalMatchweeks={leagueSettings.totalMatchweeks}
                    legs={leagueSettings.legs}
                    highlightUserId={user?.id}
                    isOrganizer
                  />
                </div>
              )}
            </div>
          )}

        {(hasBracketGenerated || canGenerateBracket) && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/60">
              <div className="flex items-center gap-3">
                <Trophy className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <h2 className="font-display text-sm font-bold text-white leading-tight">
                    Bracket Progress
                  </h2>
                  {hasBracketGenerated && currentBracketRound && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Round {currentBracketRound.round} active ·{" "}
                      {currentBracketRound.completed}/
                      {currentBracketRound.total} matches done
                    </p>
                  )}
                </div>
              </div>
              {hasBracketGenerated && (
                <div className="flex items-center gap-1.5">
                  {bracketRounds.length > 0 && (
                    <button
                      onClick={() => setShowBracketView((v) => !v)}
                      className="text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1"
                    >
                      {showBracketView ? "Hide" : "View full bracket"}
                    </button>
                  )}
                  {tournamentId && (
                    <button
                      onClick={() => {
                        void loadBracketProgress(tournamentId);
                      }}
                      disabled={isRefreshingBracketProgress}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-40 transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isRefreshingBracketProgress ? "animate-spin" : ""}`}
                      />
                    </button>
                  )}
                </div>
              )}
            </div>

            {hasBracketGenerated ? (
              <div className="px-5 py-5 space-y-5">
                {/* Match summary — two numbers, clean */}
                <div className="flex items-end gap-4">
                  <div>
                    <span className="font-display text-4xl font-black tabular-nums text-white leading-none">
                      {completedBracketMatches}
                    </span>
                    <span className="font-display text-xl font-bold text-slate-600 tabular-nums leading-none">
                      /{totalBracketMatches}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">
                      Matches Completed
                    </p>
                  </div>
                  <div className="mb-5 flex-1">
                    <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          bracketCompletionPercent === 100
                            ? "bg-emerald-400"
                            : "bg-cyan-500"
                        }`}
                        style={{ width: `${bracketCompletionPercent}%` }}
                      />
                    </div>
                    <p className="text-right text-[11px] font-bold tabular-nums mt-1 text-slate-500">
                      {bracketCompletionPercent}%
                    </p>
                  </div>
                </div>

                {/* Round progression — connected horizontal steps */}
                {bracketRoundStats.length > 0 && (
                  <div className="flex items-start gap-0 overflow-x-auto pb-1">
                    {bracketRoundStats.map((round, i) => {
                      const isActive =
                        !round.done &&
                        (i === 0 || bracketRoundStats[i - 1].done);
                      const isDone = round.done;
                      return (
                        <div
                          key={round.round}
                          className="flex items-center shrink-0"
                        >
                          <div className="flex flex-col items-center gap-1.5 px-2">
                            {/* Node */}
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                isDone
                                  ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                                  : isActive
                                    ? "bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                                    : "bg-slate-800/80 border-slate-700 text-slate-600"
                              }`}
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <span className="text-[11px] font-bold">
                                  {round.round}
                                </span>
                              )}
                            </div>
                            {/* Label */}
                            <span
                              className={`text-[10px] font-semibold whitespace-nowrap ${
                                isDone
                                  ? "text-emerald-400"
                                  : isActive
                                    ? "text-cyan-400"
                                    : "text-slate-600"
                              }`}
                            >
                              {isDone
                                ? `${round.completed}/${round.total}`
                                : isActive
                                  ? `${round.completed}/${round.total}`
                                  : `0/${round.total}`}
                            </span>
                          </div>
                          {/* Connector */}
                          {i < bracketRoundStats.length - 1 && (
                            <div
                              className={`h-0.5 w-8 shrink-0 mb-4 rounded-full ${
                                bracketRoundStats[i].done
                                  ? "bg-emerald-500/40"
                                  : "bg-slate-800"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {showBracketView && bracketRounds.length > 0 && (
                  <div className="border-t border-slate-800 pt-4">
                    <BracketView rounds={bracketRounds} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center gap-2 px-5">
                <Trophy className="w-7 h-7 text-slate-700" />
                <p className="text-sm text-slate-500">
                  Bracket not generated yet.
                </p>
                <p className="text-xs text-slate-600">
                  Lock registrations and generate the bracket above.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Match Management */}
        {bracketMatches.some((m) => m.id) &&
          ["ongoing", "awaiting_results"].includes(tournament.status) && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                    <Play className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-bold text-white">
                      Match Management
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Start, forfeit, or resolve ongoing matches
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-800/60 border border-slate-700/50 px-2.5 py-1 rounded-full">
                  {bracketMatches.length} match
                  {bracketMatches.length !== 1 ? "es" : ""}
                </span>
              </div>

              <div className="p-3 space-y-2">
                {bracketMatches.map((match) => {
                  const isActioning =
                    matchActionLoading === match.id ||
                    matchActionLoading === `${match.id}-forfeit`;
                  const roundLabel = match.roundName
                    ? match.roundName.replace(/_/g, " ")
                    : `Round ${match.round}`;
                  const matchLabel = match.matchNumber
                    ? `Match #${match.matchNumber}`
                    : "";

                  const MATCH_STATUS_COLORS: Record<string, string> = {
                    pending:
                      "bg-slate-700/50 text-slate-400 border-slate-700/60",
                    scheduled:
                      "bg-amber-500/15 text-amber-300 border-amber-500/25",
                    ongoing: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
                    completed:
                      "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
                    disputed: "bg-red-500/15 text-red-300 border-red-500/25",
                    cancelled:
                      "bg-slate-700/50 text-slate-400 border-slate-700/60",
                  };

                  const borderAccent =
                    match.status === "ongoing"
                      ? "border-cyan-500/20"
                      : match.status === "disputed"
                        ? "border-red-500/20"
                        : "border-slate-800/60";

                  return (
                    <div
                      key={match.id || `${match.round}-${match.matchNumber}`}
                      className={`rounded-xl border bg-slate-800/30 px-4 py-3 flex flex-wrap items-center gap-3 ${borderAccent}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] font-semibold text-slate-500 capitalize">
                            {roundLabel}
                            {matchLabel ? ` · ${matchLabel}` : ""}
                          </span>
                          <span
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${MATCH_STATUS_COLORS[match.status] ?? "bg-slate-700/50 text-slate-400 border-slate-700/60"}`}
                          >
                            {match.status}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white">
                          {match.participants.length === 2
                            ? `${match.participants[0].inGameId || "TBD"} vs ${match.participants[1].inGameId || "TBD"}`
                            : match.participants.length === 1
                              ? match.participants[0].inGameId || "TBD"
                              : "No participants"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {["pending", "scheduled"].includes(match.status) &&
                          match.id && (
                            <button
                              onClick={() => void handleStartMatch(match.id)}
                              disabled={isActioning}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500 hover:text-slate-950 hover:border-cyan-500 disabled:opacity-50 transition-colors"
                            >
                              {isActioning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                              Start
                            </button>
                          )}
                        {match.status === "ongoing" &&
                          match.participants.map((p) =>
                            p.userId ? (
                              <button
                                key={p.userId}
                                onClick={() =>
                                  void handleForfeitMatch(
                                    match.id,
                                    p.userId!,
                                    p.inGameId,
                                  )
                                }
                                disabled={isActioning}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-500 disabled:opacity-50 transition-colors"
                              >
                                {isActioning ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" />
                                )}
                                Forfeit {p.inGameId}
                              </button>
                            ) : null,
                          )}
                        {match.status === "disputed" && match.id && (
                          <button
                            onClick={() => handleOpenDisputeModal(match.id)}
                            disabled={isActioning}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-50 transition-colors"
                          >
                            <Gavel className="w-3.5 h-3.5" />
                            Resolve Dispute
                          </button>
                        )}
                        {["pending", "scheduled", "ongoing"].includes(
                          match.status,
                        ) &&
                          match.id && (
                            <button
                              onClick={() =>
                                void handleCancelMatchById(match.id)
                              }
                              disabled={isActioning}
                              title="Cancel match"
                              className="p-1.5 rounded-lg text-slate-500 border border-slate-700/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/25 disabled:opacity-50 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* Tournament Results */}
        {tournament.status === "completed" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-white">
                    Final Standings
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tournament completed · Prize distribution
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Completed
              </span>
            </div>

            {isLoadingResults ? (
              <div className="flex items-center justify-center py-12 gap-3">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                <span className="text-sm text-slate-500">Loading results…</span>
              </div>
            ) : tournamentResults && tournamentResults.length > 0 ? (
              <div className="p-5 space-y-4">
                {/* Podium cards for top 3 */}
                {tournamentResults.slice(0, 3).length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        pos: 1,
                        color: "from-amber-500/20 to-amber-500/5",
                        border: "border-amber-500/30",
                        badge:
                          "text-amber-300 bg-amber-500/15 border-amber-500/30",
                        medal: "🥇",
                      },
                      {
                        pos: 2,
                        color: "from-slate-400/15 to-slate-400/5",
                        border: "border-slate-500/30",
                        badge:
                          "text-slate-300 bg-slate-500/15 border-slate-500/30",
                        medal: "🥈",
                      },
                      {
                        pos: 3,
                        color: "from-orange-600/15 to-orange-600/5",
                        border: "border-orange-500/25",
                        badge:
                          "text-orange-300 bg-orange-500/10 border-orange-500/25",
                        medal: "🥉",
                      },
                    ].map(({ pos, color, border, badge, medal }) => {
                      const entry =
                        tournamentResults.find(
                          (e) =>
                            Number(e.position ?? e.final_placement) === pos,
                        ) ?? tournamentResults[pos - 1];
                      if (!entry) return null;
                      return (
                        <div
                          key={pos}
                          className={`rounded-xl border bg-linear-to-b ${color} ${border} p-3 text-center`}
                        >
                          <div className="text-2xl mb-1">{medal}</div>
                          <p className="text-xs font-bold text-white truncate">
                            {String(
                              entry.in_game_id ??
                                entry.inGameId ??
                                entry.username ??
                                "—",
                            )}
                          </p>
                          <p
                            className={`text-[11px] font-semibold mt-1 px-2 py-0.5 rounded-full border inline-block ${badge}`}
                          >
                            {entry.prize_amount_ghs
                              ? `GHS ${String(entry.prize_amount_ghs)}`
                              : entry.prize_percentage
                                ? `${String(entry.prize_percentage)}%`
                                : "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Rest of standings */}
                {tournamentResults.length > 3 && (
                  <div className="rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-800/60 bg-slate-950/20">
                          {["#", "Player", "Prize"].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tournamentResults.slice(3).map((entry, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-slate-800/40 last:border-b-0 hover:bg-slate-800/20 transition-colors"
                          >
                            <td className="px-4 py-2.5 text-sm font-bold text-slate-400">
                              #
                              {String(
                                entry.position ??
                                  entry.final_placement ??
                                  idx + 4,
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-sm font-medium text-white">
                              {String(
                                entry.in_game_id ??
                                  entry.inGameId ??
                                  entry.username ??
                                  "—",
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-slate-400">
                              {entry.prize_amount_ghs
                                ? `GHS ${String(entry.prize_amount_ghs)}`
                                : entry.prize_percentage
                                  ? `${String(entry.prize_percentage)}%`
                                  : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-400">
                  No results recorded yet
                </p>
              </div>
            )}
          </div>
        )}

        <div
          className={`grid gap-5 ${
            !tournament.isFree && escrowSummary ? "xl:grid-cols-12" : ""
          }`}
        >
          {!tournament.isFree && escrowSummary && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden xl:col-span-4 xl:order-2 xl:sticky xl:top-24 self-start">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-bold text-white">
                      Escrow
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Auto-refreshes every 10s
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize ${ESCROW_STATUS_COLORS[escrowSummary.status] ?? "bg-slate-700/50 text-slate-300 border-slate-700"}`}
                >
                  {normalizeEscrowStatusLabel(escrowSummary.status)}
                </span>
              </div>

              <div className="p-4 space-y-4">
                {/* Money stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-800/40 border border-slate-800 px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                      Players
                    </p>
                    <p className="font-display text-lg font-bold text-white tabular-nums">
                      {escrowSummary.playerEntries?.totalPlayers ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-800/40 border border-slate-800 px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                      Pool
                    </p>
                    <p className="font-display text-lg font-bold text-white tabular-nums">
                      {formatGhsFromPesewas(
                        escrowSummary.playerEntries?.totalCollected ?? 0,
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-800/40 border border-slate-800 px-3 py-2.5 col-span-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                      Organizer Deposit
                    </p>
                    <p className="font-display text-lg font-bold text-white tabular-nums">
                      {formatGhsFromPesewas(
                        escrowSummary.organizerDeposit?.grossAmount ?? 0,
                      )}
                    </p>
                  </div>
                </div>

                {/* Milestone pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    {
                      label: "Winners Submitted",
                      done: Boolean(
                        escrowSummary.processingSchedule?.winnersSubmitted,
                      ),
                    },
                    {
                      label: "Prizes Distributed",
                      done: Boolean(
                        escrowSummary.processingSchedule?.prizesDistributed,
                      ),
                    },
                  ].map(({ label, done }) => (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${done ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-slate-800/60 border-slate-700/50 text-slate-500"}`}
                    >
                      {done && <CheckCircle2 className="w-3 h-3" />}
                      {label}
                    </span>
                  ))}
                </div>

                {/* Completion */}
                <div className="rounded-xl bg-slate-800/40 border border-slate-800 px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Settlement
                    </p>
                    <p
                      className={`text-sm font-bold tabular-nums ${escrowCompletionPercent === 100 ? "text-emerald-400" : "text-white"}`}
                    >
                      {escrowCompletionPercent}%
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-cyan-400 via-emerald-400 to-emerald-300 transition-all duration-500"
                      style={{ width: `${escrowCompletionPercent}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px] font-semibold text-center">
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-emerald-300">
                      {escrowStageCounts.completed} done
                    </div>
                    <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 text-cyan-300">
                      {escrowStageCounts.active} live
                    </div>
                    <div className="rounded-lg bg-slate-800 border border-slate-700/50 px-2 py-1 text-slate-400">
                      {escrowStageCounts.pending} waiting
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-800/40 border border-slate-800 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Settlement Flow
                    </p>
                    <select
                      value={escrowFlowView}
                      onChange={(event) =>
                        setEscrowFlowView(
                          event.target.value as "single" | "all",
                        )
                      }
                      className="text-[11px] rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="single">Current Step</option>
                      <option value="all">All Steps</option>
                    </select>
                  </div>

                  <p className="text-[11px] text-slate-600 mb-3">
                    {escrowFlowView === "all"
                      ? `All ${escrowStages.length} steps`
                      : focusedEscrowStage
                        ? `Step ${escrowStages.findIndex((stage) => stage.key === focusedEscrowStage.key) + 1} of ${escrowStages.length}`
                        : "No steps available"}
                  </p>

                  <div className="space-y-2">
                    {visibleEscrowStages.map((stage, index) => {
                      const originalIndex = escrowStages.findIndex(
                        (item) => item.key === stage.key,
                      );
                      const visual = getEscrowStageVisual(stage.state);
                      const connectorClass =
                        stage.state === "completed"
                          ? "bg-emerald-400/60"
                          : stage.state === "active"
                            ? "bg-cyan-400/60"
                            : "bg-slate-700";

                      return (
                        <div key={stage.key} className="relative pl-8">
                          {index < visibleEscrowStages.length - 1 && (
                            <span
                              className={`absolute left-2.25 top-5 -bottom-3 w-px ${connectorClass}`}
                            />
                          )}

                          <span
                            className={`absolute left-0 top-1 w-5 h-5 rounded-full border flex items-center justify-center ${visual.badgeClass}`}
                          >
                            {stage.state === "completed" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : stage.state === "active" ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Circle className="w-3 h-3" />
                            )}
                          </span>

                          <div
                            className={`rounded-lg border px-3 py-2 transition-colors ${visual.cardClass}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-white/95">
                                {originalIndex + 1}. {stage.label}
                              </p>
                              <span className="text-[10px] uppercase tracking-wide opacity-80">
                                {visual.label}
                              </span>
                            </div>
                            <p className="text-[11px] mt-1 opacity-85">
                              {stage.hint}
                            </p>
                            {stage.timestamp && (
                              <p className="text-[11px] mt-1 opacity-80">
                                {formatDate(stage.timestamp)}
                              </p>
                            )}
                            {!stage.timestamp && stage.detail && (
                              <p className="text-[11px] mt-1 opacity-80">
                                {stage.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {escrowNeedsAttention && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-red-500/25 bg-red-500/8 px-3 py-2.5 flex gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300">
                        <span className="font-semibold">
                          Needs attention ·{" "}
                        </span>
                        {disputedWinners.length > 0
                          ? "Some winner IDs could not be matched."
                          : `Status: ${normalizeEscrowStatusLabel(escrowSummary.status)}. Check payment flow.`}
                      </p>
                    </div>

                    {disputedWinners.length > 0 && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
                        <div className="px-3 py-2 text-[11px] font-bold text-red-400 border-b border-red-500/15 uppercase tracking-widest">
                          Unmatched Winners ({disputedWinners.length})
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-500 border-b border-red-500/10">
                                <th className="px-3 py-2 text-left font-semibold">
                                  #
                                </th>
                                <th className="px-3 py-2 text-left font-semibold">
                                  In-Game ID
                                </th>
                                <th className="px-3 py-2 text-left font-semibold">
                                  Match
                                </th>
                                <th className="px-3 py-2 text-left font-semibold">
                                  Prize
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {disputedWinners.map((winner) => (
                                <tr
                                  key={`${winner.position}-${winner.inGameId}`}
                                  className="border-b border-red-500/8 last:border-b-0"
                                >
                                  <td className="px-3 py-2 font-bold text-white">
                                    #{winner.position}
                                  </td>
                                  <td className="px-3 py-2 text-slate-200">
                                    {winner.inGameId}
                                  </td>
                                  <td className="px-3 py-2 text-amber-300 capitalize">
                                    {winner.matchStatus.replace(/_/g, " ")}
                                  </td>
                                  <td className="px-3 py-2 text-slate-400">
                                    {winner.prizeAmountLabel ?? "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* end p-4 space-y-4 */}
            </div>
          )}

          {/* Participants Table */}
          <div
            className={`rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden ${
              !tournament.isFree && escrowSummary
                ? "xl:col-span-8 xl:order-1"
                : ""
            }`}
          >
            {/* Header */}
            <div className="flex flex-col gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-white leading-tight">
                    Participants
                    <span className="ml-2 text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">
                      {activeRegistrants.length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {activeRegistrants.filter((r) => r.checkedIn).length}{" "}
                    checked in
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search players..."
                    className="w-full sm:w-44 bg-slate-800/60 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 focus:bg-slate-800 transition-colors"
                  />
                </div>
                {/* Bulk Check-In */}
                <button
                  onClick={handleBulkCheckIn}
                  disabled={actionLoading === "bulk"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-500 disabled:opacity-50 transition-colors shrink-0"
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
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-400">
                  {search
                    ? "No players match your search"
                    : "No players registered yet"}
                </p>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="mt-2 text-xs text-cyan-500 hover:text-cyan-400 transition-colors"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-200">
                  <thead>
                    <tr className="border-b border-slate-800/60 bg-slate-950/20">
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Player
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest min-w-36">
                        In-Game ID
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest min-w-36">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest min-w-48">
                        Registered
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrants.map((r) => (
                      <RegistrantRow
                        key={r.registrationId}
                        registrant={r}
                        onCheckIn={handleCheckIn}
                        onUndoCheckIn={handleUndoCheckIn}
                        onRemove={(userId, displayName) =>
                          setRemoveTarget({ userId, displayName })
                        }
                        isActionLoading={actionLoading === r.userId}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        {/* ── End Content ───────────────────────────────────────────────── */}
      </div>

      {/* Extend Registration Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-white">
                    Extend Registration
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Give players more time to register
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExtendModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  New Deadline
                </label>
                <DateTimePicker
                  value={extendDate}
                  onChange={setExtendDate}
                  placeholder="Pick new deadline"
                  minDate={
                    tournament?.schedule.registrationEnd
                      ? new Date(tournament.schedule.registrationEnd)
                      : new Date()
                  }
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2.5">
              <button
                onClick={() => setShowExtendModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendRegistration}
                disabled={!extendDate || isExtending}
                className="flex-1 inline-flex items-center justify-center py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExtending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Extend Deadline"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Winners Modal */}
      {showWinnersModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-white">
                    Submit Winners
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    In-game IDs + prize split per position
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWinnersModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
              {!canSubmitWinners && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 flex gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Escrow is{" "}
                    <span className="font-semibold">
                      {normalizeEscrowStatusLabel(escrowSummary?.status)}
                    </span>
                    . Review IDs here, but submission requires awaiting_results
                    or tournament_active status.
                  </p>
                </div>
              )}
              {winnerRows.map((row, index) => (
                <div
                  key={`${row.position}-${index}`}
                  className="rounded-xl border border-slate-800 bg-slate-800/30 p-3.5 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-[11px] font-bold text-indigo-400">
                      {row.position}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      Position #{row.position}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        In-Game ID
                      </label>
                      <input
                        type="text"
                        value={row.inGameId}
                        onChange={(e) =>
                          handleWinnerRowChange(
                            index,
                            "inGameId",
                            e.target.value,
                          )
                        }
                        placeholder="Winner's ID"
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Prize %
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.prizePercentage}
                        onChange={(e) =>
                          handleWinnerRowChange(
                            index,
                            "prizePercentage",
                            e.target.value,
                          )
                        }
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 pb-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-800/40 border border-slate-800 px-4 py-2.5">
                <span className="text-xs font-semibold text-slate-500">
                  Total
                </span>
                <span
                  className={`text-sm font-bold tabular-nums ${Math.abs(winnerRows.reduce((s, r) => s + r.prizePercentage, 0) - 100) < 0.01 ? "text-emerald-400" : "text-white"}`}
                >
                  {winnerRows
                    .reduce((sum, row) => sum + row.prizePercentage, 0)
                    .toFixed(2)}
                  %
                </span>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowWinnersModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitWinners}
                  disabled={isSubmittingWinners || !canSubmitWinners}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-400 disabled:opacity-60 transition-colors"
                >
                  {isSubmittingWinners ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trophy className="w-4 h-4" />
                  )}
                  {canSubmitWinners ? "Submit Winners" : "Locked"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/60">
            <div className="px-6 pt-6 pb-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    Cancel Tournament?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    All players will be refunded
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                This will cancel the tournament and refund all registered
                players. This action cannot be undone.
              </p>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Reason
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Short reason for participants (min 5 chars)"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 transition-colors resize-none"
                />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2.5">
              <button
                onClick={() => {
                  setShowCancelConfirm(false);
                  setCancelReason("");
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
              >
                Keep Tournament
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 transition-colors"
              >
                Cancel Tournament
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Player Confirm Modal */}
      {removeTarget && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/60">
            <div className="px-6 pt-6 pb-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    Remove Player?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {removeTarget.displayName}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                This player will be removed and their entry fee (if any)
                refunded to their wallet.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-2.5">
              <button
                onClick={() => setRemoveTarget(null)}
                disabled={isRemoving}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 disabled:opacity-50 transition-colors"
              >
                Keep Player
              </button>
              <button
                onClick={handleRemovePlayer}
                disabled={isRemoving}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 disabled:opacity-60 transition-colors"
              >
                {isRemoving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {isRemoving ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/60">
            <div className="px-6 pt-6 pb-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    Delete Draft?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This cannot be undone
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                This will permanently delete the tournament draft. You cannot
                recover it.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-2.5">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors"
              >
                Keep Draft
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Gavel className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-white">
                    Resolve Dispute
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Award winner and add resolution note
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDisputeModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Winner In-Game ID
                </label>
                <input
                  type="text"
                  value={disputeWinnerId}
                  onChange={(e) => setDisputeWinnerId(e.target.value)}
                  placeholder="Winning player's in-game ID"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Resolution Notes
                </label>
                <textarea
                  value={disputeResolution}
                  onChange={(e) => setDisputeResolution(e.target.value)}
                  rows={3}
                  placeholder="Explain the reason for your decision…"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2.5">
              <button
                onClick={() => setShowDisputeModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleResolveDispute()}
                disabled={
                  matchActionLoading === disputeMatchId ||
                  !disputeWinnerId.trim() ||
                  !disputeResolution.trim()
                }
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 disabled:opacity-60 transition-colors"
              >
                {matchActionLoading === disputeMatchId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Gavel className="w-4 h-4" />
                )}
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentManage;
