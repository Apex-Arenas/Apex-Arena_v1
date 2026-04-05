import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Search,
  Trophy,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  tournamentService,
  type MyTournamentRegistration,
  type Tournament,
} from "../../../services/tournament.service";
import { TOURNAMENT_ENDPOINTS } from "../../../config/api.config";
import { apiGet } from "../../../utils/api.utils";
import {
  RegistrationCard,
  RegisterModal,
  TournamentCard,
  WithdrawModal,
  canWithdrawRegistration,
} from "../../../components/join-tournament";

interface GameFilter {
  id: string;
  name: string;
}

const JoinTournament = () => {
  const navigate = useNavigate();
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
              onOpenDetails={(tournamentId) =>
                navigate(`/auth/tournaments/${tournamentId}`)
              }
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
              const canWithdraw = canWithdrawRegistration(registration.status);
              const isWithdrawing =
                withdrawingTournamentId === registration.tournamentId;

              return (
                <RegistrationCard
                  key={registration.registrationId}
                  registration={registration}
                  canWithdraw={canWithdraw}
                  isWithdrawing={isWithdrawing}
                  onRequestWithdraw={handleWithdrawRequest}
                  onOpenDetails={(tournamentId) =>
                    navigate(`/auth/tournaments/${tournamentId}`)
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Withdraw Modal */}
      {withdrawTarget && (
        <WithdrawModal
          target={withdrawTarget}
          reason={withdrawReason}
          reasonError={withdrawReasonError}
          isSubmitting={isConfirmingWithdraw}
          onReasonChange={(value) => {
            setWithdrawReason(value);
            if (withdrawReasonError && value.trim().length > 0) {
              setWithdrawReasonError(null);
            }
          }}
          onClose={() => {
            setWithdrawTarget(null);
            setWithdrawReason("");
            setWithdrawReasonError(null);
          }}
          onConfirm={() => {
            void handleWithdraw();
          }}
        />
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
