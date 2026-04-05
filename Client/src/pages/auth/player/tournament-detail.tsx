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

// ─── Register Modal ───────────────────────────────────────────────────────────

function RegisterModal({
  tournament,
  onClose,
  onSuccess,
}: {
  tournament: Tournament;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [canJoin, setCanJoin] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    tournamentService
      .canRegister(tournament.id)
      .then((result) => {
        if (!active) return;
        setCanJoin(result.canRegister);
        setEligibilityReason(
          result.canRegister
            ? null
            : (result.reason ??
                "You are not eligible to join this tournament."),
        );
      })
      .catch(() => {
        if (!active) return;
        setCanJoin(false);
        setEligibilityReason("Unable to verify eligibility right now.");
      })
      .finally(() => {
        if (active) setIsCheckingEligibility(false);
      });
    return () => {
      active = false;
    };
  }, [tournament.id]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canJoin) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await tournamentService.register(tournament.id);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Join Tournament
            </h2>
            <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">
              {tournament.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleJoin} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-800/60 rounded-lg px-3 py-2">
              <p className="text-slate-400 text-xs">Entry Fee</p>
              <p className="font-semibold text-white mt-0.5">
                {formatFee(
                  tournament.isFree,
                  tournament.entryFee,
                  tournament.currency,
                )}
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-lg px-3 py-2">
              <p className="text-slate-400 text-xs">Format</p>
              <p className="font-semibold text-white mt-0.5 capitalize">
                {tournament.format ?? "Solo"}
              </p>
            </div>
          </div>

          {!tournament.isFree && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Entry fee of{" "}
                <strong>
                  {formatFee(
                    tournament.isFree,
                    tournament.entryFee,
                    tournament.currency,
                  )}
                </strong>{" "}
                will be deducted from your wallet.
              </span>
            </div>
          )}

          {isCheckingEligibility ? (
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              Checking eligibility…
            </div>
          ) : !canJoin && eligibilityReason ? (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {eligibilityReason}
            </div>
          ) : null}

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2.5 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCheckingEligibility || !canJoin}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-60 transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Joining…" : "Confirm & Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Bracket ─────────────────────────────────────────────────────────────────

interface BracketMatch {
  _id?: string;
  id?: string;
  round?: number;
  round_number?: number;
  round_name?: string;
  match_number?: number;
  status?: string;
  scheduled_at?: string;
  scheduled_time?: string;
  schedule?: {
    scheduled_time?: string;
  };
  participants?: Array<{
    in_game_id?: string;
    username?: string;
    result?: string;
    user_id?: string | { username?: string };
  }>;
  player1?: Record<string, unknown>;
  player2?: Record<string, unknown>;
}

interface BracketRound {
  round_number?: number;
  round?: number;
  round_name?: string;
  name?: string;
  matches?: BracketMatch[];
}

const BRACKET_VISIBLE_STATUSES = new Set([
  "locked",
  "ready_to_start",
  "ongoing",
  "awaiting_results",
  "verifying_results",
  "completed",
  // Legacy/compat status seen in some payloads
  "started",
]);

function getParticipantLabel(participant?: {
  in_game_id?: string;
  username?: string;
  user_id?: string | { username?: string };
}): string {
  if (!participant) return "TBD";
  if (participant.in_game_id) return participant.in_game_id;
  if (participant.username) return participant.username;

  if (participant.user_id && typeof participant.user_id === "object") {
    const username = participant.user_id.username;
    if (username) return username;
  }

  return "TBD";
}

function buildRoundsFromFlatMatches(matches: BracketMatch[]): BracketRound[] {
  const byRound = new Map<number, BracketMatch[]>();

  matches.forEach((match) => {
    const roundValue = match.round ?? match.round_number ?? 1;
    const round = Number.isFinite(Number(roundValue)) ? Number(roundValue) : 1;
    const existing = byRound.get(round) ?? [];
    existing.push(match);
    byRound.set(round, existing);
  });

  return Array.from(byRound.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, roundMatches]) => {
      const sortedMatches = [...roundMatches].sort((a, b) => {
        const aNum = a.match_number ?? Number.MAX_SAFE_INTEGER;
        const bNum = b.match_number ?? Number.MAX_SAFE_INTEGER;
        return aNum - bNum;
      });

      return {
        round,
        round_number: round,
        round_name: sortedMatches[0]?.round_name,
        name: sortedMatches[0]?.round_name,
        matches: sortedMatches,
      };
    });
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatRoundName(raw?: string): string | null {
  if (!raw || raw.trim().length === 0) return null;

  const normalized = raw.trim().toLowerCase();
  const named: Record<string, string> = {
    final: "Final",
    grand_final: "Grand Final",
    upper_final: "Upper Final",
    lower_final: "Lower Final",
    semi_final: "Semifinal",
    semi_finals: "Semifinals",
    quarter_final: "Quarterfinal",
    quarter_finals: "Quarterfinals",
  };

  if (named[normalized]) {
    return named[normalized];
  }

  const roundMatch = normalized.match(/^round[_\s-]?(\d+)$/);
  if (roundMatch) {
    return `Round ${roundMatch[1]}`;
  }

  return toTitleCase(normalized.replace(/[_-]+/g, " "));
}

function getRoundTitle(
  round: BracketRound,
  index: number,
  totalRounds: number,
): string {
  const explicit = formatRoundName(round.name ?? round.round_name);
  if (explicit) {
    return explicit;
  }

  const roundNumber = round.round_number ?? round.round ?? index + 1;

  if (totalRounds >= 2 && roundNumber === totalRounds) {
    return "Final";
  }

  if (totalRounds >= 3 && roundNumber === totalRounds - 1) {
    return "Semifinal";
  }

  if (totalRounds >= 4 && roundNumber === totalRounds - 2) {
    return "Quarterfinal";
  }

  return `Round ${roundNumber}`;
}

function extractBracketRounds(payload: unknown): BracketRound[] {
  if (Array.isArray(payload)) {
    return buildRoundsFromFlatMatches(payload as BracketMatch[]);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidate = record.rounds ?? record.bracket;

  if (!Array.isArray(candidate)) {
    return [];
  }

  const hasRoundShape = candidate.some(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      Array.isArray((item as BracketRound).matches),
  );

  if (hasRoundShape) {
    return candidate as BracketRound[];
  }

  return buildRoundsFromFlatMatches(candidate as BracketMatch[]);
}

function BracketView({ rounds }: { rounds: BracketRound[] }) {
  if (rounds.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        Bracket has not been generated yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="flex gap-6 pb-4"
        style={{ minWidth: `${rounds.length * 200}px` }}
      >
        {rounds.map((round, ri) => (
          <div key={ri} className="flex-1 min-w-44 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
              {getRoundTitle(round, ri, rounds.length)}
            </p>
            {(round.matches ?? []).map((match, mi) => {
              const p = match.participants ?? [];
              const p1Label = getParticipantLabel(p[0]);
              const p2Label = getParticipantLabel(p[1]);
              const scheduledAt =
                match.scheduled_at ??
                match.scheduled_time ??
                match.schedule?.scheduled_time;
              return (
                <div
                  key={match._id ?? match.id ?? mi}
                  className="rounded-lg border border-slate-700 bg-slate-800/60 overflow-hidden text-xs"
                >
                  <div
                    className={`px-3 py-2 flex items-center justify-between ${p[0]?.result === "win" ? "text-cyan-300" : "text-slate-300"}`}
                  >
                    <span className="truncate font-medium">{p1Label}</span>
                    {p[0]?.result === "win" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
                    )}
                  </div>
                  <div className="h-px bg-slate-700" />
                  <div
                    className={`px-3 py-2 flex items-center justify-between ${p[1]?.result === "win" ? "text-cyan-300" : "text-slate-300"}`}
                  >
                    <span className="truncate font-medium">{p2Label}</span>
                    {p[1]?.result === "win" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
                    )}
                  </div>
                  {scheduledAt && (
                    <div className="px-3 py-1.5 bg-slate-900/40 text-slate-500 text-[10px]">
                      {formatDateTime(scheduledAt)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TournamentDetail = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();

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

      {/* My Matches — visible only when registered and tournament has started */}
      {isRegistered && ["started", "ongoing"].includes(tournament.status) && (
        <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
          <h2 className="font-display text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
            My Matches
          </h2>
          <p className="text-sm text-slate-400">
            Match details are available in the bracket above. Look for your
            in-game ID to find your matches.
          </p>
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

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-start justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Withdraw
                </h2>
                <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">
                  {tournament.title}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawReason("");
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Please provide a reason for withdrawing.</span>
              </div>
              <textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="e.g. Scheduling conflict…"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawReason("");
                  }}
                  className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    void handleWithdraw();
                  }}
                  disabled={isWithdrawing || withdrawReason.trim().length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-400 disabled:opacity-60 transition-colors"
                >
                  {isWithdrawing && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {isWithdrawing ? "Withdrawing…" : "Confirm Withdraw"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetail;
