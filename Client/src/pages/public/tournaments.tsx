import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Gamepad2,
  LogIn,
  Search,
  Trophy,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  tournamentService,
  type Tournament,
} from "../../services/tournament.service";
import { TOURNAMENT_ENDPOINTS } from "../../config/api.config";
import { apiGet } from "../../utils/api.utils";
import { useAuth } from "../../lib/auth-context";
import { TournamentCard, RegisterModal } from "../../components/join-tournament";

interface GameFilter {
  id: string;
  name: string;
}

const STATUS_PILLS = [
  { value: "",          label: "All"       },
  { value: "open",      label: "Open"      },
  { value: "published", label: "Published" },
  { value: "started",   label: "Live"      },
  { value: "completed", label: "Completed" },
];

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden animate-pulse">
      <div className="aspect-4/3 bg-slate-800" />
      <div className="px-4 pt-3 pb-4 space-y-3">
        <div className="h-3 bg-slate-800 rounded w-3/4" />
        <div className="h-2.5 bg-slate-800 rounded w-1/2" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-2 bg-slate-800 rounded" />
          <div className="h-2 bg-slate-800 rounded" />
          <div className="h-2 bg-slate-800 rounded" />
          <div className="h-2 bg-slate-800 rounded" />
        </div>
        <div className="h-9 bg-slate-800 rounded-xl mt-1" />
      </div>
    </div>
  );
}

const PublicTournaments = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [freeFilter, setFreeFilter] = useState<"" | "free" | "paid">("");
  const [gameFilter, setGameFilter] = useState("");
  const [availableGames, setAvailableGames] = useState<GameFilter[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasFetchedGames = useRef(false);

  const fetchTournaments = useCallback(async (pg: number) => {
    setIsLoading(true);
    try {
      const result = await tournamentService.getTournaments({
        page: pg, limit: 12,
        search: search || undefined,
        status: statusFilter || undefined,
        isFree: freeFilter === "free" ? true : freeFilter === "paid" ? false : undefined,
        gameId: gameFilter || undefined,
      });
      setTournaments(result.tournaments);
      setTotalPages(result.pagination.pages);
    } catch {
      setTournaments([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, freeFilter, gameFilter]);

  useEffect(() => { void fetchTournaments(page); }, [fetchTournaments, page]);

  useEffect(() => {
    if (hasFetchedGames.current) return;
    hasFetchedGames.current = true;
    apiGet(TOURNAMENT_ENDPOINTS.GAMES)
      .then((res) => {
        if (!res.success) return;
        const raw = res.data as Record<string, unknown>;
        const list = Array.isArray(raw) ? raw : ((raw.games ?? raw.data ?? []) as Record<string, unknown>[]);
        setAvailableGames(list.map((g) => ({
          id: String((g as Record<string, unknown>)._id ?? ""),
          name: String((g as Record<string, unknown>).name ?? ""),
        })));
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void fetchTournaments(1);
  };

  const handleRegister = (tournament: Tournament) => {
    if (!isAuthenticated) {
      navigate(`/login?next=/auth/tournaments`);
      return;
    }
    setSelectedTournament(tournament);
  };

  const handleRegisterSuccess = () => {
    setSelectedTournament(null);
    setErrorMsg(null);
    setSuccessMsg("You've successfully joined the tournament!");
    void fetchTournaments(page);
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-8 py-8">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[48px_48px]" />

        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-xs text-orange-400/80 font-semibold uppercase tracking-[0.18em]">
                Tournaments
              </p>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-none mb-2">
              Find Your Arena
            </h1>
            <p className="text-sm text-slate-400">
              Browse open tournaments and compete for prizes.
            </p>
          </div>

          {!isAuthenticated && (
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all shrink-0"
            >
              <LogIn className="w-4 h-4" />
              Sign In to Join
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm">
          <span className="flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tournaments..."
            className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/70 transition-colors"
          />
        </form>

        {availableGames.length > 0 && (
          <div className="relative flex items-center gap-2.5 bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3.5 min-w-37.5">
            <Gamepad2 className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={gameFilter}
              onChange={(e) => { setGameFilter(e.target.value); setPage(1); }}
              className="bg-slate-800 text-sm text-white focus:outline-none flex-1 appearance-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="">All Games</option>
              {availableGames.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700 rounded-2xl p-1.5">
          {(["", "free", "paid"] as const).map((val) => (
            <button
              key={val}
              onClick={() => { setFreeFilter(val); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                freeFilter === val
                  ? "bg-orange-500 text-slate-950 shadow shadow-orange-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {val === "" ? "All" : val === "free" ? "Free" : "Paid"}
            </button>
          ))}
        </div>
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Status</span>
        </div>
        {STATUS_PILLS.map((pill) => (
          <button
            key={pill.value}
            onClick={() => { setStatusFilter(pill.value); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
              statusFilter === pill.value
                ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                : "border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white hover:border-slate-600"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40">
          <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center mb-4">
            <Trophy className="w-7 h-7 text-slate-600" />
          </div>
          <h2 className="font-display text-lg font-bold text-white mb-1">No Tournaments Found</h2>
          <p className="text-sm text-slate-400 max-w-xs">
            No tournaments match your filters. Try adjusting your search or check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tournaments.map((t) => (
            <TournamentCard
              key={t.id}
              tournament={t}
              registrationStatus={undefined}
              isLoadingRegistrations={false}
              onRegister={handleRegister}
              onOpenDetails={(id) =>
                isAuthenticated
                  ? navigate(`/auth/tournaments/${id}`)
                  : navigate(`/login?next=/auth/tournaments/${id}`)
              }
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-400 tabular-nums">
            {page} / {totalPages}
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

      {/* Register modal (only available when authenticated) */}
      {selectedTournament && isAuthenticated && (
        <RegisterModal
          tournament={selectedTournament}
          onClose={() => setSelectedTournament(null)}
          onSuccess={handleRegisterSuccess}
        />
      )}
    </div>
  );
};

export default PublicTournaments;
