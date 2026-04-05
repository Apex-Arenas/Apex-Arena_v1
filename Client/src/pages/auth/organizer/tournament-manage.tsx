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
  Wallet,
  Circle,
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
            <p className="text-sm font-medium text-white">
              {registrant.displayName}
            </p>
            <p className="text-xs text-slate-500">@{registrant.username}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-300">
        {registrant.inGameId}
      </td>
      <td className="px-4 py-3">
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor}`}
        >
          {registrant.status.replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">
        {formatDate(registrant.registeredAt)}
      </td>
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
              disabled={
                isActionLoading ||
                registrant.status === "disqualified" ||
                registrant.status === "withdrawn"
              }
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
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
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
  const [escrowFlowView, setEscrowFlowView] = useState<"single" | "all">(
    "single",
  );

  const hasFetched = useRef(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
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

      if (t && !t.isFree) {
        await refreshEscrowSummary();
      } else {
        setEscrowSummary(null);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [refreshEscrowSummary, tournamentId]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!tournamentId || !tournament || tournament.isFree) return;

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
  const canGenerateBracket = ["locked", "ready_to_start"].includes(
    tournament.status,
  );
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
              ${
                tournament.status === "open"
                  ? "bg-green-500/20 text-green-300"
                  : tournament.status === "awaiting_deposit" ||
                      tournament.status === "published"
                    ? "bg-amber-500/20 text-amber-300"
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
            {tournament.isFree
              ? "Free"
              : `GHS ${(tournament.entryFee / 100).toFixed(2)}`}
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
              {isPublishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Publish
            </button>
          )}
          {canGenerateBracket && (
            <button
              onClick={() => {
                void handleGenerateBracket();
              }}
              disabled={isGeneratingBracket}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 disabled:opacity-60 transition-colors"
            >
              {isGeneratingBracket ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trophy className="w-4 h-4" />
              )}
              Generate Bracket
            </button>
          )}
          {canDepositPrizePool && (
            <button
              onClick={() => {
                void handlePayPrizePool();
              }}
              disabled={isInitiatingPayment}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 disabled:opacity-60 transition-colors"
            >
              {isInitiatingPayment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wallet className="w-4 h-4" />
              )}
              Pay Prize Pool
            </button>
          )}
          {canOpenWinnersModal && (
            <button
              onClick={handleOpenWinnersModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 transition-colors"
            >
              <Trophy className="w-4 h-4" />
              {canSubmitWinners ? "Submit Winners" : "Review Winners"}
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
          {
            icon: Users,
            label: "Total Registrants",
            value: activeRegistrants.length,
          },
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
              ? new Date(
                  tournament.schedule.tournamentStart,
                ).toLocaleDateString("en-US", {
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

      <div
        className={`grid gap-4 ${
          !tournament.isFree && escrowSummary ? "xl:grid-cols-12" : ""
        }`}
      >
        {!tournament.isFree && escrowSummary && (
          <div className="rounded-xl border border-slate-800/90 bg-linear-to-b from-slate-900/80 via-slate-900/65 to-slate-950/65 p-4 space-y-4 xl:col-span-4 xl:order-2 xl:sticky xl:top-24 self-start">
            <div className="rounded-lg border border-slate-700/80 bg-slate-900/75 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    Escrow Progress
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Live settlement view. Auto-refreshes every 10s while active.
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full capitalize ${
                    ESCROW_STATUS_COLORS[escrowSummary.status] ??
                    "bg-slate-700 text-slate-300"
                  }`}
                >
                  {normalizeEscrowStatusLabel(escrowSummary.status)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
                <p className="text-[11px] text-slate-500 mb-1">
                  Players In Escrow
                </p>
                <p className="font-semibold text-white text-lg leading-none">
                  {escrowSummary.playerEntries?.totalPlayers ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
                <p className="text-[11px] text-slate-500 mb-1">Player Pool</p>
                <p className="font-semibold text-white text-lg leading-none">
                  {formatGhsFromPesewas(
                    escrowSummary.playerEntries?.totalCollected ?? 0,
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 col-span-2">
                <p className="text-[11px] text-slate-500 mb-1">
                  Organizer Deposit
                </p>
                <p className="font-semibold text-white text-lg leading-none">
                  {formatGhsFromPesewas(
                    escrowSummary.organizerDeposit?.grossAmount ?? 0,
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
              <span
                className={`px-2 py-0.5 rounded-full border ${
                  escrowSummary.processingSchedule?.winnersSubmitted
                    ? "border-green-500/40 text-green-300"
                    : "border-slate-700 text-slate-400"
                }`}
              >
                Winners Submitted
              </span>
              <span
                className={`px-2 py-0.5 rounded-full border ${
                  escrowSummary.processingSchedule?.prizesDistributed
                    ? "border-green-500/40 text-green-300"
                    : "border-slate-700 text-slate-400"
                }`}
              >
                Prizes Distributed
              </span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/85 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Settlement Completion
                </p>
                <p className="text-lg font-bold text-emerald-300">
                  {escrowCompletionPercent}%
                </p>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-emerald-200 text-center">
                  {escrowStageCounts.completed} done
                </div>
                <div className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-cyan-200 text-center">
                  {escrowStageCounts.active} live
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-slate-300 text-center">
                  {escrowStageCounts.pending} waiting
                </div>
              </div>

              <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-cyan-400 via-emerald-400 to-emerald-300 transition-all"
                  style={{ width: `${escrowCompletionPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/85 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Settlement Flow
                </p>
                <select
                  value={escrowFlowView}
                  onChange={(event) =>
                    setEscrowFlowView(event.target.value as "single" | "all")
                  }
                  className="text-[11px] rounded-md border border-slate-700 bg-slate-900/90 px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="single">One Step</option>
                  <option value="all">All Steps</option>
                </select>
              </div>

              <p className="text-[11px] text-slate-500 mt-1">
                {escrowFlowView === "all"
                  ? `Showing all ${escrowStages.length} steps`
                  : focusedEscrowStage
                    ? `Showing current step ${escrowStages.findIndex((stage) => stage.key === focusedEscrowStage.key) + 1} of ${escrowStages.length}`
                    : "No settlement steps available"}
              </p>

              <div className="mt-3 space-y-2">
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
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  Escrow needs attention: status is{" "}
                  {normalizeEscrowStatusLabel(escrowSummary.status)}.
                  {disputedWinners.length > 0
                    ? " Some winner IDs could not be matched."
                    : " Check payment/reconciliation flow and resolve before closing the tournament."}
                </div>

                {disputedWinners.length > 0 && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 overflow-hidden">
                    <div className="px-3 py-2 text-xs font-semibold text-red-300 border-b border-red-500/20">
                      Unmatched Winners ({disputedWinners.length})
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-red-500/15">
                            <th className="px-3 py-2 text-left font-medium">
                              Position
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              In-game ID
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Match
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Prize
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {disputedWinners.map((winner) => (
                            <tr
                              key={`${winner.position}-${winner.inGameId}`}
                              className="border-b border-red-500/10 last:border-b-0"
                            >
                              <td className="px-3 py-2 text-white">
                                #{winner.position}
                              </td>
                              <td className="px-3 py-2 text-slate-200">
                                {winner.inGameId}
                              </td>
                              <td className="px-3 py-2 text-amber-300">
                                {winner.matchStatus.replace(/_/g, " ")}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {winner.prizeAmountLabel ?? "-"}
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
        )}

        {/* Participants Table */}
        <div
          className={`rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden ${
            !tournament.isFree && escrowSummary
              ? "xl:col-span-8 xl:order-1"
              : ""
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-wrap gap-3">
            <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Participants ({activeRegistrants.length})
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
                {search
                  ? "No players match your search."
                  : "No players registered yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {[
                      "Player",
                      "In-Game ID",
                      "Status",
                      "Registered",
                      "Action",
                    ].map((h) => (
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
      </div>

      {/* Winners Modal */}
      {showWinnersModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Submit Winners
                </h3>
                <p className="text-xs text-slate-400">
                  Provide in-game IDs and prize percentages for each winning
                  position.
                </p>
              </div>
              <button
                onClick={() => setShowWinnersModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {!canSubmitWinners && (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  Escrow is currently{" "}
                  {normalizeEscrowStatusLabel(escrowSummary?.status)}. You can
                  review and edit IDs here, but submission requires escrow
                  status to be awaiting results or tournament active.
                </div>
              )}

              {winnerRows.map((row, index) => (
                <div
                  key={`${row.position}-${index}`}
                  className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-2"
                >
                  <p className="text-xs font-semibold text-slate-300">
                    Position #{row.position}
                  </p>

                  <label className="block text-xs text-slate-500">
                    In-game ID
                  </label>
                  <input
                    type="text"
                    value={row.inGameId}
                    onChange={(e) =>
                      handleWinnerRowChange(index, "inGameId", e.target.value)
                    }
                    placeholder="Winner in-game ID"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />

                  <label className="block text-xs text-slate-500">
                    Prize percentage
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
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
              Total percentage:{" "}
              <span className="font-semibold text-white">
                {winnerRows
                  .reduce((sum, row) => sum + row.prizePercentage, 0)
                  .toFixed(2)}
                %
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWinnersModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitWinners}
                disabled={isSubmittingWinners || !canSubmitWinners}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 disabled:opacity-60 transition-colors"
              >
                {isSubmittingWinners ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trophy className="w-4 h-4" />
                )}
                {canSubmitWinners ? "Submit Winners" : "Submission Locked"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Cancel Tournament?
              </h3>
            </div>
            <p className="text-sm text-slate-400">
              This will cancel the tournament and refund all registered players.
              This action cannot be undone.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Cancellation reason
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Provide a short reason for participants (min 5 characters)."
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelConfirm(false);
                  setCancelReason("");
                }}
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
              <h3 className="font-display text-lg font-bold text-white">
                Delete Draft?
              </h3>
            </div>
            <p className="text-sm text-slate-400">
              This will permanently delete the tournament draft. You cannot
              recover it.
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
