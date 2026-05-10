import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Trophy,
  Users,
  CalendarDays,
  ChevronLeft,
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
  Loader2,
  Swords,
  LogOut,
  Share2,
} from "lucide-react";
import {
  tournamentService,
  type MyTournamentRegistration,
  type Tournament,
} from "../../../services/tournament.service";
import { apiGet, apiPost } from "../../../utils/api.utils";
import { TOURNAMENT_ENDPOINTS } from "../../../config/api.config";
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
  type BracketRound,
} from "../../../components/tournament-detail";
import { LeagueView } from "../../../components/league/LeagueView";
import { MatchActionModal } from "../../../components/league/MatchActionModal";

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

const STATUS_META: Record<
  string,
  { label: string; dot: string; text: string }
> = {
  open: { label: "Open", dot: "bg-emerald-400", text: "text-emerald-300" },
  published: { label: "Published", dot: "bg-cyan-400", text: "text-cyan-300" },
  started: {
    label: "Live",
    dot: "bg-orange-400 animate-pulse",
    text: "text-orange-300",
  },
  ongoing: {
    label: "Live",
    dot: "bg-orange-400 animate-pulse",
    text: "text-orange-300",
  },
  locked: { label: "Locked", dot: "bg-amber-400", text: "text-amber-300" },
  awaiting_deposit: {
    label: "Awaiting Deposit",
    dot: "bg-amber-400",
    text: "text-amber-300",
  },
  completed: {
    label: "Completed",
    dot: "bg-slate-400",
    text: "text-slate-400",
  },
  cancelled: { label: "Cancelled", dot: "bg-red-400", text: "text-red-400" },
  draft: { label: "Draft", dot: "bg-slate-500", text: "text-slate-300" },
};

const REG_STATUS_META: Record<string, { label: string; cls: string }> = {
  registered: {
    label: "Registered",
    cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  },
  checked_in: {
    label: "Checked In",
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  },
  pending_payment: {
    label: "Pmt. Pending",
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  },
  waitlist: {
    label: "Waitlisted",
    cls: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  },
  withdrawn: {
    label: "Withdrawn",
    cls: "bg-slate-700/50 text-slate-400 border-slate-600/25",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-slate-700/50 text-slate-400 border-slate-600/25",
  },
  disqualified: {
    label: "Disqualified",
    cls: "bg-red-500/15 text-red-300 border-red-500/25",
  },
};

const ACTIVE_STATUSES = new Set([
  "registered",
  "checked_in",
  "pending_payment",
  "waitlist",
]);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 animate-pulse space-y-6">
      <div className="h-5 w-32 bg-slate-800 rounded" />
      <div className="rounded-2xl overflow-hidden border border-slate-800 h-72 bg-slate-800" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 space-y-2"
          >
            <div className="h-3 w-16 bg-slate-800 rounded" />
            <div className="h-6 w-24 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3"
            >
              <div className="h-4 w-40 bg-slate-800 rounded" />
              <div className="h-3 w-full bg-slate-800 rounded" />
              <div className="h-3 w-4/5 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 h-48" />
      </div>
    </div>
  );
}

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
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  const hasFetched = useRef(false);

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
    myRegistration !== null && ACTIVE_STATUSES.has(myRegistration.status);

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
  const canRegister = tournament.status === "open" && !isRegistered;
  const registrationClosed =
    !["open"].includes(tournament.status) && !isRegistered;

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800/60 rounded-2xl overflow-hidden">
          {[
            {
              Icon: Trophy,
              label: "Prize Pool",
              value: prizeGhs ?? "—",
              accent: prizeGhs ? "text-amber-300" : "text-slate-600",
              iconCls: "text-amber-400",
            },
            {
              Icon: Users,
              label: "Players",
              value: `${tournament.currentCount} / ${tournament.maxParticipants}`,
              accent: "text-white",
              iconCls: "text-orange-400",
            },
            {
              Icon: CalendarDays,
              label: "Starts",
              value: formatDate(tournament.schedule.tournamentStart),
              accent: "text-white",
              iconCls: "text-orange-400",
            },
            {
              Icon: Award,
              label: "Entry",
              value: formatFee(
                tournament.isFree,
                tournament.entryFee,
                tournament.currency,
              ),
              accent: tournament.isFree ? "text-emerald-400" : "text-white",
              iconCls: "text-orange-400",
            },
          ].map(({ Icon, label, value, accent, iconCls }) => (
            <div
              key={label}
              className="bg-slate-900/90 px-4 py-4 flex flex-col items-center text-center gap-2"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0">
                <Icon className={`w-4 h-4 ${iconCls}`} />
              </div>
              <div>
                <p
                  className={`font-display text-lg font-bold leading-tight ${accent}`}
                >
                  {value}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>

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
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {tournament.description}
                </p>
              </section>
            )}

            {/* Schedule */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-orange-400" />
                <h2 className="font-display text-sm font-bold text-white">
                  Schedule
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-px bg-slate-800/60 p-px">
                {[
                  {
                    label: "Reg. Opens",
                    value: tournament.schedule.registrationStart,
                    dot: "bg-emerald-400",
                  },
                  {
                    label: "Reg. Closes",
                    value: tournament.schedule.registrationEnd,
                    dot: "bg-red-400",
                  },
                  {
                    label: "Starts",
                    value: tournament.schedule.tournamentStart,
                    dot: "bg-orange-400",
                  },
                  {
                    label: "Ends",
                    value: tournament.schedule.tournamentEnd,
                    dot: "bg-slate-400",
                  },
                  {
                    label: "Check-in Open",
                    value: tournament.schedule.checkInStart ?? checkInStart,
                    dot: "bg-cyan-400",
                  },
                  {
                    label: "Check-in End",
                    value: tournament.schedule.checkInEnd ?? checkInEnd,
                    dot: "bg-amber-400",
                  },
                ]
                  .filter((r) => Boolean(r.value))
                  .map((r) => (
                    <div
                      key={r.label}
                      className="flex flex-col gap-1.5 px-4 py-3 bg-slate-900/60"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.dot}`}
                        />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
                          {r.label}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-white pl-4">
                        {formatDateTime(r.value)}
                      </span>
                    </div>
                  ))}
              </div>
            </section>

            {/* Prize Distribution */}
            {!tournament.isFree &&
              tournament.prizeDistribution &&
              tournament.prizeDistribution.length > 0 && (
                <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <h2 className="font-display text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Prize Distribution
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    {tournament.prizeDistribution.slice(0, 3).map((d) => (
                      <div
                        key={d.position}
                        className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-center"
                      >
                        <p className="text-sm mb-1">
                          {d.position === 1
                            ? "🥇"
                            : d.position === 2
                              ? "🥈"
                              : "🥉"}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">
                          {d.position === 1
                            ? "1st"
                            : d.position === 2
                              ? "2nd"
                              : "3rd"}
                        </p>
                        <p className="text-lg font-display font-bold text-amber-300">
                          {d.percentage}%
                        </p>
                        {tournament.prizePool && (
                          <p className="text-xs text-slate-400 mt-1">
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
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-400" />
                  Rules
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {tournament.rules}
                </p>
              </section>
            )}

            {/* Details */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <Globe className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <h2 className="font-display text-base font-bold text-white">
                  Details
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-slate-800/40">
                {[
                  {
                    icon: <Swords className="w-4 h-4 text-orange-400" />,
                    label: "Format",
                    value: tournament.format,
                  },
                  {
                    icon: <Trophy className="w-4 h-4 text-amber-400" />,
                    label: "Type",
                    value: tournament.tournamentType,
                  },
                  {
                    icon: <Globe className="w-4 h-4 text-cyan-400" />,
                    label: "Region",
                    value:
                      tournament.region === "GLOBAL"
                        ? "Global"
                        : tournament.region,
                  },
                  {
                    icon: <Users className="w-4 h-4 text-orange-400" />,
                    label: "Min Players",
                    value:
                      tournament.minParticipants > 0
                        ? String(tournament.minParticipants)
                        : null,
                  },
                  {
                    icon: <Shield className="w-4 h-4 text-violet-400" />,
                    label: "Visibility",
                    value: tournament.visibility
                      ? tournament.visibility.charAt(0).toUpperCase() +
                        tournament.visibility.slice(1)
                      : null,
                  },
                ]
                  .filter((r) => Boolean(r.value))
                  .map((r) => (
                    <div key={r.label} className="bg-slate-900 px-4 py-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        {r.icon}
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                          {r.label}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-white capitalize">
                        {r.value}
                      </p>
                    </div>
                  ))}
              </div>
            </section>
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
                    {canWithdraw && myRegistration.status !== "checked_in" && (
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
                    {!tournament.isFree && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5">
                        <Globe className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        Entry fee deducted from wallet
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
                ) : registrationClosed ? (
                  <div className="flex items-center gap-2.5 text-sm text-slate-400 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>
                      {tournament.status === "completed"
                        ? "Tournament has ended"
                        : "Registration is not open"}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Quick stats sidebar */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Tournament Info
                </p>
              </div>
              <div className="divide-y divide-slate-800/60">
                {[
                  { label: "Format", value: tournament.format ?? "Solo" },
                  {
                    label: "Type",
                    value: tournament.tournamentType ?? "Standard",
                  },
                  ...(tournament.region
                    ? [
                        {
                          label: "Region",
                          value:
                            tournament.region === "GLOBAL"
                              ? "Global"
                              : tournament.region,
                        },
                      ]
                    : []),
                  {
                    label: "Min Players",
                    value: String(tournament.minParticipants),
                  },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <span className="text-xs text-slate-500">{r.label}</span>
                    <span className="text-xs font-bold text-white capitalize">
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
