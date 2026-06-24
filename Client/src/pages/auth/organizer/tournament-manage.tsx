import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../../lib/auth-context";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Trophy,
  X,
  RefreshCw,
  List,
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
import {
  TOURNAMENT_ENDPOINTS,
  FINANCE_ENDPOINTS,
} from "../../../config/api.config";
import { showSuccess, showError } from "../../../utils/toast.utils";
import {
  BracketView,
  extractBracketRounds,
  type BracketRound,
} from "../../../components/tournament-detail";
import { TournamentChatPanel } from "../../../components/tournament-chat";
import { MatchActionModal } from "../../../components/league/MatchActionModal";
import {
  TournamentManageHero,
  TournamentResultsCard,
  ParticipantsCard,
  TournamentInfoSidebarCard,
  CoOrganizersCard,
  OrganizerResultsSidebarCard,
  EscrowCard,
  ExtendRegistrationModal,
  WinnersModal,
  CancelTournamentModal,
  RemovePlayerModal,
  RemoveCoOrganizerModal,
  DeleteDraftModal,
  ResolveDisputeModal,
  SetScoreModal,
  ACTIVE_REGISTRANT_STATUSES,
  FINAL_ESCROW_STATUSES,
  extractOrganizerBracketMatches,
  buildEscrowStages,
  type OrganizerBracketMatch,
  type EscrowStageState,
  type CoOrganizerEntry,
  type OrganizerSearchResult,
} from "../../../components/tournament-manage";

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
  const [registrantsPage, setRegistrantsPage] = useState(1);

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
  const [setScoreTarget, setSetScoreTarget] =
    useState<OrganizerBracketMatch | null>(null);
  const [setScoreInput, setSetScoreInput] = useState({
    score1: "",
    score2: "",
    reason: "",
    penalty1: "",
    penalty2: "",
  });
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
  const [openWinnerDropdown, setOpenWinnerDropdown] = useState<number | null>(
    null,
  );
  const [winnerDropdownSearch, setWinnerDropdownSearch] = useState("");
  const [emptyWinnerIndices, setEmptyWinnerIndices] = useState<Set<number>>(
    new Set(),
  );

  const [removeCoOrgTarget, setRemoveCoOrgTarget] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [isRemovingCoOrg, setIsRemovingCoOrg] = useState(false);

  // Co-organizer state
  const [coOrganizers, setCoOrganizers] = useState<CoOrganizerEntry[]>([]);
  const [isLoadingCoOrgs, setIsLoadingCoOrgs] = useState(false);
  const [coOrgSearchResults, setCoOrgSearchResults] = useState<
    OrganizerSearchResult[]
  >([]);
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
      const res = await apiGet(
        `${TOURNAMENT_ENDPOINTS.CO_ORGANIZER_LIST}/${tournamentId}`,
      );
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
    if (!q.trim() || q.trim().length < 2) {
      setCoOrgSearchResults([]);
      return;
    }
    coOrgSearchTimer.current = setTimeout(async () => {
      setIsSearchingCoOrg(true);
      try {
        const res = await apiGet(
          `${TOURNAMENT_ENDPOINTS.CO_ORGANIZER_SEARCH}?q=${encodeURIComponent(q.trim())}`,
        );
        if (res.success)
          setCoOrgSearchResults((res.data as OrganizerSearchResult[]) ?? []);
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
      const res = await apiPost(
        `${TOURNAMENT_ENDPOINTS.CO_ORGANIZER_INVITE}/${tournamentId}/invite`,
        {
          identifier: inviteIdentifier.trim(),
        },
      );
      if (!res.success) {
        const err = (res as { error?: string | { message?: string } }).error;
        throw new Error(
          typeof err === "string"
            ? err
            : ((err as any)?.message ?? "Invite failed."),
        );
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
      const res = await apiDelete(
        `${TOURNAMENT_ENDPOINTS.CO_ORGANIZER_REMOVE}/${tournamentId}/${removeCoOrgTarget.userId}`,
      );
      if (!res.success) {
        const err = (res as { error?: string | { message?: string } }).error;
        throw new Error(
          typeof err === "string"
            ? err
            : ((err as any)?.message ?? "Remove failed."),
        );
      }
      showSuccess(`${removeCoOrgTarget.name} removed as co-organizer.`);
      setCoOrganizers((prev) =>
        prev.filter((co) => {
          const id =
            typeof co.user_id === "string"
              ? co.user_id
              : ((co.user_id as any)?._id ?? co.user_id);
          return String(id) !== removeCoOrgTarget.userId;
        }),
      );
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
      showToast(
        "success",
        force
          ? "Bracket regenerated successfully."
          : "Bracket generated successfully.",
      );
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
      await apiPost(
        `${FINANCE_ENDPOINTS.ESCROW_ALLOCATE_WINNINGS}/${tournamentId}/allocate-winnings`,
        {},
      );
      showToast(
        "success",
        "Winnings allocated — players can now see and claim their prizes.",
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to allocate winnings.",
      );
    } finally {
      setIsAllocatingWinnings(false);
    }
  };

  const handleAllocateEarnings = async () => {
    if (!tournamentId) return;
    setIsAllocatingEarnings(true);
    try {
      await apiPost(
        `${FINANCE_ENDPOINTS.ESCROW_ALLOCATE_EARNINGS}/${tournamentId}/allocate-earnings`,
        {},
      );
      showToast(
        "success",
        "Earnings sent to Finance page — you can now claim them.",
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to send earnings.",
      );
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
    const isPenMode = setScoreTarget.status === "awaiting_penalties";
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
      reason = [setScoreInput.reason || `Penalty shootout: ${s1}–${s2}`]
        .filter(Boolean)
        .join(" · ");
    } else {
      const isDraw = s1 === s2;
      const p1 = parseInt(setScoreInput.penalty1, 10);
      const p2 = parseInt(setScoreInput.penalty2, 10);
      if (isDraw && (isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0 || p1 === p2))
        return;
      finalScore1 = isDraw ? p1 : s1;
      finalScore2 = isDraw ? p2 : s2;
      const penaltyNote = isDraw
        ? `Regular time: ${s1}–${s2} · Penalties: ${p1}–${p2}`
        : "";
      reason =
        [penaltyNote, setScoreInput.reason].filter(Boolean).join(" · ") ||
        undefined;
    }

    setIsSettingScore(true);
    try {
      await organizerService.setMatchScore(
        setScoreTarget.id,
        finalScore1,
        finalScore2,
        reason,
      );
      showToast("success", "Match score set successfully.");
      setShowSetScoreModal(false);
      setSetScoreTarget(null);
      if (tournamentId)
        await loadBracketProgress(tournamentId, { silent: true });
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to set match score.",
      );
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
        inGameId:
          winner.matchStatus === "not_registered" ? "" : winner.inGameId,
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
    const eligibleCount = registrants.filter((r) => r.inGameId).length;
    if (eligibleCount > 0 && defaults.length > eligibleCount) {
      defaults = defaults.slice(0, eligibleCount);
      // Normalize prize percentages so they still sum to 100
      const total = defaults.reduce((sum, r) => sum + r.prizePercentage, 0);
      if (total > 0 && Math.abs(total - 100) > 0.001) {
        let running = 0;
        defaults = defaults.map((row, i) => {
          if (i === defaults.length - 1) {
            return {
              ...row,
              prizePercentage: Math.round((100 - running) * 100) / 100,
            };
          }
          const normalized =
            Math.round((row.prizePercentage / total) * 100 * 100) / 100;
          running += normalized;
          return { ...row, prizePercentage: normalized };
        });
      }
    }

    // Pre-highlight any rows that were cleared (not_registered) so they're immediately visible
    const clearedIndices = new Set(
      defaults
        .map((r, i) => (r.inGameId === "" ? i : -1))
        .filter((i) => i >= 0),
    );
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
        normalized
          .map((_, i) => i)
          .filter((i) => normalized[i].inGameId.length === 0),
      );
      setEmptyWinnerIndices(missing);
      const missingPositions = [...missing]
        .map((i) => `#${winnerRows[i].position}`)
        .join(", ");
      showToast(
        "error",
        `Position${missing.size > 1 ? "s" : ""} ${missingPositions} — select a player.`,
      );
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

  const REGISTRANTS_PAGE_SIZE = 10;
  const registrantsTotalPages = Math.max(
    1,
    Math.ceil(filteredRegistrants.length / REGISTRANTS_PAGE_SIZE),
  );
  const pagedRegistrants = filteredRegistrants.slice(
    (registrantsPage - 1) * REGISTRANTS_PAGE_SIZE,
    registrantsPage * REGISTRANTS_PAGE_SIZE,
  );

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
      const existing = acc.get(key) ?? {
        total: 0,
        completed: 0,
        round: match.round,
      };
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

  const isAcceptedCoOrganizer = coOrganizers.some(
    (co) =>
      co.status === "accepted" &&
      (typeof co.user_id === "string" ? co.user_id : co.user_id?._id) ===
        user?.id,
  );
  const canAccessChat =
    tournament.organizerId === user?.id || isAcceptedCoOrganizer;

  const isLeague = tournament.tournamentType === "league";
  const registrationShortfall =
    tournament.status === "open" &&
    tournament.currentCount < tournament.minParticipants &&
    tournament.minParticipants > 0;
  const leagueSettings = tournament.leagueSettings;
  const canPublish = tournament.status === "draft";
  const canGenerateBracket =
    !isLeague &&
    !["draft", "cancelled", "completed"].includes(tournament.status);
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
    ["awaiting_results", "tournament_active", "disputed"].includes(
      escrowSummary.status,
    );
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
    <div className="min-h-screen w-full overflow-x-hidden">
      <TournamentManageHero
        tournament={tournament}
        activeRegistrants={activeRegistrants}
        checkedInCount={checkedInCount}
        statsOpen={statsOpen}
        setStatsOpen={setStatsOpen}
        onBack={() => navigate("/auth/organizer/tournaments")}
        canPublish={canPublish}
        isPublishing={isPublishing}
        onPublish={() => void handlePublish()}
        canGenerateLeagueFixtures={canGenerateLeagueFixtures}
        isGeneratingFixtures={isGeneratingFixtures}
        onGenerateLeagueFixtures={() => void handleGenerateLeagueFixtures()}
        isRecalculating={isRecalculating}
        onRecalculateStandings={() => void handleRecalculateStandings()}
        canAdvanceMatchweek={canAdvanceMatchweek}
        isAdvancingMatchweek={isAdvancingMatchweek}
        onAdvanceLeagueMatchweek={() => void handleAdvanceLeagueMatchweek()}
        canGenerateBracket={canGenerateBracket}
        hasBracketGenerated={hasBracketGenerated}
        isGeneratingBracket={isGeneratingBracket}
        onGenerateBracket={() => void handleGenerateBracket()}
        canDepositPrizePool={canDepositPrizePool}
        isInitiatingPayment={isInitiatingPayment}
        onPayPrizePool={() => void handlePayPrizePool()}
        canOpenWinnersModal={canOpenWinnersModal}
        canSubmitWinners={canSubmitWinners}
        onOpenWinnersModal={handleOpenWinnersModal}
        canCancel={canCancel}
        isCancelling={isCancelling}
        onRequestCancel={() => setShowCancelConfirm(true)}
        onRequestDelete={() => setShowDeleteConfirm(true)}
      />

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 lg:px-14 xl:px-20 py-4 md:py-6 overflow-x-hidden">
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

        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-start mt-4 md:mt-5 w-full min-w-0">
          {/* ── MAIN column ── */}
          <div className="flex-1 min-w-0 w-full space-y-5 overflow-x-hidden">
            {/* League Section (organizer) */}
            {isLeague &&
              !["draft", "cancelled"].includes(tournament.status) &&
              tournament.id && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden w-full min-w-0">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-800/60 bg-slate-950/20 min-w-0">
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
                    {leagueSettings?.fixturesGenerated &&
                      leagueSettings.currentMatchweek > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                          <span className="text-[11px] text-slate-500">
                            Week
                          </span>
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
                    <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 w-full min-w-0">
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {[
                          {
                            label: "Current Week",
                            value:
                              leagueSettings.currentMatchweek > 0
                                ? String(leagueSettings.currentMatchweek)
                                : "—",
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
                      <div className="w-full overflow-x-auto">
                        <LeagueView
                          tournamentId={tournament.id}
                          currentMatchweek={leagueSettings.currentMatchweek}
                          totalMatchweeks={leagueSettings.totalMatchweeks}
                          legs={leagueSettings.legs}
                          highlightUserId={user?.id}
                          isOrganizer
                          isFixturesGenerated={leagueSettings.fixturesGenerated}
                          onGenerateFixtures={
                            canGenerateLeagueFixtures
                              ? () => void handleGenerateLeagueFixtures()
                              : undefined
                          }
                          isGeneratingFixtures={isGeneratingFixtures}
                          onActionComplete={() => void loadData()}
                        />
                      </div>
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
                    <h2 className="font-display text-sm font-bold text-white">
                      Bracket
                    </h2>
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
                        ${
                          showBracketView
                            ? "text-slate-400 hover:text-cyan-400 hover:bg-white/5"
                            : "text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30 animate-pulse hover:animate-none"
                        }`}
                        >
                          {showBracketView ? "Hide" : "Full bracket"}
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
                  <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-3 sm:space-y-4">
                    {/* Progress bar + inline stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          <span className="text-white font-bold tabular-nums">
                            {completedBracketMatches}
                          </span>
                          <span className="text-slate-600">
                            {" "}
                            / {totalBracketMatches} matches
                          </span>
                        </span>
                        <span
                          className={`text-xs font-bold tabular-nums ${bracketCompletionPercent === 100 ? "text-emerald-400" : "text-cyan-400"}`}
                        >
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
                          const isActive =
                            !round.done &&
                            (i === 0 || bracketRoundStats[i - 1].done);
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
                              <span
                                className={`tabular-nums ${isDone ? "text-emerald-500/70" : isActive ? "text-cyan-500/70" : "text-slate-700"}`}
                              >
                                {isDone || isActive
                                  ? `${round.completed}/${round.total}`
                                  : `0/${round.total}`}
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
                          currentInGameId={
                            registrants.find((r) => r.userId === user?.id)
                              ?.inGameId
                          }
                        />
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

            {/* Tournament Chat */}
            {canAccessChat && (
              <TournamentChatPanel
                tournamentId={tournament.id}
                viewerCanMentionAll
              />
            )}

            <TournamentResultsCard
              tournament={tournament}
              escrowSummary={escrowSummary}
              registrants={registrants}
              bracketRounds={bracketRounds}
              tournamentResults={tournamentResults}
              isLoadingResults={isLoadingResults}
              isAllocatingWinnings={isAllocatingWinnings}
              onAllocateWinnings={() => void handleAllocateWinnings()}
              isAllocatingEarnings={isAllocatingEarnings}
              onAllocateEarnings={() => void handleAllocateEarnings()}
            />

            <ParticipantsCard
              activeRegistrants={activeRegistrants}
              checkedInCount={checkedInCount}
              search={search}
              setSearch={setSearch}
              filteredRegistrants={filteredRegistrants}
              pagedRegistrants={pagedRegistrants}
              registrantsPage={registrantsPage}
              setRegistrantsPage={setRegistrantsPage}
              registrantsTotalPages={registrantsTotalPages}
              registrantsPageSize={REGISTRANTS_PAGE_SIZE}
              actionLoading={actionLoading}
              onCheckIn={(userId) => void handleCheckIn(userId)}
              onUndoCheckIn={(userId) => void handleUndoCheckIn(userId)}
              onRequestRemove={(userId, displayName) => setRemoveTarget({ userId, displayName })}
            />
          </div>
          {/* end main column */}

          {/* ── SIDEBAR ── */}
          <div className="w-full lg:w-72 shrink-0 space-y-4 lg:sticky lg:top-6">
            <TournamentInfoSidebarCard
              tournament={tournament}
              tournamentInfoOpen={tournamentInfoOpen}
              setTournamentInfoOpen={setTournamentInfoOpen}
            />

            {tournament && user && tournament.organizerId === user.id && (
              <CoOrganizersCard
                inviteIdentifier={inviteIdentifier}
                setInviteIdentifier={setInviteIdentifier}
                setCoOrgError={setCoOrgError}
                handleCoOrgSearch={handleCoOrgSearch}
                isInvitingCoOrg={isInvitingCoOrg}
                handleInviteCoOrg={() => void handleInviteCoOrg()}
                isSearchingCoOrg={isSearchingCoOrg}
                coOrgSearchResults={coOrgSearchResults}
                setCoOrgSearchResults={setCoOrgSearchResults}
                coOrgError={coOrgError}
                isLoadingCoOrgs={isLoadingCoOrgs}
                coOrganizers={coOrganizers}
                handleRemoveCoOrg={handleRemoveCoOrg}
              />
            )}

            <OrganizerResultsSidebarCard
              escrowSummary={escrowSummary}
              registrants={registrants}
              bracketRounds={bracketRounds}
            />

            {!tournament.isFree && escrowSummary && (
              <EscrowCard
                escrowSummary={escrowSummary}
                escrowCompletionPercent={escrowCompletionPercent}
                escrowStageCounts={escrowStageCounts}
                escrowStages={escrowStages}
                focusedEscrowStage={focusedEscrowStage}
                visibleEscrowStages={visibleEscrowStages}
                escrowFlowView={escrowFlowView}
                setEscrowFlowView={setEscrowFlowView}
                escrowNeedsAttention={escrowNeedsAttention}
                disputedWinners={disputedWinners}
                registrants={registrants}
              />
            )}
            {/* end escrow conditional */}
          </div>
          {/* end sidebar */}
        </div>
        {/* end flex row */}
      </div>
      {/* end content max-w */}

      {/* Extend Registration Modal */}
      {showExtendModal && (
        <ExtendRegistrationModal
          tournament={tournament}
          extendDate={extendDate}
          setExtendDate={setExtendDate}
          isExtending={isExtending}
          onExtend={handleExtendRegistration}
          onClose={() => setShowExtendModal(false)}
        />
      )}

      {/* Winners Modal */}
      {showWinnersModal && (
        <WinnersModal
          escrowSummary={escrowSummary}
          winnerRows={winnerRows}
          registrants={registrants}
          emptyWinnerIndices={emptyWinnerIndices}
          setEmptyWinnerIndices={setEmptyWinnerIndices}
          openWinnerDropdown={openWinnerDropdown}
          setOpenWinnerDropdown={setOpenWinnerDropdown}
          winnerDropdownSearch={winnerDropdownSearch}
          setWinnerDropdownSearch={setWinnerDropdownSearch}
          handleWinnerRowChange={handleWinnerRowChange}
          handleSubmitWinners={handleSubmitWinners}
          isSubmittingWinners={isSubmittingWinners}
          canSubmitWinners={canSubmitWinners}
          onClose={() => setShowWinnersModal(false)}
        />
      )}

      {/* Cancel Confirm Modal */}
      {showCancelConfirm && (
        <CancelTournamentModal
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          onCancel={handleCancel}
          onClose={() => {
            setShowCancelConfirm(false);
            setCancelReason("");
          }}
        />
      )}

      {/* Remove Player Confirm Modal */}
      {removeTarget && (
        <RemovePlayerModal
          displayName={removeTarget.displayName}
          isRemoving={isRemoving}
          onRemove={handleRemovePlayer}
          onClose={() => setRemoveTarget(null)}
        />
      )}

      {/* Remove Co-organizer Confirm Modal */}
      {removeCoOrgTarget && (
        <RemoveCoOrganizerModal
          name={removeCoOrgTarget.name}
          isRemoving={isRemovingCoOrg}
          onRemove={confirmRemoveCoOrg}
          onClose={() => setRemoveCoOrgTarget(null)}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <DeleteDraftModal
          onDelete={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Resolve Dispute Modal */}
      {showDisputeModal && (
        <ResolveDisputeModal
          disputeWinnerId={disputeWinnerId}
          setDisputeWinnerId={setDisputeWinnerId}
          disputeResolution={disputeResolution}
          setDisputeResolution={setDisputeResolution}
          isResolving={matchActionLoading === disputeMatchId}
          onResolve={() => void handleResolveDispute()}
          onClose={() => setShowDisputeModal(false)}
        />
      )}

      {/* Set Score Modal */}
      {showSetScoreModal && setScoreTarget && (
        <SetScoreModal
          target={setScoreTarget}
          setScoreInput={setScoreInput}
          setSetScoreInput={setSetScoreInput}
          isSettingScore={isSettingScore}
          onSetScore={() => {
            void handleSetScore();
          }}
          onClose={() => {
            setShowSetScoreModal(false);
            setSetScoreTarget(null);
          }}
        />
      )}

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
                  try {
                    await tournamentService.recalculateLeagueStandings(
                      tournamentId,
                    );
                  } catch {
                    /* silent */
                  }
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
