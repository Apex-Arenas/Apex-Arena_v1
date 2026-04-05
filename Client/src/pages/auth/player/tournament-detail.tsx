import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Trophy,
  Users,
  CalendarDays,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  X,
  Shield,
  Gamepad2,
  Globe,
  Award,
  RefreshCw,
} from "lucide-react";
import {
  tournamentService,
  type MyTournamentRegistration,
  type Tournament,
} from "../../../services/tournament.service";
import { apiGet, apiPost } from "../../../utils/api.utils";
import { TOURNAMENT_ENDPOINTS } from "../../../config/api.config";
import { useAuth } from "../../../lib/auth-context";
import { uploadImageMedia } from "../../../services/media-upload.service";
import {
  BRACKET_VISIBLE_STATUSES,
  BracketView,
  DisputeResultModal,
  extractBracketRounds,
  extractEntityId,
  getOpponentLabel,
  getParticipantEntityId,
  getParticipantLabel,
  matchIncludesCurrentPlayer,
  RegisterModal,
  SubmitResultModal,
  WithdrawModal,
  type BracketMatch,
  type BracketRound,
} from "../../../components/tournament-detail";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFee(isFree: boolean, fee: number, currency: string) {
  if (isFree) return "Free";
  return `${currency} ${(fee / 100).toFixed(2)}`;
}

function formatPrize(pesewas: number, currency: string) {
  return `${currency} ${(pesewas / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

const REGISTRATION_STATUS_COLORS: Record<string, string> = {
  registered: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  checked_in: "bg-green-500/20 text-green-300 border-green-500/30",
  pending_payment: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  waitlist: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  withdrawn: "bg-slate-600/20 text-slate-400 border-slate-600/30",
  cancelled: "bg-slate-600/20 text-slate-400 border-slate-600/30",
  disqualified: "bg-red-500/20 text-red-300 border-red-500/30",
};

const ACTIVE_STATUSES = new Set([
  "registered",
  "checked_in",
  "pending_payment",
  "waitlist",
]);

// ─── Main Page ────────────────────────────────────────────────────────────────

const TournamentDetail = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [myRegistration, setMyRegistration] =
    useState<MyTournamentRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [bracketRounds, setBracketRounds] = useState<BracketRound[]>([]);
  const [isLoadingBracket, setIsLoadingBracket] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConfirmingMatch, setIsConfirmingMatch] = useState<string | null>(
    null,
  );
  const [activeSubmitMatch, setActiveSubmitMatch] =
    useState<BracketMatch | null>(null);
  const [submitWinnerId, setSubmitWinnerId] = useState("");
  const [submitVideoUrl, setSubmitVideoUrl] = useState("");
  const [submitScreenshotFile, setSubmitScreenshotFile] = useState<File | null>(
    null,
  );
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [activeDisputeMatch, setActiveDisputeMatch] =
    useState<BracketMatch | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeScreenshotFile, setDisputeScreenshotFile] =
    useState<File | null>(null);
  const [disputeEvidenceUrl, setDisputeEvidenceUrl] = useState("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  const hasFetched = useRef(false);

  const loadRegistration = useCallback(async (tid: string) => {
    try {
      const list = await tournamentService.getMyRegistrations();
      const found = list.find((r) => r.tournamentId === tid) ?? null;
      setMyRegistration(found);
    } catch {
      setMyRegistration(null);
    }
  }, []);

  const loadCheckInStatus = useCallback(async (tid: string) => {
    try {
      const res = await apiGet(
        `${TOURNAMENT_ENDPOINTS.CHECK_IN_STATUS}/${tid}/check-in/status`,
      );
      if (res.success) {
        setCheckInStatus(res.data as Record<string, unknown>);
      }
    } catch {
      // not critical
    }
  }, []);

  const loadBracket = useCallback(async (tid: string) => {
    setIsLoadingBracket(true);
    try {
      const res = await apiGet(
        `${TOURNAMENT_ENDPOINTS.BRACKET}/${tid}/bracket`,
      );
      if (res.success) {
        const rounds = extractBracketRounds(res.data);
        setBracketRounds(rounds);
      }
    } catch {
      setBracketRounds([]);
    } finally {
      setIsLoadingBracket(false);
    }
  }, []);

  const loadAll = useCallback(
    async (silent = false) => {
      if (!tournamentId) return;
      if (!silent) setIsLoading(true);
      try {
        const t = await tournamentService.getTournamentDetail(tournamentId);
        setTournament(t);
        await Promise.all([
          loadRegistration(tournamentId),
          loadCheckInStatus(tournamentId),
        ]);
        if (t && BRACKET_VISIBLE_STATUSES.has(t.status)) {
          void loadBracket(tournamentId);
        }
      } catch {
        if (!silent) setTournament(null);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [tournamentId, loadRegistration, loadCheckInStatus, loadBracket],
  );

  const handleRefresh = useCallback(async () => {
    if (!tournamentId || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const t = await tournamentService.getTournamentDetail(tournamentId);
      setTournament(t);
      await Promise.all([
        loadRegistration(tournamentId),
        loadCheckInStatus(tournamentId),
      ]);
      if (t && BRACKET_VISIBLE_STATUSES.has(t.status)) {
        await loadBracket(tournamentId);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [
    tournamentId,
    isRefreshing,
    loadRegistration,
    loadCheckInStatus,
    loadBracket,
  ]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void loadAll();
  }, [loadAll]);

  // Auto-poll every 10s only while check-in is open.
  // Bracket refresh is now manual to avoid automatic updates in the bracket section.
  useEffect(() => {
    if (!tournament) return;
    const shouldPoll =
      tournament.status === "open" &&
      Boolean(
        checkInStatus?.is_check_in_open ??
        checkInStatus?.check_in_open ??
        false,
      );
    if (!shouldPoll) return;

    const id = window.setInterval(() => {
      void loadAll(true);
    }, 10000);

    return () => window.clearInterval(id);
  }, [tournament?.status, checkInStatus, loadAll]);

  const handleRegisterSuccess = async () => {
    setShowRegisterModal(false);
    setSuccessMsg(
      "You've successfully joined the tournament! Check your status below.",
    );
    if (tournamentId) await loadRegistration(tournamentId);
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  const handleCheckIn = async () => {
    if (!tournamentId) return;
    setIsCheckingIn(true);
    setErrorMsg(null);
    try {
      await apiPost(
        `${TOURNAMENT_ENDPOINTS.CHECK_IN}/${tournamentId}/check-in`,
        {},
      );
      setSuccessMsg("You have checked in successfully!");
      await loadRegistration(tournamentId);
      await loadCheckInStatus(tournamentId);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Check-in failed.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleWithdraw = async () => {
    if (!tournamentId || !myRegistration) return;
    const reason = withdrawReason.trim();
    if (!reason) return;
    setIsWithdrawing(true);
    setErrorMsg(null);
    try {
      await tournamentService.unregister(tournamentId, reason);
      setMyRegistration(null);
      setShowWithdrawModal(false);
      setWithdrawReason("");
      setSuccessMsg("You have withdrawn from the tournament.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Withdrawal failed.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const ensureMatchSessionExists = useCallback(async (matchId: string) => {
    await apiGet(`${TOURNAMENT_ENDPOINTS.MATCH_SESSION}/${matchId}/session`, {
      skipCache: true,
    });
  }, []);

  const uploadMatchEvidence = useCallback(
    async (
      matchId: string,
      file: File,
      description: string,
    ): Promise<string> => {
      const uploadedUrl = await uploadImageMedia(
        file,
        `match-proof/${matchId}`,
      );

      try {
        await ensureMatchSessionExists(matchId);
        await apiPost(
          `${TOURNAMENT_ENDPOINTS.MATCH_SESSION_EVIDENCE}/${matchId}/session/evidence`,
          {
            fileUrl: uploadedUrl,
            fileType: "image",
            description,
          },
        );
      } catch {
        // Evidence endpoint is best-effort. Result submission should still proceed.
      }

      return uploadedUrl;
    },
    [ensureMatchSessionExists],
  );

  const openSubmitResultModal = useCallback((match: BracketMatch) => {
    const participants = (match.participants ?? []).filter(
      (participant) => getParticipantEntityId(participant).length > 0,
    );
    const firstWinner = getParticipantEntityId(participants[0]);

    setActiveSubmitMatch(match);
    setSubmitWinnerId(firstWinner);
    setSubmitVideoUrl("");
    setSubmitScreenshotFile(null);
  }, []);

  const closeSubmitResultModal = useCallback(() => {
    setActiveSubmitMatch(null);
    setSubmitWinnerId("");
    setSubmitVideoUrl("");
    setSubmitScreenshotFile(null);
  }, []);

  const handleSubmitMatchResult = useCallback(async () => {
    if (!activeSubmitMatch) return;

    const matchId = activeSubmitMatch._id ?? activeSubmitMatch.id;
    if (!matchId || !submitWinnerId) {
      setErrorMsg("Please select a winner before submitting.");
      return;
    }

    setIsSubmittingResult(true);
    setErrorMsg(null);

    try {
      const screenshots: string[] = [];

      if (submitScreenshotFile) {
        const proofUrl = await uploadMatchEvidence(
          matchId,
          submitScreenshotFile,
          "Result proof screenshot",
        );
        screenshots.push(proofUrl);
      }

      await tournamentService.submitMatchResult(matchId, {
        winnerId: submitWinnerId,
        proof: {
          screenshots,
          videoUrl: submitVideoUrl.trim() || undefined,
        },
      });

      closeSubmitResultModal();
      setSuccessMsg("Result submitted. Waiting for opponent confirmation.");
      await handleRefresh();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to submit match result.",
      );
    } finally {
      setIsSubmittingResult(false);
    }
  }, [
    activeSubmitMatch,
    closeSubmitResultModal,
    handleRefresh,
    submitScreenshotFile,
    submitVideoUrl,
    submitWinnerId,
    uploadMatchEvidence,
  ]);

  const handleConfirmMatchResult = useCallback(
    async (matchId: string) => {
      setIsConfirmingMatch(matchId);
      setErrorMsg(null);

      try {
        await tournamentService.confirmMatchResult(matchId);
        setSuccessMsg("Result confirmed. Bracket has been updated.");
        await handleRefresh();
        setTimeout(() => setSuccessMsg(null), 5000);
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Failed to confirm match result.",
        );
      } finally {
        setIsConfirmingMatch(null);
      }
    },
    [handleRefresh],
  );

  const openDisputeModal = useCallback((match: BracketMatch) => {
    setActiveDisputeMatch(match);
    setDisputeReason("");
    setDisputeScreenshotFile(null);
    setDisputeEvidenceUrl("");
  }, []);

  const closeDisputeModal = useCallback(() => {
    setActiveDisputeMatch(null);
    setDisputeReason("");
    setDisputeScreenshotFile(null);
    setDisputeEvidenceUrl("");
  }, []);

  const handleSubmitDispute = useCallback(async () => {
    if (!activeDisputeMatch) return;

    const matchId = activeDisputeMatch._id ?? activeDisputeMatch.id;
    if (!matchId || disputeReason.trim().length < 5) {
      setErrorMsg("Please provide a brief dispute reason.");
      return;
    }

    setIsSubmittingDispute(true);
    setErrorMsg(null);

    try {
      const evidence: string[] = [];

      if (disputeScreenshotFile) {
        const evidenceUrl = await uploadMatchEvidence(
          matchId,
          disputeScreenshotFile,
          "Dispute evidence screenshot",
        );
        evidence.push(evidenceUrl);
      }

      if (disputeEvidenceUrl.trim().length > 0) {
        evidence.push(disputeEvidenceUrl.trim());
      }

      await tournamentService.disputeMatchResult(matchId, {
        reason: disputeReason.trim(),
        evidence,
      });

      closeDisputeModal();
      setSuccessMsg("Dispute submitted. Organizer review is required.");
      await handleRefresh();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to submit dispute.",
      );
    } finally {
      setIsSubmittingDispute(false);
    }
  }, [
    activeDisputeMatch,
    closeDisputeModal,
    disputeEvidenceUrl,
    disputeReason,
    disputeScreenshotFile,
    handleRefresh,
    uploadMatchEvidence,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <AlertCircle className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400">Tournament not found.</p>
        <button
          onClick={() => navigate("/auth/tournaments")}
          className="text-cyan-400 text-sm hover:underline"
        >
          Back to Tournaments
        </button>
      </div>
    );
  }

  const isRegistered =
    myRegistration !== null && ACTIVE_STATUSES.has(myRegistration.status);
  const isCheckedIn =
    myRegistration?.checkedIn === true ||
    myRegistration?.status === "checked_in";
  const canWithdraw =
    myRegistration !== null && ACTIVE_STATUSES.has(myRegistration.status);

  const checkInOpen = Boolean(
    checkInStatus?.is_check_in_open ??
    checkInStatus?.check_in_open ??
    checkInStatus?.isOpen ??
    false,
  );
  const checkInStart = checkInStatus?.check_in_start as string | undefined;
  const checkInEnd = checkInStatus?.check_in_end as string | undefined;

  const showBracketSection = BRACKET_VISIBLE_STATUSES.has(tournament.status);
  const canRegister = tournament.status === "open" && !isRegistered;
  const registrationClosed =
    !["open"].includes(tournament.status) && !isRegistered;

  const currentUserId = user?.id;
  const myInGameId = myRegistration?.inGameId;

  const allBracketMatches = bracketRounds.flatMap(
    (round) => round.matches ?? [],
  );

  const myMatches = allBracketMatches.filter((match) =>
    matchIncludesCurrentPlayer(match, currentUserId, myInGameId),
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Back + Refresh */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/auth/tournaments")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Tournaments
        </button>
        <button
          onClick={() => {
            void handleRefresh();
          }}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Toasts */}
      {successMsg && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800">
        {tournament.thumbnailUrl ? (
          <img
            src={tournament.thumbnailUrl}
            alt=""
            className="w-full h-48 sm:h-64 object-cover"
          />
        ) : (
          <div className="w-full h-48 sm:h-64 bg-linear-to-br from-slate-900 via-cyan-950/30 to-slate-900 flex items-center justify-center">
            <Gamepad2 className="w-20 h-20 text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            {tournament.game?.logoUrl && (
              <img
                src={tournament.game.logoUrl}
                alt=""
                className="w-5 h-5 rounded object-cover"
              />
            )}
            <span className="text-xs text-slate-300">
              {tournament.game?.name ?? "Unknown Game"}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full capitalize ml-1
              ${
                tournament.status === "open"
                  ? "bg-green-500/20 text-green-300"
                  : tournament.status === "started" ||
                      tournament.status === "ongoing"
                    ? "bg-blue-500/20 text-blue-300"
                    : tournament.status === "completed"
                      ? "bg-slate-500/20 text-slate-400"
                      : tournament.status === "cancelled"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {tournament.status.replace("_", " ")}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            {tournament.title}
          </h1>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tournament.prizePool && tournament.prizePool > 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-cyan-400" /> Prize Pool
            </p>
            <p className="text-base font-bold text-cyan-300">
              {formatPrize(tournament.prizePool, tournament.currency)}
            </p>
          </div>
        ) : null}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Players
          </p>
          <p className="text-base font-bold text-white">
            {tournament.currentCount} / {tournament.maxParticipants}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> Starts
          </p>
          <p className="text-base font-bold text-white">
            {formatDate(tournament.schedule.tournamentStart)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" /> Entry
          </p>
          <p className="text-base font-bold text-white">
            {formatFee(
              tournament.isFree,
              tournament.entryFee,
              tournament.currency,
            )}
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          {tournament.description && (
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="font-display text-base font-semibold text-white mb-3">
                About This Tournament
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {tournament.description}
              </p>
            </section>
          )}

          {/* Schedule */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="font-display text-base font-semibold text-white mb-4">
              Schedule
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                {
                  label: "Registration Open",
                  value: tournament.schedule.registrationStart,
                },
                {
                  label: "Registration Closes",
                  value: tournament.schedule.registrationEnd,
                },
                {
                  label: "Tournament Start",
                  value: tournament.schedule.tournamentStart,
                },
                {
                  label: "Tournament End",
                  value: tournament.schedule.tournamentEnd,
                },
                {
                  label: "Check-in Opens",
                  value: tournament.schedule.checkInStart ?? checkInStart,
                },
                {
                  label: "Check-in Closes",
                  value: tournament.schedule.checkInEnd ?? checkInEnd,
                },
              ]
                .filter((row) => Boolean(row.value))
                .map((row) => (
                  <div key={row.label} className="flex flex-col gap-0.5">
                    <span className="text-xs text-slate-400">{row.label}</span>
                    <span className="font-medium text-white">
                      {formatDateTime(row.value)}
                    </span>
                  </div>
                ))}
            </div>
          </section>

          {/* Prize Distribution */}
          {!tournament.isFree &&
            tournament.prizeDistribution &&
            tournament.prizeDistribution.length > 0 && (
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="font-display text-base font-semibold text-white mb-4">
                  Prize Distribution
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {tournament.prizeDistribution.slice(0, 3).map((d) => (
                    <div
                      key={d.position}
                      className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-center"
                    >
                      <p className="text-xs text-slate-400 mb-1">
                        {d.position === 1
                          ? "🥇 1st"
                          : d.position === 2
                            ? "🥈 2nd"
                            : "🥉 3rd"}
                      </p>
                      <p className="text-base font-bold text-cyan-300">
                        {d.percentage}%
                      </p>
                      {tournament.prizePool && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatPrize(
                            Math.floor(
                              (tournament.prizePool * d.percentage) / 100,
                            ),
                            tournament.currency,
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* Rules */}
          {tournament.rules && (
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="font-display text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Rules
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {tournament.rules}
              </p>
            </section>
          )}

          {/* Details */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="font-display text-base font-semibold text-white mb-4">
              Details
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Format", value: tournament.format },
                { label: "Type", value: tournament.tournamentType },
                { label: "Region", value: tournament.region },
                {
                  label: "Min Players",
                  value:
                    tournament.minParticipants > 0
                      ? String(tournament.minParticipants)
                      : null,
                },
                {
                  label: "Visibility",
                  value: tournament.visibility
                    ? tournament.visibility.charAt(0).toUpperCase() +
                      tournament.visibility.slice(1)
                    : null,
                },
              ]
                .filter((row) => Boolean(row.value))
                .map((row) => (
                  <div key={row.label}>
                    <p className="text-xs text-slate-400">{row.label}</p>
                    <p className="font-medium text-white capitalize mt-0.5">
                      {row.value}
                    </p>
                  </div>
                ))}
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Registration card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-white">
              {isRegistered ? "My Registration" : "Join Tournament"}
            </h2>

            {isRegistered && myRegistration ? (
              <>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border capitalize
                  ${REGISTRATION_STATUS_COLORS[myRegistration.status] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {myRegistration.status.replace("_", " ")}
                </div>

                <div className="text-xs text-slate-400 space-y-1.5">
                  <p>Joined: {formatDate(myRegistration.registeredAt)}</p>
                  {isCheckedIn && (
                    <p className="text-green-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Checked in
                    </p>
                  )}
                </div>

                {/* Check-in button */}
                {checkInOpen &&
                  !isCheckedIn &&
                  myRegistration.status === "registered" && (
                    <button
                      onClick={() => {
                        void handleCheckIn();
                      }}
                      disabled={isCheckingIn}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500 text-slate-950 text-sm font-semibold hover:bg-green-400 disabled:opacity-60 transition-colors"
                    >
                      {isCheckingIn ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {isCheckingIn ? "Checking in…" : "Check In Now"}
                    </button>
                  )}

                {/* Check-in window info */}
                {!checkInOpen &&
                  !isCheckedIn &&
                  myRegistration.status === "registered" && (
                    <div className="flex items-start gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Check-in is not open yet.
                        {tournament.schedule.checkInStart
                          ? ` Opens ${formatDateTime(tournament.schedule.checkInStart)}.`
                          : ""}
                      </span>
                    </div>
                  )}

                {/* Withdraw */}
                {canWithdraw && myRegistration.status !== "checked_in" && (
                  <button
                    onClick={() => setShowWithdrawModal(true)}
                    className="w-full py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm font-medium hover:bg-red-500 hover:text-white transition-colors"
                  >
                    Withdraw
                  </button>
                )}
              </>
            ) : canRegister ? (
              <>
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {tournament.currentCount} / {tournament.maxParticipants}{" "}
                    players
                  </p>
                  {!tournament.isFree && (
                    <p className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      Entry fee deducted from wallet
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="w-full py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 transition-colors"
                >
                  Join Tournament
                </button>
              </>
            ) : registrationClosed ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Lock className="w-4 h-4 shrink-0" />
                Registration is{" "}
                {tournament.status === "completed"
                  ? "closed (tournament ended)"
                  : "not open yet"}
              </div>
            ) : null}
          </div>

          {/* Tournament info summary */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Format</span>
              <span className="text-white font-medium capitalize">
                {tournament.format ?? "Solo"}
              </span>
            </div>
            <div className="h-px bg-slate-800" />
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Type</span>
              <span className="text-white font-medium capitalize">
                {tournament.tournamentType ?? "Standard"}
              </span>
            </div>
            {tournament.region && (
              <>
                <div className="h-px bg-slate-800" />
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Region</span>
                  <span className="text-white font-medium">
                    {tournament.region}
                  </span>
                </div>
              </>
            )}
            <div className="h-px bg-slate-800" />
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Min Players</span>
              <span className="text-white font-medium">
                {tournament.minParticipants}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Registered-only & bracket sections ── */}

      {/* Check-in banner (prominent when window is open and registered but not checked in) */}
      {isRegistered && checkInOpen && !isCheckedIn && (
        <section className="rounded-xl border border-green-500/40 bg-green-500/10 p-5 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-green-200">
                Check-in is now open!
              </p>
              <p className="text-sm text-green-300/80 mt-0.5">
                Make sure to check in before the window closes to keep your
                spot.
                {checkInEnd ? ` Closes ${formatDateTime(checkInEnd)}.` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              void handleCheckIn();
            }}
            disabled={isCheckingIn}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-slate-950 text-sm font-semibold hover:bg-green-400 disabled:opacity-60 transition-colors"
          >
            {isCheckingIn ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isCheckingIn ? "Checking in…" : "Check In"}
          </button>
        </section>
      )}

      {/* Bracket */}
      {showBracketSection && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-cyan-400" />
              Tournament Bracket
            </h2>
            <button
              onClick={() => {
                void handleRefresh();
              }}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {isLoadingBracket ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : (
            <BracketView rounds={bracketRounds} />
          )}
        </section>
      )}

      {/* My Match Voting */}
      {isRegistered && showBracketSection && (
        <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
          <h2 className="font-display text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
            My Match Voting
          </h2>

          {myMatches.length === 0 ? (
            <p className="text-sm text-slate-400">
              No active matches for your registration yet. Your voting actions
              will appear here when your bracket match is ready.
            </p>
          ) : (
            <div className="space-y-3">
              {myMatches.map((match, index) => {
                const matchId = match._id ?? match.id ?? "";
                const reporterId = extractEntityId(match.result_reported_by);
                const confirmerId = extractEntityId(match.result_confirmed_by);
                const winnerId = extractEntityId(match.winner_id);
                const disputeActive = Boolean(
                  match.dispute?.is_disputed && !match.dispute?.resolved,
                );
                const isCompleted = match.status === "completed";
                const iReported = Boolean(
                  currentUserId && reporterId === currentUserId,
                );
                const isConfirmLoading = isConfirmingMatch === matchId;

                const canSubmitResult =
                  Boolean(matchId) &&
                  !reporterId &&
                  !disputeActive &&
                  !isCompleted &&
                  ["scheduled", "ready_check", "ongoing"].includes(
                    match.status ?? "",
                  );

                const canConfirmResult =
                  Boolean(matchId) &&
                  Boolean(reporterId) &&
                  !disputeActive &&
                  !isCompleted &&
                  Boolean(currentUserId) &&
                  reporterId !== currentUserId;

                const canDisputeResult = canConfirmResult;

                const winnerParticipant = (match.participants ?? []).find(
                  (participant) =>
                    getParticipantEntityId(participant) === winnerId,
                );

                const statusText = disputeActive
                  ? "Result disputed - waiting for organizer resolution"
                  : isCompleted
                    ? "Match completed"
                    : reporterId && confirmerId
                      ? "Result confirmed"
                      : iReported
                        ? "Awaiting opponent confirmation"
                        : reporterId
                          ? "Opponent submitted a result"
                          : "Result not submitted yet";

                return (
                  <div
                    key={matchId || index}
                    className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Match #{match.match_number ?? index + 1}
                        </p>
                        <p className="text-xs text-slate-400">
                          Round {match.round ?? match.round_number ?? 1} •
                          Opponent:{" "}
                          {getOpponentLabel(match, currentUserId, myInGameId)}
                        </p>
                      </div>
                      <span className="text-[11px] uppercase tracking-wide text-slate-300 px-2.5 py-1 rounded-full border border-slate-600 bg-slate-800/60">
                        {match.status ?? "pending"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      <p>{statusText}</p>
                      {winnerParticipant && (
                        <p className="text-cyan-300">
                          Submitted winner:{" "}
                          {getParticipantLabel(winnerParticipant)}
                        </p>
                      )}
                      {match.dispute?.is_disputed &&
                        match.dispute?.dispute_reason && (
                          <p className="text-amber-300">
                            Dispute reason: {match.dispute.dispute_reason}
                          </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canSubmitResult && (
                        <button
                          onClick={() => openSubmitResultModal(match)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors"
                        >
                          Submit Result
                        </button>
                      )}

                      {canConfirmResult && (
                        <button
                          onClick={() => {
                            void handleConfirmMatchResult(matchId);
                          }}
                          disabled={isConfirmLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-green-500 text-slate-950 hover:bg-green-400 disabled:opacity-60 transition-colors"
                        >
                          {isConfirmLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {isConfirmLoading
                            ? "Confirming..."
                            : "Confirm Result"}
                        </button>
                      )}

                      {canDisputeResult && (
                        <button
                          onClick={() => openDisputeModal(match)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Dispute Result
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Modals */}
      {showRegisterModal && (
        <RegisterModal
          tournament={tournament}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            void handleRegisterSuccess();
          }}
        />
      )}

      <SubmitResultModal
        match={activeSubmitMatch}
        winnerId={submitWinnerId}
        onWinnerChange={setSubmitWinnerId}
        videoUrl={submitVideoUrl}
        onVideoUrlChange={setSubmitVideoUrl}
        onScreenshotChange={setSubmitScreenshotFile}
        isSubmitting={isSubmittingResult}
        onClose={closeSubmitResultModal}
        onSubmit={() => {
          void handleSubmitMatchResult();
        }}
      />

      <DisputeResultModal
        match={activeDisputeMatch}
        reason={disputeReason}
        onReasonChange={setDisputeReason}
        evidenceUrl={disputeEvidenceUrl}
        onEvidenceUrlChange={setDisputeEvidenceUrl}
        onScreenshotChange={setDisputeScreenshotFile}
        isSubmitting={isSubmittingDispute}
        onClose={closeDisputeModal}
        onSubmit={() => {
          void handleSubmitDispute();
        }}
      />

      <WithdrawModal
        open={showWithdrawModal}
        tournamentTitle={tournament.title}
        reason={withdrawReason}
        onReasonChange={setWithdrawReason}
        isWithdrawing={isWithdrawing}
        onClose={() => {
          setShowWithdrawModal(false);
          setWithdrawReason("");
        }}
        onConfirm={() => {
          void handleWithdraw();
        }}
      />
    </div>
  );
};

export default TournamentDetail;
