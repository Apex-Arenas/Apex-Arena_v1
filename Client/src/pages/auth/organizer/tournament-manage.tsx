import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../../lib/auth-context";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Trophy,
  Crown,
  Medal,
  CalendarDays,
  UserCheck,
  Search,
  X,
  Send,
  Trash2,
  Wallet,
  Circle,
  RefreshCw,
  Play,
  Gavel,
  List,
  Share2,
  Pencil,
  UserPlus,
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
import { apiDelete, apiGet, apiPost } from "../../../utils/api.utils";
import { TOURNAMENT_ENDPOINTS, FINANCE_ENDPOINTS } from "../../../config/api.config";
import { showSuccess, showError } from "../../../utils/toast.utils";
import { DateTimePicker } from "../../../components/ui/DateTimePicker";
import {
  BracketView,
  extractBracketRounds,
  getParticipantLabel,
  type BracketRound,
} from "../../../components/tournament-detail";
import { MatchActionModal } from "../../../components/league/MatchActionModal";

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
  bracketPosition?: string;
  status: string;
  participants: Array<{
    userId?: string;
    inGameId: string;
    score: number;
    result: string;
    isReady: boolean;
  }>;
  games?: Array<{ game_number: number; scores?: { participant_id?: string; score?: number }[] }>;
  format?: { best_of?: number };
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
      bracketPosition: raw.bracket_position as string | undefined,
      status: String(raw.status ?? "pending"),
      participants,
      games: Array.isArray(raw.games) ? (raw.games as any[]) : undefined,
      format: raw.format as { best_of?: number } | undefined,
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
      detail: undefined,
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
          : undefined,
    },
    {
      key: "organizer",
      label: "Organizer Payout",
      hint: "Final release",
      state: organizerState,
      detail: undefined,
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
        "border-emerald-400/35 bg-linear-to-br from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-100",
      dotClass: "bg-emerald-300",
      badgeClass:
        "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30",
      label: "Completed",
    };
  }

  if (state === "active") {
    return {
      cardClass:
        "border-cyan-400/35 bg-linear-to-br from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-100",
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

// ─── Shared Avatar ────────────────────────────────────────────────────────────

function PlayerAvatar({
  src,
  name,
  size = "sm",
  ringClass = "ring-2 ring-slate-700",
}: {
  src?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md";
  ringClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name?.[0]?.toUpperCase() ?? "?";
  const sz = size === "xs" ? "w-6 h-6 text-[9px]" : size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        className={`${sz} rounded-full object-cover ${ringClass} shrink-0`}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 border border-slate-700 flex items-center justify-center font-bold text-cyan-300 shrink-0`}>
      {initial}
    </div>
  );
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
  const statusColor =
    STATUS_COLORS[registrant.status] ?? "bg-slate-700/50 text-slate-400";

  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors group">
      {/* Player */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <PlayerAvatar
              src={registrant.avatarUrl}
              name={registrant.displayName}
              size="sm"
              ringClass="ring-2 ring-slate-700 group-hover:ring-slate-600 transition-all"
            />
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
  const [tournamentInfoOpen, setTournamentInfoOpen] = useState(true);
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
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [escrowFlowView, setEscrowFlowView] = useState<"single" | "all">(
    "single",
  );
  const [matchActionLoading, setMatchActionLoading] = useState<string | null>(
    null,
  );
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeMatchId] = useState<string | null>(null);
  const [disputeWinnerId, setDisputeWinnerId] = useState("");
  const [disputeResolution, setDisputeResolution] = useState("");
  const [showSetScoreModal, setShowSetScoreModal] = useState(false);
  const [setScoreTarget, setSetScoreTarget] = useState<OrganizerBracketMatch | null>(null);
  const [setScoreInput, setSetScoreInput] = useState({ score1: "", score2: "", reason: "", penalty1: "", penalty2: "" });
  const [isSettingScore, setIsSettingScore] = useState(false);
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
  const [isAllocatingWinnings, setIsAllocatingWinnings] = useState(false);
  const [isAllocatingEarnings, setIsAllocatingEarnings] = useState(false);
  const [openWinnerDropdown, setOpenWinnerDropdown] = useState<number | null>(null);
  const [winnerDropdownSearch, setWinnerDropdownSearch] = useState("");
  const [emptyWinnerIndices, setEmptyWinnerIndices] = useState<Set<number>>(new Set());

  const [removeCoOrgTarget, setRemoveCoOrgTarget] = useState<{ userId: string; name: string } | null>(null);
  const [isRemovingCoOrg, setIsRemovingCoOrg] = useState(false);

  // Co-organizer state
  interface CoOrganizerEntry {
    user_id: { _id?: string; username?: string; email?: string; profile?: { first_name?: string; last_name?: string; avatar_url?: string } } | string;
    status: "pending" | "accepted" | "declined";
    invited_at: string;
    accepted_at?: string;
  }
  interface OrganizerSearchResult {
    user_id: string;
    username: string;
    email: string;
    name: string;
    avatar_url?: string;
  }
  const [coOrganizers, setCoOrganizers] = useState<CoOrganizerEntry[]>([]);
  const [isLoadingCoOrgs, setIsLoadingCoOrgs] = useState(false);
  const [coOrgSearchResults, setCoOrgSearchResults] = useState<OrganizerSearchResult[]>([]);
  const [isSearchingCoOrg, setIsSearchingCoOrg] = useState(false);
  const [isInvitingCoOrg, setIsInvitingCoOrg] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState("");
  const [coOrgError, setCoOrgError] = useState<string | null>(null);
  const coOrgSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          "open",
          "locked",
          "started",
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
    if (!tournamentId || !tournament) return;
    void loadCoOrganizers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, tournament?.id]);

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

  const loadCoOrganizers = async () => {
    if (!tournamentId) return;
    setIsLoadingCoOrgs(true);
    try {
      const res = await apiGet(`${TOURNAMENT_ENDPOINTS.CO_ORGANIZER_LIST}/${tournamentId}`);
      if (res.success) setCoOrganizers((res.data as CoOrganizerEntry[]) ?? []);
    } catch {
      // silently fail
    } finally {
      setIsLoadingCoOrgs(false);
    }
  };

  const handleCoOrgSearch = (q: string) => {
    setCoOrgError(null);
    if (coOrgSearchTimer.current) clearTimeout(coOrgSearchTimer.current);
    if (!q.trim() || q.trim().length < 2) { setCoOrgSearchResults([]); return; }
    coOrgSearchTimer.current = setTimeout(async () => {
      setIsSearchingCoOrg(true);
      try {
        const res = await apiGet(`${TOURNAMENT_ENDPOINTS.CO_ORGANIZER_SEARCH}?q=${encodeURIComponent(q.trim())}`);
        if (res.success) setCoOrgSearchResults((res.data as OrganizerSearchResult[]) ?? []);
      } catch {
        setCoOrgSearchResults([]);
      } finally {
        setIsSearchingCoOrg(false);
      }
    }, 350);
  };

  const handleInviteCoOrg = async () => {
    if (!tournamentId || !inviteIdentifier.trim()) {
      setCoOrgError("Enter an email or username to invite.");
      return;
    }
    setIsInvitingCoOrg(true);
    setCoOrgError(null);
    try {
      const res = await apiPost(`${TOURNAMENT_ENDPOINTS.CO_ORGANIZER_INVITE}/${tournamentId}/invite`, {
        identifier: inviteIdentifier.trim(),
      });
      if (!res.success) {
        const err = (res as { error?: string | { message?: string } }).error;
        throw new Error(typeof err === "string" ? err : (err as any)?.message ?? "Invite failed.");
      }
      showSuccess("Invite sent successfully.");
      setInviteIdentifier("");
      setCoOrgSearchResults([]);
      await loadCoOrganizers();
    } catch (err) {
      setCoOrgError(err instanceof Error ? err.message : "Invite failed.");
    } finally {
      setIsInvitingCoOrg(false);
    }
  };

  const handleRemoveCoOrg = (targetUserId: string, name: string) => {
    setRemoveCoOrgTarget({ userId: targetUserId, name });
  };

  const confirmRemoveCoOrg = async () => {
    if (!tournamentId || !removeCoOrgTarget) return;
    setIsRemovingCoOrg(true);
    try {
      const res = await apiDelete(`${TOURNAMENT_ENDPOINTS.CO_ORGANIZER_REMOVE}/${tournamentId}/${removeCoOrgTarget.userId}`);
      if (!res.success) {
        const err = (res as { error?: string | { message?: string } }).error;
        throw new Error(typeof err === "string" ? err : (err as any)?.message ?? "Remove failed.");
      }
      showSuccess(`${removeCoOrgTarget.name} removed as co-organizer.`);
      setCoOrganizers((prev) => prev.filter((co) => {
        const id = typeof co.user_id === "string" ? co.user_id : (co.user_id as any)?._id ?? co.user_id;
        return String(id) !== removeCoOrgTarget.userId;
      }));
      setRemoveCoOrgTarget(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setIsRemovingCoOrg(false);
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

  const handleGenerateBracket = async (force = false) => {
    if (!tournamentId) return;
    setIsGeneratingBracket(true);
    try {
      await organizerService.generateBracket(tournamentId, force);
      showToast("success", force ? "Bracket regenerated successfully." : "Bracket generated successfully.");
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

  const handleAllocateWinnings = async () => {
    if (!tournamentId) return;
    setIsAllocatingWinnings(true);
    try {
      await apiPost(`${FINANCE_ENDPOINTS.ESCROW_ALLOCATE_WINNINGS}/${tournamentId}/allocate-winnings`, {});
      showToast("success", "Winnings allocated — players can now see and claim their prizes.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to allocate winnings.");
    } finally {
      setIsAllocatingWinnings(false);
    }
  };

  const handleAllocateEarnings = async () => {
    if (!tournamentId) return;
    setIsAllocatingEarnings(true);
    try {
      await apiPost(`${FINANCE_ENDPOINTS.ESCROW_ALLOCATE_EARNINGS}/${tournamentId}/allocate-earnings`, {});
      showToast("success", "Earnings sent to Finance page — you can now claim them.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to send earnings.");
    } finally {
      setIsAllocatingEarnings(false);
    }
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

  const handleSetScore = async () => {
    if (!setScoreTarget) return;
    const isPenMode = setScoreTarget.status === 'awaiting_penalties';
    const s1 = parseInt(setScoreInput.score1, 10);
    const s2 = parseInt(setScoreInput.score2, 10);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return;

    let finalScore1: number;
    let finalScore2: number;
    let reason: string | undefined;

    if (isPenMode) {
      // score1/score2 are penalty scores directly
      if (s1 === s2) return;
      finalScore1 = s1;
      finalScore2 = s2;
      reason = [setScoreInput.reason || `Penalty shootout: ${s1}–${s2}`].filter(Boolean).join(" · ");
    } else {
      const isDraw = s1 === s2;
      const p1 = parseInt(setScoreInput.penalty1, 10);
      const p2 = parseInt(setScoreInput.penalty2, 10);
      if (isDraw && (isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0 || p1 === p2)) return;
      finalScore1 = isDraw ? p1 : s1;
      finalScore2 = isDraw ? p2 : s2;
      const penaltyNote = isDraw ? `Regular time: ${s1}–${s2} · Penalties: ${p1}–${p2}` : "";
      reason = [penaltyNote, setScoreInput.reason].filter(Boolean).join(" · ") || undefined;
    }

    setIsSettingScore(true);
    try {
      await organizerService.setMatchScore(setScoreTarget.id, finalScore1, finalScore2, reason);
      showToast("success", "Match score set successfully.");
      setShowSetScoreModal(false);
      setSetScoreTarget(null);
      if (tournamentId) await loadBracketProgress(tournamentId, { silent: true });
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to set match score.");
    } finally {
      setIsSettingScore(false);
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
        // Clear "not_registered" IDs so the organizer must re-pick the correct player.
        // Keeping the stale wrong ID would cause the same mismatch on re-submission.
        inGameId: winner.matchStatus === "not_registered" ? "" : winner.inGameId,
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

    // Cap rows to the number of players who have an in-game ID registered
    const eligibleCount = registrants.filter(r => r.inGameId).length;
    if (eligibleCount > 0 && defaults.length > eligibleCount) {
      defaults = defaults.slice(0, eligibleCount);
      // Normalize prize percentages so they still sum to 100
      const total = defaults.reduce((sum, r) => sum + r.prizePercentage, 0);
      if (total > 0 && Math.abs(total - 100) > 0.001) {
        let running = 0;
        defaults = defaults.map((row, i) => {
          if (i === defaults.length - 1) {
            return { ...row, prizePercentage: Math.round((100 - running) * 100) / 100 };
          }
          const normalized = Math.round((row.prizePercentage / total * 100) * 100) / 100;
          running += normalized;
          return { ...row, prizePercentage: normalized };
        });
      }
    }

    // Pre-highlight any rows that were cleared (not_registered) so they're immediately visible
    const clearedIndices = new Set(defaults.map((r, i) => r.inGameId === "" ? i : -1).filter(i => i >= 0));
    setWinnerRows(defaults);
    setOpenWinnerDropdown(null);
    setWinnerDropdownSearch("");
    setEmptyWinnerIndices(clearedIndices);
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
      const missing = new Set(
        normalized.map((_, i) => i).filter(i => normalized[i].inGameId.length === 0),
      );
      setEmptyWinnerIndices(missing);
      const missingPositions = [...missing].map(i => `#${winnerRows[i].position}`).join(", ");
      showToast("error", `Position${missing.size > 1 ? "s" : ""} ${missingPositions} — select a player.`);
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

  // Group by bracket section + round so DE upper/lower rounds don't collide
  const isDE = bracketMatches.some(
    (m) => m.bracketPosition === "lower" || m.bracketPosition === "grand_final",
  );
  const bracketRoundStats = Array.from(
    bracketMatches.reduce((acc, match) => {
      const key = isDE
        ? `${match.bracketPosition ?? "main"}-${match.round}`
        : match.round;
      const existing = acc.get(key) ?? { total: 0, completed: 0, round: match.round };
      existing.total += 1;
      if (match.status === "completed") existing.completed += 1;
      acc.set(key, existing);
      return acc;
    }, new Map<number | string, { total: number; completed: number; round: number }>()),
  )
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
    .map(([, stats]) => ({
      round: stats.round,
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
      "started",
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
    !isLeague && !["draft", "cancelled", "completed"].includes(tournament.status);
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
    ["awaiting_results", "tournament_active", "disputed"].includes(escrowSummary.status);
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
    <div className="min-h-screen">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative border-b border-slate-800/60 bg-slate-950 overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute -top-40 right-0 w-[700px] h-[400px] rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[200px] rounded-full bg-indigo-500/6 blur-3xl pointer-events-none" />
        {/* Fine grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 lg:px-14 xl:px-20">

          {/* ── Top bar: back + actions + utility ── */}
          <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-800/50">
            {/* Back */}
            <button
              onClick={() => navigate("/auth/organizer/tournaments")}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors group shrink-0"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>My Tournaments</span>
            </button>

            {/* Right: action buttons + utility icons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {canPublish && (
                <button onClick={handlePublish} disabled={isPublishing}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-orange-500 to-amber-500 text-slate-950 text-xs font-bold hover:opacity-90 disabled:opacity-60 transition-all shadow-md shadow-orange-500/20">
                  {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Publish
                </button>
              )}
              {canGenerateLeagueFixtures && (
                <button onClick={() => void handleGenerateLeagueFixtures()} disabled={isGeneratingFixtures}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-400 disabled:opacity-60 transition-colors">
                  {isGeneratingFixtures ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <List className="w-3.5 h-3.5" />}
                  {isGeneratingFixtures ? "Generating…" : "Gen Fixtures"}
                </button>
              )}
              {leagueSettings?.fixturesGenerated && (
                <button onClick={() => void handleRecalculateStandings()} disabled={isRecalculating}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-medium hover:border-slate-500 hover:text-white disabled:opacity-60 transition-colors">
                  {isRecalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span className="hidden md:inline">{isRecalculating ? "Recalculating…" : "Recalculate Table"}</span>
                  <span className="md:hidden">{isRecalculating ? "…" : "Recalc"}</span>
                </button>
              )}
              {canAdvanceMatchweek && (
                <button onClick={() => void handleAdvanceLeagueMatchweek()} disabled={isAdvancingMatchweek}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 disabled:opacity-60 transition-colors">
                  {isAdvancingMatchweek ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {isAdvancingMatchweek ? "…" : leagueSettings?.legs === 2
                    ? `Wk ${(leagueSettings?.currentMatchweek ?? 0) + 1}–${(leagueSettings?.currentMatchweek ?? 0) + 2}`
                    : `Wk ${(leagueSettings?.currentMatchweek ?? 0) + 1}`}
                </button>
              )}
              {(canGenerateBracket || hasBracketGenerated) && (
                <button
                  onClick={() => { if (!hasBracketGenerated) void handleGenerateBracket(); }}
                  disabled={isGeneratingBracket || hasBracketGenerated}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60 ${
                    hasBracketGenerated
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                      : "bg-indigo-500 text-white hover:bg-indigo-400"
                  }`}>
                  {isGeneratingBracket ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : hasBracketGenerated ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Trophy className="w-3.5 h-3.5" />}
                  {isGeneratingBracket ? "…" : hasBracketGenerated ? "Bracket Ready" : "Gen Bracket"}
                </button>
              )}
              {canDepositPrizePool && (
                <button onClick={() => void handlePayPrizePool()} disabled={isInitiatingPayment}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 disabled:opacity-60 transition-colors">
                  {isInitiatingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                  Prize Pool
                </button>
              )}
              {canOpenWinnersModal && (
                <button onClick={handleOpenWinnersModal}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-400 transition-colors">
                  <Trophy className="w-3.5 h-3.5" />
                  {canSubmitWinners ? "Submit Winners" : "Review Winners"}
                </button>
              )}

              {/* Divider */}
              <span className="w-px h-5 bg-slate-800 shrink-0 mx-0.5" />

              {/* Utility icons */}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/auth/tournaments/${tournament.id}`;
                  if (navigator.share) { void navigator.share({ title: tournament.title, url }); }
                  else { void navigator.clipboard.writeText(url); showSuccess("Link copied!"); }
                }}
                title="Share"
                className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
              {canCancel && (
                <button onClick={() => setShowCancelConfirm(true)} disabled={isCancelling} title="Cancel tournament"
                  className="shrink-0 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 disabled:opacity-60 transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              )}
              {tournament.status === "draft" && (
                <button onClick={() => setShowDeleteConfirm(true)} title="Delete draft"
                  className="shrink-0 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* ── Hero body ── */}
          <div className="py-5 space-y-4">
            {/* Title + status + meta */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-linear-to-br from-cyan-500/20 to-indigo-500/20 border border-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
                <Trophy className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                {/* Title + badge — same line, spread apart */}
                <div className="flex items-center justify-between gap-2">
                  <h1 className="font-display text-xl md:text-2xl font-bold text-white leading-tight truncate min-w-0">
                    {tournament.title}
                  </h1>
                  <span className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide border ${
                    tournament.status === "open"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                      : tournament.status === "awaiting_deposit" || tournament.status === "published"
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
                        : tournament.status === "draft"
                          ? "bg-slate-600/20 text-slate-400 border-slate-600/25"
                          : tournament.status === "cancelled"
                            ? "bg-red-500/15 text-red-400 border-red-500/25"
                            : tournament.status === "completed"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
                              : "bg-cyan-500/15 text-cyan-300 border-cyan-500/25"
                  }`}>
                    {tournament.status.replace(/_/g, " ")}
                  </span>
                </div>
                {/* Meta chips + stats toggle on mobile */}
                <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar">
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] font-semibold text-slate-300">
                    {tournament.game?.name ?? "Unknown Game"}
                  </span>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-400">
                    {tournament.format ?? "Solo"}
                  </span>
                  <span className={`shrink-0 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${tournament.isFree ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-amber-500/10 border-amber-500/20 text-amber-300"}`}>
                    {tournament.isFree ? "Free" : `GHS ${(tournament.entryFee / 100).toFixed(2)}`}
                  </span>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-400 capitalize">
                    {(tournament.tournamentType ?? "—").replace(/_/g, " ")}
                  </span>
                  {leagueSettings?.fixturesGenerated && !canGenerateLeagueFixtures && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      Fixtures
                      {leagueSettings?.currentMatchweek != null && leagueSettings?.totalMatchweeks != null && leagueSettings.currentMatchweek > 0 && (
                        <span className="text-emerald-400/60 font-normal">Wk {leagueSettings.currentMatchweek}/{leagueSettings.totalMatchweeks}</span>
                      )}
                    </span>
                  )}
                  {/* Stats toggle — sits at end of chips row on mobile */}
                  <button
                    onClick={() => setStatsOpen(v => !v)}
                    className="md:hidden shrink-0 ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
                  >
                    Stats
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${statsOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Stats — mobile dropdown */}
            {statsOpen && (
              <div className="md:hidden grid grid-cols-2 gap-2">
                {[
                  { icon: Users,       label: "Registrants", value: String(activeRegistrants.length), sub: `of ${tournament.maxParticipants} max`,        accent: "text-white",       iconColor: "text-slate-400",   iconBg: "bg-slate-800 border-slate-700/50"        },
                  { icon: UserCheck,   label: "Checked In",  value: String(checkedInCount),           sub: `${activeRegistrants.length > 0 ? Math.round((checkedInCount / activeRegistrants.length) * 100) : 0}% ready`, accent: "text-emerald-400", iconColor: "text-emerald-400", iconBg: "bg-emerald-500/10 border-emerald-500/20" },
                  { icon: Trophy,      label: "Capacity",    value: `${tournament.currentCount}/${tournament.maxParticipants}`, sub: `${tournament.minParticipants} min`, accent: "text-cyan-400", iconColor: "text-cyan-400", iconBg: "bg-cyan-500/10 border-cyan-500/20" },
                  { icon: CalendarDays,label: "Starts",      value: tournament.schedule.tournamentStart ? new Date(tournament.schedule.tournamentStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD", sub: tournament.schedule.tournamentStart ? new Date(tournament.schedule.tournamentStart).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "Date not set", accent: "text-orange-400", iconColor: "text-orange-400", iconBg: "bg-orange-500/10 border-orange-500/20" },
                ].map(({ icon: Icon, label, value, sub, accent, iconColor, iconBg }) => (
                  <div key={label} className="flex items-center gap-2.5 bg-slate-800/40 border border-slate-700/40 rounded-xl px-3 py-3">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}>
                      <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{label}</p>
                      <p className={`font-display text-lg font-bold tabular-nums leading-tight ${accent}`}>{value}</p>
                      <p className="text-[9px] text-slate-600 mt-0.5 truncate">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats — desktop always visible */}
            <div className="hidden md:grid grid-cols-4 gap-3">
              {[
                { icon: Users,       label: "Registrants", value: String(activeRegistrants.length), sub: `of ${tournament.maxParticipants} max`,        accent: "text-white",       iconColor: "text-slate-400",   iconBg: "bg-slate-800 border-slate-700/50"        },
                { icon: UserCheck,   label: "Checked In",  value: String(checkedInCount),           sub: `${activeRegistrants.length > 0 ? Math.round((checkedInCount / activeRegistrants.length) * 100) : 0}% ready`, accent: "text-emerald-400", iconColor: "text-emerald-400", iconBg: "bg-emerald-500/10 border-emerald-500/20" },
                { icon: Trophy,      label: "Capacity",    value: `${tournament.currentCount}/${tournament.maxParticipants}`, sub: `${tournament.minParticipants} min required`, accent: "text-cyan-400", iconColor: "text-cyan-400", iconBg: "bg-cyan-500/10 border-cyan-500/20" },
                { icon: CalendarDays,label: "Starts",      value: tournament.schedule.tournamentStart ? new Date(tournament.schedule.tournamentStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD", sub: tournament.schedule.tournamentStart ? new Date(tournament.schedule.tournamentStart).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "Date not set", accent: "text-orange-400", iconColor: "text-orange-400", iconBg: "bg-orange-500/10 border-orange-500/20" },
              ].map(({ icon: Icon, label, value, sub, accent, iconColor, iconBg }) => (
                <div key={label} className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/40 rounded-2xl px-4 py-3.5 hover:border-slate-600/60 transition-colors">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</p>
                    <p className={`font-display text-xl font-bold tabular-nums leading-tight ${accent}`}>{value}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 truncate">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-14 xl:px-20 py-4 md:py-6">
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

        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-start mt-4 md:mt-5">
        {/* ── MAIN column ── */}
        <div className="flex-1 min-w-0 space-y-5">

        {/* League Section (organizer) */}
        {isLeague &&
          !["draft", "cancelled"].includes(tournament.status) &&
          tournament.id && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-800/60 bg-slate-950/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
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
                {leagueSettings?.fixturesGenerated && leagueSettings.currentMatchweek > 0 && (
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
                <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      {
                        label: "Current Week",
                        value: leagueSettings.currentMatchweek > 0 ? String(leagueSettings.currentMatchweek) : "—",
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
                        className="rounded-xl bg-slate-800/40 border border-slate-800 px-2 py-2.5 sm:px-4 sm:py-3 text-center"
                      >
                        <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1 truncate">
                          {label}
                        </p>
                        <p
                          className={`font-display text-lg sm:text-xl font-bold tabular-nums ${accent}`}
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
                    isFixturesGenerated={leagueSettings.fixturesGenerated}
                    onGenerateFixtures={canGenerateLeagueFixtures ? () => void handleGenerateLeagueFixtures() : undefined}
                    isGeneratingFixtures={isGeneratingFixtures}
                    onActionComplete={() => void loadData()}
                  />
                </div>
              )}
            </div>
          )}

        {!isLeague && (hasBracketGenerated || canGenerateBracket) && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-4 h-4 text-cyan-400 shrink-0" />
                <h2 className="font-display text-sm font-bold text-white">Bracket</h2>
                {hasBracketGenerated && currentBracketRound && (
                  <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded-full">
                    Round {currentBracketRound.round}
                  </span>
                )}
              </div>
              {hasBracketGenerated && (
                <div className="flex items-center gap-1">
                  {bracketRounds.length > 0 && (
                    <button
                      onClick={() => setShowBracketView((v) => !v)}
                      className={`text-xs font-semibold transition-colors px-3 py-1.5 rounded-lg
                        ${showBracketView
                          ? "text-slate-400 hover:text-cyan-400 hover:bg-white/5"
                          : "text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30 animate-pulse hover:animate-none"
                        }`}
                    >
                      {showBracketView ? "Hide" : "Full bracket"}
                    </button>
                  )}
                  {tournamentId && (
                    <button
                      onClick={() => { void loadBracketProgress(tournamentId); }}
                      disabled={isRefreshingBracketProgress}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-40 transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingBracketProgress ? "animate-spin" : ""}`} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {hasBracketGenerated ? (
              <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-3 sm:space-y-4">
                {/* Progress bar + inline stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      <span className="text-white font-bold tabular-nums">{completedBracketMatches}</span>
                      <span className="text-slate-600"> / {totalBracketMatches} matches</span>
                    </span>
                    <span className={`text-xs font-bold tabular-nums ${bracketCompletionPercent === 100 ? "text-emerald-400" : "text-cyan-400"}`}>
                      {bracketCompletionPercent}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        bracketCompletionPercent === 100
                          ? "bg-emerald-400"
                          : "bg-linear-to-r from-cyan-500 to-indigo-500"
                      }`}
                      style={{ width: `${bracketCompletionPercent || 0}%` }}
                    />
                  </div>
                </div>

                {/* Round pills */}
                {bracketRoundStats.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {bracketRoundStats.map((round, i) => {
                      const isActive = !round.done && (i === 0 || bracketRoundStats[i - 1].done);
                      const isDone = round.done;
                      return (
                        <div
                          key={round.round}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                            isDone
                              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                              : isActive
                                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                                : "bg-slate-800/50 border-slate-700/50 text-slate-600"
                          }`}
                        >
                          {isDone && <CheckCircle2 className="w-3 h-3" />}
                          <span>R{round.round}</span>
                          <span className={`tabular-nums ${isDone ? "text-emerald-500/70" : isActive ? "text-cyan-500/70" : "text-slate-700"}`}>
                            {isDone || isActive ? `${round.completed}/${round.total}` : `0/${round.total}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}


                {showBracketView && bracketRounds.length > 0 && (
                  <div className="border-t border-slate-800 pt-4">
                    <BracketView
                      rounds={bracketRounds}
                      onMatchClick={(id) => setActiveMatchId(id)}
                      currentUserId={user?.id}
                      currentInGameId={registrants.find(r => r.userId === user?.id)?.inGameId}
                    />
                  </div>
                )}

              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center gap-2 px-5">
                <Trophy className="w-7 h-7 text-slate-700" />
                <p className="text-sm text-slate-500">Bracket not generated yet.</p>
                <p className="text-xs text-slate-600">Lock registrations and generate the bracket above.</p>
              </div>
            )}
          </div>
        )}

        {/* Tournament Results */}
        {tournament.status === "completed" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-800/80 bg-slate-950/30 space-y-2">
              {/* Title + badge */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-sm font-bold text-white">Final Standings</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Tournament completed · Prize distribution</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  Completed
                </span>
              </div>
              {/* Action buttons — own row */}
              {tournament.entryFee > 0 && (
                <div className="flex items-center gap-2">
                  {escrowSummary?.processingSchedule?.prizesDistributed && (
                    <button
                      onClick={() => void handleAllocateWinnings()}
                      disabled={isAllocatingWinnings}
                      title="Send winnings to players' Prizes page"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 disabled:opacity-50 transition-colors"
                    >
                      {isAllocatingWinnings ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trophy className="w-3 h-3" />}
                      {isAllocatingWinnings ? "Sending…" : "Send to Players"}
                    </button>
                  )}
                  {escrowSummary && (
                    <button
                      onClick={() => void handleAllocateEarnings()}
                      disabled={isAllocatingEarnings}
                      title="Send entry fee earnings to your Finance page"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/25 disabled:opacity-50 transition-colors"
                    >
                      {isAllocatingEarnings ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
                      {isAllocatingEarnings ? "Sending…" : "Send to Finance"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {(() => {
              const submittedWinners = escrowSummary?.winnerSubmissions?.winners ?? [];
              type StandingEntry = { position: number; inGameId: string; displayName: string; prize: string | null };
              let effectiveStandings: StandingEntry[] = [];

              if (submittedWinners.length > 0) {
                // Priority 1: submitted winners from escrow
                effectiveStandings = [...submittedWinners]
                  .sort((a, b) => a.position - b.position)
                  .map(w => {
                    const reg = registrants.find(r => r.inGameId === w.inGameId);
                    return { position: w.position, inGameId: w.inGameId, displayName: reg?.displayName ?? w.inGameId, prize: w.prizeAmountLabel ?? null };
                  });
              } else {
                // Priority 2: bracket match outcomes — same source as the Results sidebar
                const gfRound = bracketRounds.find(r => r.bracket === "grand_final") ?? bracketRounds[bracketRounds.length - 1];
                const gfMatch = gfRound?.matches?.find(m => m.status === "completed");
                const bracketChampion = gfMatch?.participants?.find(p => p.result === "win");
                if (bracketChampion) {
                  const bracketRunnerUp = gfMatch?.participants?.find(p => p.result === "loss");
                  const wbRoundsData = bracketRounds.filter(r => r !== gfRound && r.bracket !== "grand_final");
                  const sfLosers = (wbRoundsData[wbRoundsData.length - 1]?.matches ?? [])
                    .filter(m => m.status === "completed")
                    .flatMap(m => m.participants?.filter(p => p.result === "loss") ?? []);
                  const addBracketEntry = (pos: number, p: typeof bracketChampion | undefined) => {
                    if (!p) return;
                    const inGameId = getParticipantLabel(p);
                    const reg = registrants.find(r => r.inGameId === inGameId);
                    effectiveStandings.push({ position: pos, inGameId, displayName: reg?.displayName ?? inGameId, prize: null });
                  };
                  addBracketEntry(1, bracketChampion);
                  addBracketEntry(2, bracketRunnerUp);
                  addBracketEntry(3, sfLosers[0]);
                }
                // Priority 3: tournament results API (last resort)
                if (effectiveStandings.length === 0) {
                  effectiveStandings = (tournamentResults ?? []).map((e, idx) => ({
                    position: Number(e.position ?? e.final_placement ?? idx + 1),
                    inGameId: String(e.in_game_id ?? e.inGameId ?? ""),
                    displayName: String(e.username ?? e.in_game_id ?? e.inGameId ?? "—"),
                    prize: e.prize_amount_ghs ? `GHS ${String(e.prize_amount_ghs)}` : e.prize_percentage ? `${String(e.prize_percentage)}%` : null,
                  }));
                }
              }

              if (isLoadingResults && effectiveStandings.length === 0) {
                return (
                  <div className="flex items-center justify-center py-12 gap-3">
                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                    <span className="text-sm text-slate-500">Loading results…</span>
                  </div>
                );
              }

              if (effectiveStandings.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-slate-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">No results recorded yet</p>
                  </div>
                );
              }

              return (
                <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                  {/* Podium — top 3 */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                    {[
                      { pos: 1, color: "from-amber-500/20 to-amber-500/5", border: "border-amber-500/30", badge: "text-amber-300 bg-amber-500/15 border-amber-500/30", medal: "🥇" },
                      { pos: 2, color: "from-slate-400/15 to-slate-400/5", border: "border-slate-500/30", badge: "text-slate-300 bg-slate-500/15 border-slate-500/30", medal: "🥈" },
                      { pos: 3, color: "from-orange-600/15 to-orange-600/5", border: "border-orange-500/25", badge: "text-orange-300 bg-orange-500/10 border-orange-500/25", medal: "🥉" },
                    ].map(({ pos, color, border, badge, medal }) => {
                      const entry = effectiveStandings.find(e => e.position === pos);
                      if (!entry) return null;
                      return (
                        <div key={pos} className={`rounded-xl border bg-linear-to-b ${color} ${border} p-2 sm:p-3 text-center`}>
                          <div className="text-xl sm:text-2xl mb-1">{medal}</div>
                          <p className="text-[10px] sm:text-xs font-bold text-white truncate">{entry.displayName}</p>
                          {entry.displayName !== entry.inGameId && entry.inGameId && (
                            <p className="text-[9px] text-slate-500 truncate mt-0.5">{entry.inGameId}</p>
                          )}
                          <p className={`text-[10px] font-semibold mt-1.5 px-1.5 py-0.5 rounded-full border inline-block ${badge}`}>
                            {entry.prize ?? "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {/* 4th place and beyond */}
                  {effectiveStandings.length > 3 && (
                    <div className="rounded-xl border border-slate-800 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-800/60 bg-slate-950/20">
                            {["#", "Player", "Prize"].map(h => (
                              <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {effectiveStandings.slice(3).map(entry => (
                            <tr key={entry.position} className="border-b border-slate-800/40 last:border-b-0 hover:bg-slate-800/20 transition-colors">
                              <td className="px-4 py-2.5 text-sm font-bold text-slate-400">#{entry.position}</td>
                              <td className="px-4 py-2.5">
                                <p className="text-sm font-medium text-white">{entry.displayName}</p>
                                {entry.displayName !== entry.inGameId && entry.inGameId && (
                                  <p className="text-xs text-slate-500">{entry.inGameId}</p>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-sm text-slate-400">{entry.prize ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

          {/* Participants */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="flex flex-col gap-3 px-4 py-3 border-b border-slate-800/60 bg-slate-950/20 md:flex-row md:items-center md:justify-between md:px-5 md:py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-white leading-tight">
                    Participants
                    <span className="ml-2 text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">
                      {activeRegistrants.length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">{checkedInCount} checked in</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search players..."
                    className="w-full md:w-44 bg-slate-800/60 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
                  />
                </div>
              </div>
            </div>
            {filteredRegistrants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-400">{search ? "No players match your search" : "No players registered yet"}</p>
                {search && (
                  <button onClick={() => setSearch("")} className="mt-2 text-xs text-cyan-500 hover:text-cyan-400 transition-colors">Clear search</button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile card list — visible below md */}
                <div className="md:hidden divide-y divide-slate-800/50">
                  {filteredRegistrants.map(r => (
                    <div key={r.registrationId} className="px-4 py-3 flex items-center gap-3">
                      <div className="relative shrink-0">
                        <PlayerAvatar src={r.avatarUrl} name={r.displayName} size="sm" />
                        {r.checkedIn && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{r.displayName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{r.inGameId || <span className="italic">no in-game ID</span>} · @{r.username}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[r.status] ?? "bg-slate-700/30 text-slate-400 border-slate-700"}`}>
                          {r.status.replace(/_/g, " ")}
                        </span>
                        {r.checkedIn ? (
                          <button
                            onClick={() => void handleUndoCheckIn(r.userId)}
                            disabled={actionLoading === r.userId}
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 transition-colors"
                            title="Undo check-in"
                          >
                            {actionLoading === r.userId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <button
                            onClick={() => void handleCheckIn(r.userId)}
                            disabled={actionLoading === r.userId}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-50 transition-colors"
                            title="Check in"
                          >
                            {actionLoading === r.userId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => setRemoveTarget({ userId: r.userId, displayName: r.displayName })}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                          title="Remove player"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop table — visible from md up */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-160">
                    <thead>
                      <tr className="border-b border-slate-800/60 bg-slate-950/20">
                        {["Player", "In-Game ID", "Status", "Registered", "Actions"].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrants.map(r => (
                        <RegistrantRow
                          key={r.registrationId}
                          registrant={r}
                          onCheckIn={handleCheckIn}
                          onUndoCheckIn={handleUndoCheckIn}
                          onRemove={(userId, displayName) => setRemoveTarget({ userId, displayName })}
                          isActionLoading={actionLoading === r.userId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

        </div>{/* end main column */}

        {/* ── SIDEBAR ── */}
        <div className="w-full lg:w-72 shrink-0 space-y-4 lg:sticky lg:top-6">
          {/* Tournament Info */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <button
              type="button"
              onClick={() => setTournamentInfoOpen(v => !v)}
              className="lg:pointer-events-none w-full flex items-center gap-2.5 px-5 py-4 border-b border-slate-800/60 bg-slate-950/20"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-700/60 border border-slate-600/50 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-slate-300" />
              </div>
              <h2 className="font-display text-sm font-bold text-white flex-1 text-left">Tournament Info</h2>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 lg:hidden ${tournamentInfoOpen ? "rotate-180" : ""}`} />
            </button>
            <div className={`p-4 space-y-2.5 ${tournamentInfoOpen ? "block" : "hidden"} lg:block`}>
              {[
                { label: "Game", value: tournament.game?.name ?? "—" },
                { label: "Type", value: (tournament.tournamentType ?? "—").replace(/_/g, " ") },
                { label: "Format", value: tournament.format ?? "—" },
                { label: "Entry", value: tournament.isFree ? "Free" : `GHS ${(tournament.entryFee / 100).toFixed(2)}` },
                { label: "Prize Pool", value: tournament.prizePool ? `GHS ${(tournament.prizePool / 100).toFixed(2)}` : "—" },
                { label: "Reg. Closes", value: formatDate(tournament.schedule.registrationEnd) },
                { label: "Starts", value: formatDate(tournament.schedule.tournamentStart) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-3 py-1 border-b border-slate-800/40 last:border-0">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide shrink-0">{label}</span>
                  <span className="text-[12px] font-medium text-slate-300 text-right capitalize">{value}</span>
                </div>
              ))}

            </div>
          </div>

          {/* ── Co-organizers ── */}
          {tournament && user && tournament.organizerId === user.id && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-800/60 bg-slate-950/20">
                <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-bold text-white">Co-organizers</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Invite others to help manage</p>
                </div>
              </div>

              <div className="p-3.5 space-y-3">
                {/* Invite input row */}
                <div className="relative">
                  <input
                    type="text"
                    value={inviteIdentifier}
                    onChange={(e) => { setInviteIdentifier(e.target.value); setCoOrgError(null); handleCoOrgSearch(e.target.value); }}
                    placeholder="Email or username"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-16 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => void handleInviteCoOrg()}
                    disabled={isInvitingCoOrg || !inviteIdentifier.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500 text-white text-[11px] font-semibold hover:bg-violet-400 disabled:opacity-60 transition-colors"
                  >
                    {isInvitingCoOrg ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Invite
                  </button>
                  {isSearchingCoOrg && (
                    <div className="absolute right-16 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                    </div>
                  )}
                  {/* Dropdown */}
                  {coOrgSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border border-slate-700 bg-slate-800 shadow-xl overflow-hidden">
                      {coOrgSearchResults.map((r) => (
                        <button
                          key={r.user_id}
                          type="button"
                          onClick={() => { setInviteIdentifier(r.email); setCoOrgSearchResults([]); }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700/60 transition-colors text-left"
                        >
                          {r.avatar_url ? (
                            <img src={r.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-600" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border border-slate-600 flex items-center justify-center shrink-0 text-[10px] font-bold text-violet-300">
                              {(r.name || r.username).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{r.name || r.username}</p>
                            <p className="text-[10px] text-slate-400 truncate">@{r.username}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {coOrgError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {coOrgError}
                  </div>
                )}

                {/* List */}
                {isLoadingCoOrgs ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading…
                  </div>
                ) : coOrganizers.length === 0 ? (
                  <p className="text-[11px] text-slate-600 italic">No co-organizers yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {coOrganizers.map((co, idx) => {
                      const u = typeof co.user_id === "object" && co.user_id !== null ? co.user_id as Record<string, any> : null;
                      const coUserId = u?._id ?? (typeof co.user_id === "string" ? co.user_id : "");
                      const coName = u ? (`${u.profile?.first_name ?? ""} ${u.profile?.last_name ?? ""}`.trim() || u.username || "Organizer") : "Organizer";
                      const coUsername = u?.username ?? "";
                      const coAvatarUrl = u?.profile?.avatar_url ?? "";
                      const statusColor = co.status === "accepted"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                        : co.status === "declined"
                        ? "bg-red-500/15 text-red-300 border-red-500/25"
                        : "bg-amber-500/15 text-amber-300 border-amber-500/25";

                      return (
                        <div key={String(coUserId) || String(idx)} className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/50 rounded-xl px-2.5 py-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border border-slate-600 flex items-center justify-center shrink-0 text-[10px] font-bold text-violet-300 overflow-hidden">
                            {coAvatarUrl ? <img src={coAvatarUrl} alt="" className="w-full h-full object-cover" /> : coName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{coName}</p>
                            {coUsername && <p className="text-[10px] text-slate-500 truncate">@{coUsername}</p>}
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border capitalize shrink-0 ${statusColor}`}>
                            {co.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleRemoveCoOrg(String(coUserId), coName)}
                            title="Remove"
                            className="p-0.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {(() => {
            const submittedWinners = escrowSummary?.winnerSubmissions?.winners ?? [];
            const RESULT_SLOTS = [
              { pos: 1, icon: <Crown className="w-4 h-4 text-amber-400" />, label: "Champion", nameClass: "text-amber-300 font-bold", bg: "bg-amber-500/8 border-amber-500/20" },
              { pos: 2, icon: <Medal className="w-4 h-4 text-slate-300" />, label: "2nd Place", nameClass: "text-slate-200 font-semibold", bg: "bg-slate-800/40 border-slate-700/40" },
              { pos: 3, icon: <Medal className="w-4 h-4 text-orange-600" />, label: "3rd Place", nameClass: "text-slate-300 font-semibold", bg: "bg-slate-800/40 border-slate-700/40" },
            ];

            if (submittedWinners.length > 0) {
              const top3 = [...submittedWinners].sort((a, b) => a.position - b.position).slice(0, 3);
              if (top3.length === 0) return null;
              return (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800/60 bg-slate-950/20">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 text-amber-400" />
                    </div>
                    <h2 className="font-display text-sm font-bold text-white">Results</h2>
                  </div>
                  <div className="p-4 space-y-2">
                    {RESULT_SLOTS.map(({ pos, icon, label, nameClass, bg }) => {
                      const winner = top3.find(w => w.position === pos);
                      if (!winner) return null;
                      const reg = registrants.find(r => r.inGameId === winner.inGameId);
                      const displayName = reg?.displayName ?? winner.inGameId;
                      return (
                        <div key={label} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border ${bg}`}>
                          <span className="flex items-center gap-2 text-xs font-semibold text-slate-400 shrink-0">
                            {icon} {label}
                          </span>
                          <div className="min-w-0 text-right">
                            <p className={`text-sm truncate ${nameClass}`}>{displayName}</p>
                            {displayName !== winner.inGameId && (
                              <p className="text-[10px] text-slate-500 truncate">{winner.inGameId}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Fallback: derive top 3 from bracket match outcomes
            const gfRound = bracketRounds.find(r => r.bracket === "grand_final")
              ?? bracketRounds[bracketRounds.length - 1];
            const gfMatch = gfRound?.matches?.find(m => m.status === "completed");
            const champion = gfMatch?.participants?.find(p => p.result === "win");
            if (!champion) return null;
            const runnerUp = gfMatch?.participants?.find(p => p.result === "loss");
            const wbRoundsData = bracketRounds.filter(r => r !== gfRound && r.bracket !== "grand_final");
            const sfRound = wbRoundsData[wbRoundsData.length - 1];
            const sfLosers = sfRound?.matches
              ?.filter(m => m.status === "completed")
              ?.flatMap(m => m.participants?.filter(p => p.result === "loss") ?? []) ?? [];
            const bracketPlacements = [
              { icon: <Crown className="w-4 h-4 text-amber-400" />, label: "Champion", player: champion, nameClass: "text-amber-300 font-bold", bg: "bg-amber-500/8 border-amber-500/20" },
              { icon: <Medal className="w-4 h-4 text-slate-300" />, label: "2nd Place", player: runnerUp, nameClass: "text-slate-200 font-semibold", bg: "bg-slate-800/40 border-slate-700/40" },
              { icon: <Medal className="w-4 h-4 text-orange-600" />, label: "3rd Place", player: sfLosers[0] ?? null, nameClass: "text-slate-300 font-semibold", bg: "bg-slate-800/40 border-slate-700/40" },
            ];
            return (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800/60 bg-slate-950/20">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <h2 className="font-display text-sm font-bold text-white">Results</h2>
                </div>
                <div className="p-4 space-y-2">
                  {bracketPlacements.map(({ icon, label, player, nameClass, bg }) => (
                    <div key={label} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border ${bg}`}>
                      <span className="flex items-center gap-2 text-xs font-semibold text-slate-400 shrink-0">
                        {icon} {label}
                      </span>
                      <span className={`text-sm truncate text-right ${nameClass}`}>
                        {player ? getParticipantLabel(player) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Escrow */}
          {!tournament.isFree && escrowSummary && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
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
                      <div className="space-y-1">
                        <p className="text-xs text-red-300">
                          <span className="font-semibold">Needs attention · </span>
                          {disputedWinners.length > 0
                            ? "Submitted winner IDs could not be matched to registered players. The escrow is locked — contact support with the correct IDs shown below."
                            : `Status: ${normalizeEscrowStatusLabel(escrowSummary.status)}. Check payment flow.`}
                        </p>
                      </div>
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
                                <th className="px-3 py-2 text-left font-semibold">#</th>
                                <th className="px-3 py-2 text-left font-semibold">Submitted ID</th>
                                <th className="px-3 py-2 text-left font-semibold">Correct ID (registered)</th>
                                <th className="px-3 py-2 text-left font-semibold">Prize</th>
                              </tr>
                            </thead>
                            <tbody>
                              {disputedWinners.map((winner) => {
                                const match = registrants.find(
                                  r => r.displayName.toLowerCase() === winner.inGameId.toLowerCase() ||
                                       r.inGameId.toLowerCase() === winner.inGameId.toLowerCase() ||
                                       r.username.toLowerCase() === winner.inGameId.toLowerCase()
                                );
                                return (
                                  <tr
                                    key={`${winner.position}-${winner.inGameId}`}
                                    className="border-b border-red-500/8 last:border-b-0"
                                  >
                                    <td className="px-3 py-2 font-bold text-white">
                                      #{winner.position}
                                    </td>
                                    <td className="px-3 py-2 text-red-300 line-through opacity-70">
                                      {winner.inGameId}
                                    </td>
                                    <td className="px-3 py-2">
                                      {match ? (
                                        <div>
                                          <p className="text-emerald-300 font-semibold">{match.inGameId}</p>
                                          <p className="text-slate-500 text-[10px]">{match.displayName}</p>
                                        </div>
                                      ) : (
                                        <span className="text-slate-500 italic">not found in registrants</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-slate-400">
                                      {winner.prizeAmountLabel ?? "—"}
                                    </td>
                                  </tr>
                                );
                              })}
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
          )}{/* end escrow conditional */}
        </div>{/* end sidebar */}
        </div>{/* end flex row */}
      </div>{/* end content max-w */}

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
              {escrowSummary?.status === "verifying_winners" ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-2.5 flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-300">
                    <span className="font-semibold">Winners verified.</span> Prizes will be distributed automatically within 5 minutes. No further action needed.
                  </p>
                </div>
              ) : escrowSummary?.status === "disputed" && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 flex gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Escrow is <span className="font-semibold">disputed</span> — previous winner IDs could not be matched. Select the correct players below and re-submit to resolve.
                  </p>
                </div>
              )}
              {winnerRows.map((row, index) => (
                <div
                  key={`${row.position}-${index}`}
                  className={`rounded-xl border p-3.5 space-y-3 transition-colors ${emptyWinnerIndices.has(index) ? "border-red-500/50 bg-red-500/5" : "border-slate-800 bg-slate-800/30"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-[11px] font-bold text-indigo-400">
                      {row.position}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      Position #{row.position}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {/* Player picker */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Player
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (openWinnerDropdown === index) {
                            setOpenWinnerDropdown(null);
                          } else {
                            setOpenWinnerDropdown(index);
                            setWinnerDropdownSearch("");
                          }
                        }}
                        className={`w-full bg-slate-800/60 border rounded-xl px-3 py-2 text-sm text-left flex items-center justify-between gap-2 transition-colors ${openWinnerDropdown === index ? "border-indigo-500/60" : "border-slate-700 hover:border-indigo-500/40"}`}
                      >
                        {row.inGameId ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <PlayerAvatar
                              src={registrants.find(r => r.inGameId === row.inGameId)?.avatarUrl}
                              name={registrants.find(r => r.inGameId === row.inGameId)?.displayName}
                              size="xs"
                              ringClass=""
                            />
                            <span className="text-white text-sm font-semibold truncate">
                              {registrants.find(r => r.inGameId === row.inGameId)?.displayName ?? row.inGameId}
                            </span>
                            <span className="text-slate-500 text-xs shrink-0">{row.inGameId}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-sm">Select player…</span>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-150 ${openWinnerDropdown === index ? "rotate-180" : ""}`} />
                      </button>
                      {openWinnerDropdown === index && (
                        <div className="border border-slate-700 rounded-xl bg-slate-950 overflow-hidden shadow-xl">
                          <div className="p-2 border-b border-slate-800">
                            <input
                              type="text"
                              value={winnerDropdownSearch}
                              onChange={(e) => setWinnerDropdownSearch(e.target.value)}
                              placeholder="Search players…"
                              autoFocus
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
                            />
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            {(() => {
                              const alreadySelected = winnerRows
                                .filter((_, i) => i !== index)
                                .map(r => r.inGameId.toLowerCase())
                                .filter(Boolean);
                              const eligible = registrants
                                .filter(r => r.inGameId)
                                .filter(r => {
                                  if (!winnerDropdownSearch) return true;
                                  const q = winnerDropdownSearch.toLowerCase();
                                  return (
                                    r.displayName.toLowerCase().includes(q) ||
                                    r.inGameId.toLowerCase().includes(q)
                                  );
                                });
                              if (eligible.length === 0) {
                                return (
                                  <div className="px-3 py-4 text-center text-xs text-slate-500">
                                    No players found
                                  </div>
                                );
                              }
                              return eligible.map(player => {
                                const isUsed = alreadySelected.includes(player.inGameId.toLowerCase());
                                const isSelected = row.inGameId === player.inGameId;
                                return (
                                  <button
                                    key={player.userId}
                                    type="button"
                                    disabled={isUsed}
                                    onClick={() => {
                                      handleWinnerRowChange(index, "inGameId", player.inGameId);
                                      setEmptyWinnerIndices(prev => { const s = new Set(prev); s.delete(index); return s; });
                                      setOpenWinnerDropdown(null);
                                      setWinnerDropdownSearch("");
                                    }}
                                    className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left transition-colors ${isUsed ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-800/80"} ${isSelected ? "bg-indigo-500/10" : ""}`}
                                  >
                                    <PlayerAvatar
                                      src={player.avatarUrl}
                                      name={player.displayName}
                                      size="xs"
                                      ringClass=""
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-white truncate leading-tight">
                                        {player.displayName}
                                      </p>
                                      <p className="text-[10px] text-slate-500 truncate">
                                        {player.inGameId}
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    )}
                                    {isUsed && !isSelected && (
                                      <span className="text-[10px] text-slate-600 shrink-0">taken</span>
                                    )}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Prize % */}
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

      {/* Remove Co-organizer Confirm Modal */}
      {removeCoOrgTarget && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/60">
            <div className="px-6 pt-6 pb-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">Remove Co-organizer?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">This can be undone by re-inviting them</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                <span className="font-semibold text-white">{removeCoOrgTarget.name}</span> will lose access to co-manage this tournament.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-2.5">
              <button
                onClick={() => setRemoveCoOrgTarget(null)}
                disabled={isRemovingCoOrg}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveCoOrg}
                disabled={isRemovingCoOrg}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRemovingCoOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Remove
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



      {/* Set Score Modal */}
      {showSetScoreModal && setScoreTarget && (() => {
        const isPenaltySubmission = setScoreTarget.status === 'awaiting_penalties';
        return (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPenaltySubmission ? "bg-amber-500/15 border border-amber-500/25" : "bg-orange-500/15 border border-orange-500/25"}`}>
                  <Pencil className={`w-4 h-4 ${isPenaltySubmission ? "text-amber-400" : "text-orange-400"}`} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-white">{isPenaltySubmission ? "Penalty Shootout" : "Set Match Score"}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    R{setScoreTarget.round} · M{setScoreTarget.matchNumber} · {isPenaltySubmission ? "Aggregate level — enter penalty scores" : "Manual override"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowSetScoreModal(false); setSetScoreTarget(null); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {/* Quick outcome shortcuts — hidden when submitting penalties */}
              {!isPenaltySubmission && <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Quick Set</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSetScoreInput(prev => ({ ...prev, score1: "1", score2: "0", penalty1: "", penalty2: "" }))}
                    className={`py-1.5 rounded-lg text-[11px] font-bold border transition-colors truncate px-1 ${
                      setScoreInput.score1 === "1" && setScoreInput.score2 === "0"
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                        : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    {setScoreTarget.participants[0]?.inGameId?.split(" ")[0] || "P1"} Win
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetScoreInput(prev => ({ ...prev, score1: "0", score2: "0", penalty1: "", penalty2: "" }))}
                    className={`py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                      setScoreInput.score1 === setScoreInput.score2 && setScoreInput.score1 !== ""
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                        : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    {(setScoreTarget.format?.best_of ?? 1) === 1 ? "Draw+Pen" : "Draw"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetScoreInput(prev => ({ ...prev, score1: "0", score2: "1", penalty1: "", penalty2: "" }))}
                    className={`py-1.5 rounded-lg text-[11px] font-bold border transition-colors truncate px-1 ${
                      setScoreInput.score1 === "0" && setScoreInput.score2 === "1"
                        ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                        : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    {setScoreTarget.participants[1]?.inGameId?.split(" ")[0] || "P2"} Win
                  </button>
                </div>
              </div>}

              {/* Manual score inputs — hidden when submitting penalties */}
              {!isPenaltySubmission && <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                    {setScoreTarget.participants[0]?.inGameId || "Player 1"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={setScoreInput.score1}
                    onChange={e => setSetScoreInput(prev => ({ ...prev, score1: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-center text-xl font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                    {setScoreTarget.participants[1]?.inGameId || "Player 2"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={setScoreInput.score2}
                    onChange={e => setSetScoreInput(prev => ({ ...prev, score2: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-center text-xl font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 transition-colors"
                  />
                </div>
              </div>}

              {/* Penalty-only mode: aggregate level after two legs */}
              {isPenaltySubmission && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2.5">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Penalty Shootout — Required</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                        {setScoreTarget.participants[0]?.inGameId || "Player 1"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={setScoreInput.score1}
                        onChange={e => setSetScoreInput(prev => ({ ...prev, score1: e.target.value }))}
                        placeholder="0"
                        className="w-full bg-slate-800/60 border border-amber-500/30 rounded-xl px-3 py-2 text-center text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                        {setScoreTarget.participants[1]?.inGameId || "Player 2"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={setScoreInput.score2}
                        onChange={e => setSetScoreInput(prev => ({ ...prev, score2: e.target.value }))}
                        placeholder="0"
                        className="w-full bg-slate-800/60 border border-amber-500/30 rounded-xl px-3 py-2 text-center text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60 transition-colors"
                      />
                    </div>
                  </div>
                  {(() => {
                    const p1 = parseInt(setScoreInput.score1, 10);
                    const p2 = parseInt(setScoreInput.score2, 10);
                    if (!isNaN(p1) && !isNaN(p2) && setScoreInput.score1 !== "" && setScoreInput.score2 !== "") {
                      if (p1 === p2) return <p className="text-[11px] text-rose-400">Penalty scores must not be equal — a winner is required.</p>;
                      const winner = p1 > p2 ? setScoreTarget.participants[0]?.inGameId || "Player 1" : setScoreTarget.participants[1]?.inGameId || "Player 2";
                      return <p className="text-[11px] text-cyan-300 font-semibold">{winner} wins on penalties</p>;
                    }
                    return null;
                  })()}
                </div>
              )}

              {!isPenaltySubmission && setScoreInput.score1 !== "" && setScoreInput.score2 !== "" && (() => {
                const s1 = parseInt(setScoreInput.score1, 10);
                const s2 = parseInt(setScoreInput.score2, 10);
                if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return null;
                const isDraw = s1 === s2;
                const p1 = parseInt(setScoreInput.penalty1, 10);
                const p2 = parseInt(setScoreInput.penalty2, 10);
                const penaltiesEntered = !isNaN(p1) && !isNaN(p2) && setScoreInput.penalty1 !== "" && setScoreInput.penalty2 !== "";
                const penaltyWinner = penaltiesEntered && p1 !== p2
                  ? (p1 > p2
                    ? setScoreTarget.participants[0]?.inGameId || "Player 1"
                    : setScoreTarget.participants[1]?.inGameId || "Player 2")
                  : null;
                const resultText = isDraw
                  ? penaltyWinner ? `${penaltyWinner} wins (on penalties)` : "Draw — enter penalties below"
                  : s1 > s2
                    ? `${setScoreTarget.participants[0]?.inGameId || "Player 1"} wins`
                    : `${setScoreTarget.participants[1]?.inGameId || "Player 2"} wins`;
                return (
                  <>
                    <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border ${
                      isDraw && !penaltyWinner
                        ? "bg-amber-500/8 border-amber-500/25"
                        : isDraw && penaltyWinner
                          ? "bg-cyan-500/8 border-cyan-500/20"
                          : "bg-cyan-500/8 border-cyan-500/20"
                    }`}>
                      <span className="text-xs text-slate-400">Result:</span>
                      <span className={`text-xs font-bold ${isDraw && !penaltyWinner ? "text-amber-300" : "text-cyan-300"}`}>{resultText}</span>
                    </div>

                    {isDraw && (
                      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2.5">
                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                          Penalty Shootout{(setScoreTarget.format?.best_of ?? 1) === 1 ? " — Required" : ""}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                              {setScoreTarget.participants[0]?.inGameId || "Player 1"}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={setScoreInput.penalty1}
                              onChange={e => setSetScoreInput(prev => ({ ...prev, penalty1: e.target.value }))}
                              placeholder="0"
                              className="w-full bg-slate-800/60 border border-amber-500/30 rounded-xl px-3 py-2 text-center text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60 transition-colors"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                              {setScoreTarget.participants[1]?.inGameId || "Player 2"}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={setScoreInput.penalty2}
                              onChange={e => setSetScoreInput(prev => ({ ...prev, penalty2: e.target.value }))}
                              placeholder="0"
                              className="w-full bg-slate-800/60 border border-amber-500/30 rounded-xl px-3 py-2 text-center text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60 transition-colors"
                            />
                          </div>
                        </div>
                        {penaltiesEntered && p1 === p2 && (
                          <p className="text-[11px] text-rose-400">Penalty scores must not be equal — a winner is required.</p>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Reason <span className="text-slate-700 normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={setScoreInput.reason}
                  onChange={e => setSetScoreInput(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Score confirmed via screenshot"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 transition-colors"
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2.5">
              <button
                onClick={() => { setShowSetScoreModal(false); setSetScoreTarget(null); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { void handleSetScore(); }}
                disabled={(() => {
                  if (isSettingScore) return true;
                  if (isPenaltySubmission) {
                    if (setScoreInput.score1 === "" || setScoreInput.score2 === "") return true;
                    const p1 = parseInt(setScoreInput.score1, 10);
                    const p2 = parseInt(setScoreInput.score2, 10);
                    return isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0 || p1 === p2;
                  }
                  if (setScoreInput.score1 === "" || setScoreInput.score2 === "") return true;
                  const s1 = parseInt(setScoreInput.score1, 10);
                  const s2 = parseInt(setScoreInput.score2, 10);
                  if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return true;
                  if (s1 === s2) {
                    const p1 = parseInt(setScoreInput.penalty1, 10);
                    const p2 = parseInt(setScoreInput.penalty2, 10);
                    if (setScoreInput.penalty1 === "" || setScoreInput.penalty2 === "") return true;
                    if (isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0 || p1 === p2) return true;
                  }
                  return false;
                })()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSettingScore ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isSettingScore ? "Setting…" : isPenaltySubmission ? "Confirm Penalties" : "Confirm Score"}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Match score entry for organizer-as-player */}
      {activeMatchId && user?.id && (
        <MatchActionModal
          matchId={activeMatchId}
          currentUserId={user.id}
          isOrganizer={true}
          onClose={() => setActiveMatchId(null)}
          onActionComplete={() => {
            setActiveMatchId(null);
            if (tournamentId) {
              const refresh = async () => {
                if (isLeague) {
                  try { await tournamentService.recalculateLeagueStandings(tournamentId); } catch { /* silent */ }
                }
                await loadData();
                await loadBracketProgress(tournamentId, { silent: true });
              };
              void refresh();
            }
          }}
        />
      )}
    </div>
  );
};

export default TournamentManage;
