import { useCallback, useEffect, useRef, useState } from "react";
import {
  Trophy,
  Search,
  Filter,
  Users,
  CalendarDays,
  DollarSign,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Lock,
} from "lucide-react";
import {
  tournamentService,
  type MyTournamentRegistration,
  type Tournament,
} from "../../../services/tournament.service";
import { apiGet } from "../../../utils/api.utils";
import { TOURNAMENT_ENDPOINTS } from "../../../config/api.config";

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  awaiting_deposit: "bg-amber-500/20 text-amber-300",
  open: "bg-green-500/20 text-green-300",
  published: "bg-cyan-500/20 text-cyan-300",
  locked: "bg-amber-500/20 text-amber-300",
  started: "bg-blue-500/20 text-blue-300",
  ongoing: "bg-blue-500/20 text-blue-300",
  completed: "bg-slate-500/20 text-slate-400",
  cancelled: "bg-red-500/20 text-red-400",
  draft: "bg-slate-600/20 text-slate-500",
};

const REGISTRATION_STATUS_COLORS: Record<string, string> = {
  registered: "bg-cyan-500/20 text-cyan-300",
  checked_in: "bg-green-500/20 text-green-300",
  pending_payment: "bg-amber-500/20 text-amber-300",
  waitlist: "bg-purple-500/20 text-purple-300",
  withdrawn: "bg-slate-600/20 text-slate-400",
  cancelled: "bg-slate-600/20 text-slate-400",
  disqualified: "bg-red-500/20 text-red-300",
};

const ACTIVE_REGISTRATION_STATUSES = new Set([
  "registered",
  "checked_in",
  "pending_payment",
  "waitlist",
]);

function normalizeRegistrationStatus(status?: string) {
  return String(status ?? "")
    .trim()
    .toLowerCase();
}

function formatDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFee(isFree: boolean, fee: number, currency: string) {
  if (isFree) return "Free";
  return `${currency} ${(fee / 100).toFixed(2)}`;
}

// ─── Register Modal ──────────────────────────────────────────────────────────

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
  const [canJoin, setCanJoin] = useState(true);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const checkEligibility = async () => {
      setIsCheckingEligibility(true);
      try {
        const result = await tournamentService.canRegister(tournament.id);
        if (!active) return;

        setCanJoin(result.canRegister);
        setEligibilityReason(
          result.canRegister
            ? null
            : (result.reason ??
                "You are not eligible to join this tournament yet."),
        );
      } catch {
        if (!active) return;
        setCanJoin(false);
        setEligibilityReason(
          "Unable to verify registration eligibility right now.",
        );
      } finally {
        if (active) setIsCheckingEligibility(false);
      }
    };

    void checkEligibility();
    return () => {
      active = false;
    };
  }, [tournament.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canJoin) {
      setError(
        eligibilityReason ?? "You are not eligible to join this tournament.",
      );
      return;
    }

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
        {/* Header */}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tournament Info Summary */}
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

          {isCheckingEligibility && (
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              Checking eligibility...
            </div>
          )}

          {!isCheckingEligibility && !canJoin && eligibilityReason && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {eligibilityReason}
            </div>
          )}

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
              {isSubmitting ? "Registering..." : "Confirm & Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tournament Card ─────────────────────────────────────────────────────────

function TournamentCard({
  tournament,
  registrationStatus,
  isLoadingRegistrations,
  onRegister,
}: {
  tournament: Tournament;
  registrationStatus?: string;
  isLoadingRegistrations: boolean;
  onRegister: (t: Tournament) => void;
}) {
  const statusColor =
    STATUS_COLORS[tournament.status] ?? "bg-slate-700 text-slate-300";
  const normalizedStatus = normalizeRegistrationStatus(registrationStatus);
  const isAlreadyRegistered =
    tournament.isRegistered === true ||
    ACTIVE_REGISTRATION_STATUSES.has(normalizedStatus);
  const canRegister =
    !isLoadingRegistrations &&
    tournament.status === "open" &&
    !isAlreadyRegistered;
  const isFull = tournament.currentCount >= tournament.maxParticipants;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3 hover:border-slate-700 transition-colors">
      {/* Banner / Game Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {tournament.game?.logoUrl ? (
              <img
                src={tournament.game.logoUrl}
                alt=""
                className="w-5 h-5 rounded object-cover"
              />
            ) : (
              <Gamepad2 className="w-4 h-4 text-slate-500" />
            )}
            <span className="text-xs text-slate-400 truncate">
              {tournament.game?.name ?? "Unknown Game"}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
            {tournament.title}
          </h3>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize whitespace-nowrap shrink-0 ${statusColor}`}
        >
          {tournament.status}
        </span>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
          {formatDate(tournament.schedule.tournamentStart)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 shrink-0" />
          {tournament.currentCount}/{tournament.maxParticipants}
        </span>
        <span className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 shrink-0" />
          {formatFee(
            tournament.isFree,
            tournament.entryFee,
            tournament.currency,
          )}
        </span>
        {tournament.prizePool !== undefined && tournament.prizePool > 0 && (
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            Prize Pool: {tournament.currency}{" "}
            {(tournament.prizePool / 100).toFixed(2)}
          </span>
        )}
      </div>

      {/* Register CTA */}
      <button
        onClick={() => onRegister(tournament)}
        disabled={isLoadingRegistrations || !canRegister || isFull}
        className="mt-auto w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/30 hover:border-cyan-500
          disabled:hover:bg-cyan-500/10 disabled:hover:text-cyan-300 disabled:hover:border-cyan-500/30
          flex items-center justify-center gap-2"
      >
        {isLoadingRegistrations ? (
          "Checking..."
        ) : isAlreadyRegistered ? (
          `Joined (${(normalizedStatus || "registered").replace("_", " ")})`
        ) : isFull ? (
          <>
            <Lock className="w-4 h-4" />
            Full
          </>
        ) : canRegister ? (
          "Join Tournament"
        ) : (
          "Registration Closed"
        )}
      </button>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

interface GameFilter {
  id: string;
  name: string;
}

const JoinTournament = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<
    MyTournamentRegistration[]
  >([]);
  const [registrationByTournament, setRegistrationByTournament] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(true);
  const [withdrawingTournamentId, setWithdrawingTournamentId] = useState<
    string | null
  >(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [freeFilter, setFreeFilter] = useState<"" | "free" | "paid">("");
  const [gameFilter, setGameFilter] = useState("");
  const [availableGames, setAvailableGames] = useState<GameFilter[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [withdrawTarget, setWithdrawTarget] =
    useState<MyTournamentRegistration | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawReasonError, setWithdrawReasonError] = useState<string | null>(
    null,
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasFetchedGames = useRef(false);

  const fetchMyRegistrations = useCallback(async () => {
    setIsLoadingRegistrations(true);
    try {
      const registrations = await tournamentService.getMyRegistrations();
      setMyRegistrations(registrations);
      const map = registrations.reduce<Record<string, string>>((acc, item) => {
        if (!acc[item.tournamentId]) {
          acc[item.tournamentId] = item.status;
        }
        return acc;
      }, {});
      setRegistrationByTournament(map);
    } catch {
      setMyRegistrations([]);
      setRegistrationByTournament({});
    } finally {
      setIsLoadingRegistrations(false);
    }
  }, []);

  const fetchTournaments = useCallback(
    async (pg: number) => {
      setIsLoading(true);
      try {
        const result = await tournamentService.getTournaments({
          page: pg,
          limit: 12,
          search: search || undefined,
          status: statusFilter || undefined,
          isFree:
            freeFilter === "free"
              ? true
              : freeFilter === "paid"
                ? false
                : undefined,
          gameId: gameFilter || undefined,
        });
        setTournaments(result.tournaments);
        setTotalPages(result.pagination.pages);
      } catch {
        setTournaments([]);
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter, freeFilter, gameFilter],
  );

  useEffect(() => {
    void fetchTournaments(page);
  }, [fetchTournaments, page]);

  useEffect(() => {
    void fetchMyRegistrations();
  }, [fetchMyRegistrations]);

  useEffect(() => {
    if (hasFetchedGames.current) return;
    hasFetchedGames.current = true;

    apiGet(TOURNAMENT_ENDPOINTS.GAMES)
      .then((res) => {
        if (!res.success) return;
        const raw = res.data as Record<string, unknown>;
        const list = Array.isArray(raw)
          ? raw
          : ((raw.games ?? raw.data ?? []) as Record<string, unknown>[]);
        setAvailableGames(
          list.map((g) => ({
            id: String((g as Record<string, unknown>)._id ?? ""),
            name: String((g as Record<string, unknown>).name ?? ""),
          })),
        );
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void fetchTournaments(1);
  };

  const handleRegisterSuccess = () => {
    setSelectedTournament(null);
    setErrorMsg(null);
    setSuccessMsg(
      "You've successfully joined the tournament! Check your dashboard for details.",
    );
    void Promise.all([fetchTournaments(page), fetchMyRegistrations()]);
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  const canWithdrawRegistration = (registrationStatus: string): boolean => {
    return ["registered", "checked_in", "pending_payment", "waitlist"].includes(
      registrationStatus,
    );
  };

  const handleWithdrawRequest = (registration: MyTournamentRegistration) => {
    if (!canWithdrawRegistration(registration.status)) return;

    setWithdrawTarget(registration);
    setWithdrawReason("");
    setWithdrawReasonError(null);
  };

  const handleWithdraw = async () => {
    if (!withdrawTarget) return;
    const reason = withdrawReason.trim();
    if (!reason) {
      setWithdrawReasonError("Withdrawal reason is required.");
      return;
    }

    setWithdrawingTournamentId(withdrawTarget.tournamentId);
    setErrorMsg(null);
    setSuccessMsg(null);
    setWithdrawReasonError(null);
    try {
      await tournamentService.unregister(withdrawTarget.tournamentId, reason);
      setSuccessMsg(
        "Withdraw successful. If eligible, any refundable amount will be processed.",
      );
      setWithdrawTarget(null);
      setWithdrawReason("");
      setWithdrawReasonError(null);
      void Promise.all([fetchTournaments(page), fetchMyRegistrations()]);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to withdraw from tournament.",
      );
    } finally {
      setWithdrawingTournamentId(null);
    }
  };

  const isConfirmingWithdraw =
    withdrawTarget !== null &&
    withdrawingTournamentId === withdrawTarget.tournamentId;

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Tournaments
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Browse and join tournaments to compete with other players.
        </p>
      </div>

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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 min-w-50 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tournaments..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500" />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="published">Published</option>
            <option value="started">Started</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={freeFilter}
            onChange={(e) => {
              setFreeFilter(e.target.value as "" | "free" | "paid");
              setPage(1);
            }}
            className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="">All Fees</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>

          {availableGames.length > 0 && (
            <select
              value={gameFilter}
              onChange={(e) => {
                setGameFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">All Games</option>
              {availableGames.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tournament Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-slate-600" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            No Tournaments Found
          </h2>
          <p className="text-sm text-slate-400 max-w-xs">
            No tournaments match your filters. Try adjusting your search or
            check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <TournamentCard
              key={t.id}
              tournament={t}
              registrationStatus={registrationByTournament[t.id]}
              isLoadingRegistrations={isLoadingRegistrations}
              onRegister={setSelectedTournament}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* My Registrations */}
      <section className="pt-2 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              My Registrations
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              View your joined tournaments and withdraw when eligible.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {myRegistrations.length} total
          </span>
        </div>

        {isLoadingRegistrations ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : myRegistrations.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
            <p className="text-sm text-slate-400">
              You have not joined any tournaments yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myRegistrations.map((registration) => {
              const tournamentStatusColor =
                STATUS_COLORS[registration.tournamentStatus] ??
                "bg-slate-700 text-slate-300";
              const registrationStatusColor =
                REGISTRATION_STATUS_COLORS[registration.status] ??
                "bg-slate-700 text-slate-300";
              const canWithdraw = canWithdrawRegistration(registration.status);
              const isWithdrawing =
                withdrawingTournamentId === registration.tournamentId;

              return (
                <div
                  key={registration.registrationId}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3"
                >
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-white line-clamp-2">
                      {registration.tournamentTitle}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {registration.tournamentGameName ?? "Game"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full capitalize ${tournamentStatusColor}`}
                    >
                      Tournament:{" "}
                      {registration.tournamentStatus.replace("_", " ")}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full capitalize ${registrationStatusColor}`}
                    >
                      {registration.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <p>Start: {formatDate(registration.tournamentStart)}</p>
                    <p>Joined: {formatDate(registration.registeredAt)}</p>
                  </div>

                  <button
                    onClick={() => {
                      handleWithdrawRequest(registration);
                    }}
                    disabled={!canWithdraw || isWithdrawing}
                    className="mt-auto w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white"
                  >
                    {isWithdrawing
                      ? "Withdrawing..."
                      : canWithdraw
                        ? "Withdraw"
                        : "Not Withdrawable"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Withdraw Modal */}
      {withdrawTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-start justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Withdraw Registration
                </h2>
                <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">
                  {withdrawTarget.tournamentTitle}
                </p>
              </div>
              <button
                onClick={() => {
                  setWithdrawTarget(null);
                  setWithdrawReason("");
                  setWithdrawReasonError(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Please provide a short reason for this withdrawal.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Withdrawal Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={withdrawReason}
                  onChange={(e) => {
                    setWithdrawReason(e.target.value);
                    if (
                      withdrawReasonError &&
                      e.target.value.trim().length > 0
                    ) {
                      setWithdrawReasonError(null);
                    }
                  }}
                  rows={4}
                  maxLength={300}
                  placeholder="e.g., Scheduling conflict, unavailable at tournament time..."
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                />
                {withdrawReasonError && (
                  <p className="text-xs text-red-400 mt-1">
                    {withdrawReasonError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawTarget(null);
                    setWithdrawReason("");
                    setWithdrawReasonError(null);
                  }}
                  disabled={isConfirmingWithdraw}
                  className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 disabled:opacity-60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleWithdraw();
                  }}
                  disabled={
                    isConfirmingWithdraw || withdrawReason.trim().length === 0
                  }
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-400 disabled:opacity-60 transition-colors"
                >
                  {isConfirmingWithdraw && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {isConfirmingWithdraw ? "Withdrawing..." : "Confirm Withdraw"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {selectedTournament && (
        <RegisterModal
          tournament={selectedTournament}
          onClose={() => setSelectedTournament(null)}
          onSuccess={handleRegisterSuccess}
        />
      )}
    </div>
  );
};

export default JoinTournament;
