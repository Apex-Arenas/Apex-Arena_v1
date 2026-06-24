import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Trophy,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  X,
  Shield,
  Gamepad2,
  Globe,
  RefreshCw,
  Loader2,
  Swords,
  LogOut,
  Share2,
  CreditCard,
  MessageCircle,
} from "lucide-react";
import {
  tournamentService,
  type MyTournamentRegistration,
  type Tournament,
} from "../../../services/tournament.service";
import { apiGet, apiPost } from "../../../utils/api.utils";
import { TOURNAMENT_ENDPOINTS, FINANCE_ENDPOINTS } from "../../../config/api.config";
import { useAuth } from "../../../lib/auth-context";
import { FadeImage } from "../../../components/ui/FadeImage";
import {
  BRACKET_VISIBLE_STATUSES,
  BracketView,
  extractBracketRounds,
  getOpponentLabel,
  matchIncludesCurrentPlayer,
  RegisterModal,
  WithdrawModal,
  ExpandableText,
  PageSkeleton,
  TournamentStatsStrip,
  ScheduleCard,
  PrizeDistributionCard,
  TournamentInfoCard,
  DetailsCard,
  formatDate,
  formatDateTime,
  formatPrize,
  STATUS_META,
  REG_STATUS_META,
  ACTIVE_STATUSES,
  type BracketRound,
} from "../../../components/tournament-detail";
import { TournamentChatPanel } from "../../../components/tournament-chat";
import { tournamentChatService } from "../../../services/tournament-chat.service";
import { LeagueView } from "../../../components/league/LeagueView";
import { MatchActionModal } from "../../../components/league/MatchActionModal";

// ─── Main Page ────────────────────────────────────────────────────────────────

const TournamentDetail = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [isCompletingPayment, setIsCompletingPayment] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [paymentCountdown, setPaymentCountdown] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [isChatUnread, setIsChatUnread] = useState(false);
  const chatSectionRef = useRef<HTMLDivElement>(null);
  const chatAutoOpenedRef = useRef(false);

  const hasFetched = useRef(false);

  // Auto-withdraw countdown when payment is pending (12 hours)
  useEffect(() => {
    if (myRegistration?.status !== "pending_payment") {
      setPaymentCountdown(null);
      return;
    }
    setPaymentCountdown(3 * 60 * 60);
    const interval = setInterval(() => {
      setPaymentCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [myRegistration?.status]);

  // Trigger auto-withdraw when countdown hits 0
  useEffect(() => {
    if (paymentCountdown !== 0 || !tournamentId || !myRegistration) return;
    tournamentService.unregister(tournamentId, "Payment not completed").then(() => {
      setMyRegistration(null);
      setSuccessMsg("Registration cancelled — payment was not completed.");
      setTimeout(() => setSuccessMsg(null), 6000);
    }).catch(() => {});
  }, [paymentCountdown, tournamentId, myRegistration]);

  const loadRegistration = useCallback(async (tid: string) => {
    try {
      const list = await tournamentService.getMyRegistrations();
      setMyRegistration(list.find((r) => r.tournamentId === tid) ?? null);
    } catch {
      setMyRegistration(null);
    }
  }, []);

  const loadCheckInStatus = useCallback(async (tid: string) => {
    try {
      const res = await apiGet(
        `${TOURNAMENT_ENDPOINTS.CHECK_IN_STATUS}/${tid}/check-in/status`,
      );
      if (res.success) setCheckInStatus(res.data as Record<string, unknown>);
    } catch {
      /* not critical */
    }
  }, []);

  const loadBracket = useCallback(async (tid: string) => {
    setIsLoadingBracket(true);
    try {
      const res = await apiGet(
        `${TOURNAMENT_ENDPOINTS.BRACKET}/${tid}/bracket`,
      );
      if (res.success) setBracketRounds(extractBracketRounds(res.data));
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
        if (t && BRACKET_VISIBLE_STATUSES.has(t.status))
          void loadBracket(tournamentId);
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
      if (t && BRACKET_VISIBLE_STATUSES.has(t.status))
        await loadBracket(tournamentId);
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

  useEffect(() => {
    if (!tournament) return;
    const shouldPoll =
      tournament.status === "open" &&
      Boolean(
        (checkInStatus?.checkInWindow as { isOpen?: boolean } | undefined)
          ?.isOpen ??
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

  // Unread chat dot + "?chat=1" deep link (used by mention notifications)
  useEffect(() => {
    if (!tournament) return;
    const canAccess =
      (myRegistration !== null && ACTIVE_STATUSES.has(myRegistration.status)) ||
      tournament.organizerId === user?.id;
    if (!canAccess) return;

    tournamentChatService.getUnreadStatus(tournament.id).then(setIsChatUnread).catch(() => {});

    if (!chatAutoOpenedRef.current && searchParams.get("chat") === "1") {
      chatAutoOpenedRef.current = true;
      setIsChatUnread(false);
      setShowChat(true);
      requestAnimationFrame(() =>
        chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }, [tournament, myRegistration, user?.id, searchParams]);

  const handleRegisterSuccess = async () => {
    setShowRegisterModal(false);
    setSuccessMsg("You've successfully joined the tournament!");
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

  const handleCompletePayment = async () => {
    if (!myRegistration?.registrationId) return;
    setIsCompletingPayment(true);
    setErrorMsg(null);
    try {
      const payRes = await apiPost(FINANCE_ENDPOINTS.TOURNAMENT_PAYMENT_INITIATE, {
        registration_id: myRegistration.registrationId,
        callback_url: `${window.location.origin}/payment-callback.html?type=entry`,
      });
      if (!payRes.success) {
        const err = (payRes as { error?: string | { message?: string } }).error;
        throw new Error((typeof err === "string" ? err : err?.message) ?? "Could not initiate payment.");
      }
      const payData = payRes.data as { authorization_url?: string };
      if (payData.authorization_url) {
        window.location.href = payData.authorization_url;
        return;
      }
      throw new Error("No payment URL returned. Please try again.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Payment initiation failed.");
    } finally {
      setIsCompletingPayment(false);
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

  const handleShare = async () => {
    if (!tournament) return;
    const url = window.location.href;
    const shareData = {
      title: tournament.title,
      text: `Join "${tournament.title}"${tournament.game?.name ? ` — ${tournament.game.name}` : ""} tournament on Apex Arenas!`,
      url,
    };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setSuccessMsg("Tournament link copied to clipboard!");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch {
      // user cancelled or share failed — do nothing
    }
  };

  if (isLoading) return <PageSkeleton />;

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-slate-600" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-white mb-1">
            Tournament Not Found
          </h2>
          <p className="text-sm text-slate-400">
            This tournament may have been removed or the link is invalid.
          </p>
        </div>
        <button
          onClick={() => navigate("/auth/tournaments")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
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
    myRegistration !== null &&
    ACTIVE_STATUSES.has(myRegistration.status) &&
    !isCheckedIn &&
    !["locked", "started", "ongoing", "in_progress", "completed", "cancelled"].includes(tournament.status);
  const canAccessChat = isRegistered || tournament.organizerId === user?.id;

  const checkInWindow = checkInStatus?.checkInWindow as
    | { start?: string; end?: string; isOpen?: boolean }
    | undefined;
  const checkInStart =
    checkInWindow?.start ??
    (checkInStatus?.check_in_start as string | undefined) ??
    tournament.schedule.checkInStart;
  const checkInEnd =
    checkInWindow?.end ??
    (checkInStatus?.check_in_end as string | undefined) ??
    tournament.schedule.checkInEnd;

  const checkInOpenFromApi = Boolean(
    checkInWindow?.isOpen ??
    checkInStatus?.is_check_in_open ??
    checkInStatus?.check_in_open ??
    checkInStatus?.isOpen ??
    false,
  );
  const now = Date.now();
  const checkInOpenFromSchedule = Boolean(
    checkInStart &&
    checkInEnd &&
    now >= new Date(checkInStart).getTime() &&
    now <= new Date(checkInEnd).getTime(),
  );
  const checkInOpen = checkInOpenFromApi || checkInOpenFromSchedule;

  const isLeague = tournament.tournamentType === "league";
  const showBracketSection =
    !isLeague && BRACKET_VISIBLE_STATUSES.has(tournament.status);

  const regStart = tournament.schedule.registrationStart;
  const regEnd = tournament.schedule.registrationEnd;
  const regWindowOpen =
    (!regStart || now >= new Date(regStart).getTime()) &&
    (!regEnd || now <= new Date(regEnd).getTime());

  const canRegister =
    (tournament.status === "open" ||
      (tournament.status === "published" && regWindowOpen)) &&
    !isRegistered;
  const registrationClosed = !canRegister && !isRegistered;

  const currentUserId = user?.id;
  const myInGameId = myRegistration?.inGameId;
  const allBracketMatches = bracketRounds.flatMap((r) => r.matches ?? []);
  const myMatches = allBracketMatches.filter((m) =>
    matchIncludesCurrentPlayer(m, currentUserId, myInGameId),
  );

  const statusMeta = STATUS_META[tournament.status] ?? {
    label: tournament.status.replace(/_/g, " "),
    dot: "bg-slate-500",
    text: "text-slate-300",
  };
  const regMeta = myRegistration
    ? (REG_STATUS_META[myRegistration.status] ?? null)
    : null;

  const imageUrl = tournament.thumbnailUrl ?? tournament.bannerUrl ?? null;

  const prizeGhs =
    tournament.prizePool && tournament.prizePool > 0
      ? formatPrize(tournament.prizePool, tournament.currency)
      : null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Cover */}
        <div className="relative h-52 sm:h-64 overflow-hidden bg-slate-900">
          {imageUrl ? (
            <>
              <FadeImage
                src={imageUrl}
                alt={tournament.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-br from-orange-600/40 via-transparent to-violet-700/40" />
            </>
          ) : tournament.game?.logoUrl ? (
            <>
              <div className="absolute inset-0 bg-linear-to-br from-orange-950 via-slate-900 to-violet-950" />
              <FadeImage
                src={tournament.game.logoUrl}
                alt={tournament.title}
                className="absolute inset-0 w-full h-full object-contain p-8"
              />
              <div className="absolute inset-0 bg-linear-to-br from-orange-600/30 via-transparent to-violet-700/30" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-linear-to-br from-orange-950 via-slate-900 to-violet-950" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[48px_48px]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Gamepad2 className="w-24 h-24 text-slate-800" />
              </div>
            </>
          )}
          {/* Bottom fade */}
          <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/50 to-transparent" />

          {/* Status chip — top right */}
          <div className="absolute top-4 right-4">
            <span
              className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-white/10 ${statusMeta.text}`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${statusMeta.dot}`}
              />
              {statusMeta.label}
            </span>
          </div>

          {/* Registration status chip — top left (when registered) */}
          {isRegistered && regMeta && (
            <div className="absolute top-4 left-4">
              <span
                className={`text-[11px] px-3 py-1.5 rounded-full font-bold border backdrop-blur-sm ${regMeta.cls}`}
              >
                {regMeta.label}
              </span>
            </div>
          )}

          {/* Prize badge — bottom right */}
          {prizeGhs && (
            <div className="absolute bottom-4 right-4">
              <span className="text-sm font-bold text-amber-300 bg-slate-950/80 backdrop-blur-sm px-3 py-1 rounded-full border border-amber-400/25 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                {prizeGhs}
              </span>
            </div>
          )}
        </div>

        {/* Title section */}
        <div className="relative bg-slate-900 border-b border-slate-800 overflow-hidden">
          {/* Subtle grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          {/* Orange glow right */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 55% 100% at 100% 50%, rgba(249,115,22,0.12), transparent)",
            }}
          />

          <div className="relative px-6 py-5 sm:px-8">
            {/* Back + Share + Refresh row */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => navigate("/auth/tournaments")}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-orange-400 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to Tournaments
              </button>
              <div className="flex items-center gap-2">
                {canAccessChat && (
                  <button
                    onClick={() => {
                      setIsChatUnread(false);
                      setShowChat(true);
                      requestAnimationFrame(() =>
                        chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
                      );
                    }}
                    className="relative flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-400 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Chat
                    {isChatUnread && (
                      <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-orange-500" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => {
                    void handleShare();
                  }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-400 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
                <button
                  onClick={() => {
                    void handleRefresh();
                  }}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  {isRefreshing ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>

            {/* Title + meta */}
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight text-center sm:text-left">
              {tournament.title}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center sm:justify-start">
              <span className="text-sm text-slate-400">
                {tournament.game?.name ?? "Unknown Game"}
              </span>
              {tournament.format && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                  {tournament.format}
                </span>
              )}
              {tournament.region && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                  {tournament.region === "GLOBAL"
                    ? "Global"
                    : tournament.region}
                </span>
              )}
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  statusMeta.text === "text-emerald-300"
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                    : statusMeta.text === "text-orange-300"
                      ? "bg-orange-500/10 border-orange-500/25 text-orange-300"
                      : statusMeta.text === "text-amber-300"
                        ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
                        : statusMeta.text === "text-cyan-300"
                          ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-300"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusMeta.dot}`}
                />
                {statusMeta.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-6">
        {/* Toasts */}
        {successMsg && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)}>
              <X className="w-4 h-4 opacity-60 hover:opacity-100" />
            </button>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)}>
              <X className="w-4 h-4 opacity-60 hover:opacity-100" />
            </button>
          </div>
        )}

        {/* ── Stats strip ───────────────────────────────────────────────────── */}
        <TournamentStatsStrip tournament={tournament} prizeGhs={prizeGhs} />

        {/* Check-in banner */}
        {isRegistered && checkInOpen && !isCheckedIn && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-5 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Clock className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-emerald-200">
                  Check-in is open!
                </p>
                <p className="text-sm text-emerald-300/70 mt-0.5">
                  Check in now to secure your spot.
                  {checkInEnd ? ` Closes ${formatDateTime(checkInEnd)}.` : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                void handleCheckIn();
              }}
              disabled={isCheckingIn}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-sm font-bold hover:bg-emerald-400 disabled:opacity-60 transition-colors"
            >
              {isCheckingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {isCheckingIn ? "Checking in…" : "Check In"}
            </button>
          </div>
        )}

        {/* ── Main layout ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Description */}
            {tournament.description && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-orange-400" />
                  About This Tournament
                </h2>
                <ExpandableText text={tournament.description} />
              </section>
            )}

            {/* Schedule */}
            <ScheduleCard tournament={tournament} checkInStart={checkInStart} checkInEnd={checkInEnd} />

            {/* Prize Distribution */}
            <PrizeDistributionCard tournament={tournament} />

            {/* Rules */}
            {tournament.rules && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-400" />
                  Rules
                </h2>
                <ExpandableText text={tournament.rules} />
              </section>
            )}

          </div>

          {/* ── Right sidebar ────────────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Registration card */}
            <div
              className={`rounded-2xl border bg-slate-900 overflow-hidden ${
                isRegistered
                  ? isCheckedIn
                    ? "border-emerald-500/30"
                    : "border-orange-500/25"
                  : canRegister
                    ? "border-orange-500/30"
                    : "border-slate-800"
              }`}
            >
              {/* Card header */}
              <div
                className={`px-5 py-4 border-b flex items-center justify-between ${
                  isRegistered
                    ? isCheckedIn
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-orange-500/15 bg-orange-500/5"
                    : canRegister
                      ? "border-orange-500/20 bg-orange-500/5"
                      : "border-slate-800"
                }`}
              >
                <h2 className="font-display text-base font-bold text-white">
                  {isRegistered ? "My Registration" : "Join Tournament"}
                </h2>
                {isRegistered && regMeta && (
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${regMeta.cls}`}
                  >
                    {regMeta.label}
                  </span>
                )}
              </div>

              <div className="p-5 space-y-4">
                {isRegistered && myRegistration ? (
                  <>
                    {/* Meta rows */}
                    <div className="space-y-0 rounded-xl border border-slate-800 overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-slate-800/60 gap-1 sm:gap-3">
                        <span className="text-xs text-slate-500">Joined</span>
                        <span className="text-xs font-bold text-white truncate">
                          {formatDate(myRegistration.registeredAt)}
                        </span>
                      </div>
                      {myRegistration.inGameId && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-slate-800/60 gap-1 sm:gap-3">
                          <span className="text-xs text-slate-500">
                            In-Game ID
                          </span>
                          <span className="text-xs font-bold text-orange-300 truncate">
                            {myRegistration.inGameId}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 gap-1 sm:gap-3">
                        <span className="text-xs text-slate-500">Check-in</span>
                        {isCheckedIn ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Done
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Complete Payment button + countdown */}
                    {myRegistration.status === "pending_payment" && (
                      <div className="space-y-2">
                        {paymentCountdown !== null && (
                          <div className="flex items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                            <div className="flex items-center gap-2 text-xs text-amber-300">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>Auto-withdraw in</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-amber-200 tabular-nums">
                              {String(Math.floor(paymentCountdown / 3600)).padStart(2, "0")}:
                              {String(Math.floor((paymentCountdown % 3600) / 60)).padStart(2, "0")}:
                              {String(paymentCountdown % 60).padStart(2, "0")}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => { setPaymentCountdown(null); void handleCompletePayment(); }}
                          disabled={isCompletingPayment}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 text-slate-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-60 transition-colors"
                        >
                          {isCompletingPayment ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                          {isCompletingPayment ? "Redirecting…" : "Complete Payment"}
                        </button>
                      </div>
                    )}

                    {/* Check-in button */}
                    {checkInOpen &&
                      !isCheckedIn &&
                      myRegistration.status === "registered" && (
                        <button
                          onClick={() => {
                            void handleCheckIn();
                          }}
                          disabled={isCheckingIn}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-slate-950 text-sm font-bold hover:bg-emerald-400 disabled:opacity-60 transition-colors"
                        >
                          {isCheckingIn ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          {isCheckingIn ? "Checking in…" : "Check In Now"}
                        </button>
                      )}

                    {/* Check-in window not open */}
                    {!checkInOpen &&
                      !isCheckedIn &&
                      myRegistration.status === "registered" && (
                        <div className="flex items-start gap-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" />
                          <span>
                            Check-in not open yet.
                            {tournament.schedule.checkInStart
                              ? ` Opens ${formatDateTime(tournament.schedule.checkInStart)}.`
                              : ""}
                          </span>
                        </div>
                      )}

                    {/* Withdraw */}
                    {canWithdraw && (
                      <button
                        onClick={() => setShowWithdrawModal(true)}
                        className="w-full py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold hover:bg-red-500 hover:text-white hover:border-red-500 transition-all flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Withdraw
                      </button>
                    )}
                  </>
                ) : canRegister ? (
                  <>
                    {/* Capacity bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span>Spots filled</span>
                        <span className="font-semibold text-white">
                          {tournament.currentCount} /{" "}
                          {tournament.maxParticipants}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-orange-500 to-amber-400 transition-all"
                          style={{
                            width: `${Math.min(100, (tournament.currentCount / tournament.maxParticipants) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    {!tournament.isFree && tournament.entryFee > 0 && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5">
                        <Globe className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        You'll be redirected to pay via Mobile Money or card
                      </div>
                    )}
                    <button
                      onClick={() => setShowRegisterModal(true)}
                      className="w-full py-3 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
                    >
                      <Swords className="w-4 h-4" />
                      Join Tournament
                    </button>
                  </>
                ) : registrationClosed ? (() => {
                  const startIso = tournament.schedule.tournamentStart;
                  const startPassed = startIso ? Date.now() > new Date(startIso).getTime() : false;
                  const startTime = startIso
                    ? new Date(startIso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : null;
                  const regOpenTime = regStart
                    ? new Date(regStart).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : null;

                  let msg: string;
                  let isAmber = false;
                  if (tournament.status === "locked") {
                    isAmber = !startPassed;
                    msg = startPassed
                      ? "Registration closed — awaiting tournament start"
                      : `Registration closed · Starts ${startTime ?? "soon"}`;
                  } else if (tournament.status === "published") {
                    if (regStart && Date.now() < new Date(regStart).getTime()) {
                      isAmber = true;
                      msg = `Registration opens ${regOpenTime ?? "soon"}`;
                    } else {
                      msg = "Registration has closed";
                    }
                  } else if (["started", "ongoing", "in_progress"].includes(tournament.status)) {
                    msg = "Tournament is in progress";
                  } else if (tournament.status === "completed") {
                    msg = "Tournament has ended";
                  } else if (tournament.status === "cancelled") {
                    msg = "Tournament was cancelled";
                  } else {
                    msg = "Registration is not open";
                  }

                  return (
                    <div className={`flex items-center gap-2.5 text-sm bg-slate-800/60 border rounded-xl px-4 py-3 ${isAmber ? "border-amber-500/20 text-amber-300" : "border-slate-700 text-slate-400"}`}>
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>{msg}</span>
                    </div>
                  );
                })() : null}
              </div>
            </div>

            {/* Quick stats sidebar */}
            <TournamentInfoCard tournament={tournament} />

            {/* Details */}
            <DetailsCard tournament={tournament} />
          </div>
        </div>

        {/* ── League View ───────────────────────────────────────────────────── */}
        {isLeague && !["draft", "cancelled"].includes(tournament.status) && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="font-display text-base font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-orange-400" />
              League
            </h2>
            <LeagueView
              tournamentId={tournament.id}
              currentMatchweek={
                tournament.leagueSettings?.currentMatchweek ?? 0
              }
              totalMatchweeks={tournament.leagueSettings?.totalMatchweeks ?? 0}
              legs={tournament.leagueSettings?.legs ?? 1}
              highlightUserId={currentUserId}
              onActionComplete={() => void handleRefresh()}
            />
          </section>
        )}

        {/* ── Bracket ───────────────────────────────────────────────────────── */}
        {showBracketSection && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-orange-400" />
                Tournament Bracket
              </h2>
              <button
                onClick={() => {
                  void handleRefresh();
                }}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                />
                {isRefreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {isLoadingBracket ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : bracketRounds.length > 0 ? (
              <>
                {/* Progress Stats */}
                <div className="px-5 py-4 bg-slate-900/40 border-b border-slate-800/60 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-800/30 p-3 text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-1">
                      Rounds
                    </p>
                    <p className="text-xl font-display font-bold text-cyan-400">
                      {bracketRounds.length}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-800/30 p-3 text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-1">
                      Total Matches
                    </p>
                    <p className="text-xl font-display font-bold text-orange-400">
                      {allBracketMatches.length}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-800/30 p-3 text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-1">
                      Completed
                    </p>
                    <p className="text-xl font-display font-bold text-emerald-400">
                      {
                        allBracketMatches.filter(
                          (m) =>
                            m.status === "completed" || m.status === "final",
                        ).length
                      }
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-5 py-4 bg-slate-900/20 border-b border-slate-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-semibold">
                      Tournament Progress
                    </span>
                    <span className="text-xs font-bold text-white">
                      {Math.round(
                        (allBracketMatches.filter(
                          (m) =>
                            m.status === "completed" || m.status === "final",
                        ).length /
                          Math.max(allBracketMatches.length, 1)) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-orange-500 to-amber-400 transition-all duration-300"
                      style={{
                        width: `${Math.round((allBracketMatches.filter((m) => m.status === "completed" || m.status === "final").length / Math.max(allBracketMatches.length, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Bracket View */}
                <div className="p-5">
                  <BracketView
                    rounds={bracketRounds}
                    onMatchClick={(id) => setActiveMatchId(id)}
                    currentUserId={currentUserId}
                    currentInGameId={myInGameId}
                  />
                </div>
              </>
            ) : (
              <div className="p-5 text-center">
                <p className="text-sm text-slate-400">
                  Bracket will be generated when the tournament starts.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── Tournament Chat ───────────────────────────────────────────────── */}
        {canAccessChat && showChat && (
          <div ref={chatSectionRef}>
            <TournamentChatPanel
              tournamentId={tournament.id}
              viewerCanMentionAll={tournament.organizerId === user?.id}
            />
          </div>
        )}

        {/* ── My Matches ────────────────────────────────────────────────────── */}
        {isRegistered && showBracketSection && (
          <section className="rounded-2xl border border-orange-500/20 bg-orange-500/5 overflow-hidden flex flex-col max-h-96">
            <div className="px-5 py-4 border-b border-orange-500/20 shrink-0">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Swords className="w-4 h-4 text-orange-400" />
                My Matches
              </h2>
            </div>
            {myMatches.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-sm text-slate-400">
                  No active matches yet. Your matches will appear here when your
                  bracket match is ready.
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 p-5 space-y-3">
                {myMatches.map((match, index) => {
                  const matchId = match._id ?? match.id ?? "";
                  return (
                    <button
                      key={matchId || index}
                      type="button"
                      onClick={() => matchId && setActiveMatchId(matchId)}
                      disabled={!matchId}
                      className="w-full text-left rounded-xl border border-slate-700 bg-slate-900/70 p-4 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white">
                            Match #{match.match_number ?? index + 1}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            Round {match.round ?? match.round_number ?? 1} ·
                            Opponent:{" "}
                            {getOpponentLabel(match, currentUserId, myInGameId)}
                          </p>
                        </div>
                        <span className="text-[11px] uppercase tracking-wide font-bold text-slate-300 px-2.5 py-1 rounded-full border border-slate-600 bg-slate-800/60 shrink-0">
                          {match.status ?? "pending"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Modals */}
      {showRegisterModal && (
        <RegisterModal
          tournament={tournament}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            void handleRegisterSuccess();
          }}
          onAlreadyRegistered={() => {
            setShowRegisterModal(false);
            if (tournamentId) void loadRegistration(tournamentId);
          }}
        />
      )}

      {activeMatchId && currentUserId && (
        <MatchActionModal
          matchId={activeMatchId}
          currentUserId={currentUserId}
          onClose={() => setActiveMatchId(null)}
          onActionComplete={() => {
            setActiveMatchId(null);
            void handleRefresh();
          }}
        />
      )}

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
