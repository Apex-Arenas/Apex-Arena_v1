import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Gamepad2,
  Search,
  Swords,
  Trophy,
  X,
  Sliders,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  tournamentService,
  type MyTournamentRegistration,
  type Tournament,
} from "../../../services/tournament.service";
import { TOURNAMENT_ENDPOINTS, FINANCE_ENDPOINTS } from "../../../config/api.config";
import { apiGet, apiPost } from "../../../utils/api.utils";
import {
  RegistrationCard,
  RegisterModal,
  TournamentCard,
  WithdrawModal,
  SkeletonCard,
  ActiveTournamentCard,
  JoinTournamentHero,
  canWithdrawRegistration,
} from "../../../components/join-tournament";

interface GameFilter {
  id: string;
  name: string;
}

type ActiveTab = "browse" | "registrations" | "my-tournaments";

const STATUS_PILLS = [
  { value: "",          label: "All"       },
  { value: "open",      label: "Open"      },
  { value: "published", label: "Published" },
  { value: "started",   label: "Live"      },
  { value: "completed", label: "Completed" },
];

const ACTIVE_TOURNAMENT_STATUSES = new Set(["started", "ongoing", "completed"]);
const UPCOMING_TOURNAMENT_STATUSES = new Set([
  "open", "published", "locked", "awaiting_deposit", "draft",
]);

// ── Main page ─────────────────────────────────────────────────────────────────
const JoinTournament = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>("registrations");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<MyTournamentRegistration[]>([]);
  const [registrationByTournament, setRegistrationByTournament] = useState<Record<string, string>>({});
  const [registrationIdByTournament, setRegistrationIdByTournament] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(true);
  const [withdrawingTournamentId, setWithdrawingTournamentId] = useState<string | null>(null);
  const [completingPaymentId, setCompletingPaymentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [freeFilter, setFreeFilter] = useState<"" | "free" | "paid">("");
  const [gameFilter, setGameFilter] = useState("");
  const [availableGames, setAvailableGames] = useState<GameFilter[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<MyTournamentRegistration | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawReasonError, setWithdrawReasonError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const hasFetchedGames = useRef(false);

  const fetchMyRegistrations = useCallback(async () => {
    setIsLoadingRegistrations(true);
    try {
      const registrations = await tournamentService.getMyRegistrations();
      setMyRegistrations(registrations);
      const statusMap: Record<string, string> = {};
      const idMap: Record<string, string> = {};
      for (const item of registrations) {
        if (!statusMap[item.tournamentId]) {
          statusMap[item.tournamentId] = item.status;
          if (item.status === "pending_payment") {
            idMap[item.tournamentId] = item.registrationId;
          }
        }
      }
      setRegistrationByTournament(statusMap);
      setRegistrationIdByTournament(idMap);
    } catch {
      setMyRegistrations([]);
      setRegistrationByTournament({});
      setRegistrationIdByTournament({});
    } finally {
      setIsLoadingRegistrations(false);
    }
  }, []);

  const fetchTournaments = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await tournamentService.getTournaments({
        page: 1, limit: 999,
        search: search || undefined,
        status: statusFilter || undefined,
        gameId: gameFilter || undefined,
      });

      let filtered = result.tournaments;
      if (freeFilter === "free") {
        filtered = filtered.filter((t) => t.isFree && (t.entryFee === 0) && (!t.prizePool || t.prizePool === 0));
      } else if (freeFilter === "paid") {
        filtered = filtered.filter((t) => t.entryFee > 0 || (t.prizePool && t.prizePool > 0));
      }

      setTournaments(filtered);
    } catch {
      setTournaments([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, freeFilter, gameFilter]);

  useEffect(() => { void fetchTournaments(); }, [fetchTournaments]);
  useEffect(() => { void fetchMyRegistrations(); }, [fetchMyRegistrations]);

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
    void fetchTournaments();
  };

  const handleRegisterSuccess = () => {
    setSelectedTournament(null);
    setErrorMsg(null);
    setSuccessMsg("You've successfully joined the tournament! Check your registrations for details.");
    void Promise.all([fetchTournaments(), fetchMyRegistrations()]);
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  const handleCompletePayment = async (registrationId: string) => {
    setCompletingPaymentId(registrationId);
    setErrorMsg(null);
    try {
      const payRes = await apiPost(FINANCE_ENDPOINTS.TOURNAMENT_PAYMENT_INITIATE, {
        registration_id: registrationId,
        callback_url: `${window.location.origin}/payment-callback.html?type=entry`,
      });
      if (!payRes.success) {
        const err = (payRes as { error?: string | { message?: string } }).error;
        throw new Error(
          (typeof err === "string" ? err : err?.message) ??
          "Could not initiate payment. Please try again."
        );
      }
      const payData = payRes.data as { authorization_url?: string };
      if (payData.authorization_url) {
        window.location.href = payData.authorization_url;
        return;
      }
      throw new Error("No payment URL returned. Please try again.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to initiate payment.");
      setCompletingPaymentId(null);
    }
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
    if (!reason) { setWithdrawReasonError("Withdrawal reason is required."); return; }
    setWithdrawingTournamentId(withdrawTarget.tournamentId);
    setErrorMsg(null);
    setSuccessMsg(null);
    setWithdrawReasonError(null);
    try {
      await tournamentService.unregister(withdrawTarget.tournamentId, reason);
      setSuccessMsg("Withdraw successful. If eligible, any refundable amount will be processed.");
      setWithdrawTarget(null);
      setWithdrawReason("");
      setWithdrawReasonError(null);
      void Promise.all([fetchTournaments(), fetchMyRegistrations()]);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to withdraw from tournament.");
    } finally {
      setWithdrawingTournamentId(null);
    }
  };

  const isConfirmingWithdraw = withdrawTarget !== null && withdrawingTournamentId === withdrawTarget.tournamentId;
  const upcomingRegistrations = myRegistrations.filter((r) => UPCOMING_TOURNAMENT_STATUSES.has(r.tournamentStatus) && r.status !== "withdrawn" && r.status !== "disqualified");
  const activeTournaments = myRegistrations.filter((r) => ACTIVE_TOURNAMENT_STATUSES.has(r.tournamentStatus) && r.status !== "withdrawn" && r.status !== "disqualified");

  const activeFilterCount = [statusFilter !== "", freeFilter !== "", gameFilter !== ""].filter(Boolean).length;

  const TABS: { id: ActiveTab; label: string; shortLabel: string; count?: number }[] = [
    { id: "registrations",  label: "My Registrations", shortLabel: "My Reg.", count: isLoadingRegistrations ? undefined : upcomingRegistrations.length },
    { id: "my-tournaments", label: "Active",           shortLabel: "Active",  count: isLoadingRegistrations ? undefined : activeTournaments.length },
    { id: "browse",         label: "Browse",           shortLabel: "Browse",  count: isLoading ? undefined : tournaments.length },
  ];

  return (
    <div className="min-h-screen">

      <JoinTournamentHero
        tournamentCount={tournaments.length}
        upcomingCount={upcomingRegistrations.length}
        activeCount={activeTournaments.length}
        isLoading={isLoading}
        isLoadingRegistrations={isLoadingRegistrations}
        statsOpen={statsOpen}
        onToggleStats={() => setStatsOpen((o) => !o)}
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-5 sm:py-7 space-y-5">

        {/* Notifications */}
        {successMsg && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
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

        {/* Tab switcher + Search bar */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 w-full sm:w-auto justify-center sm:justify-start shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-2 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 shadow-lg shadow-orange-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold leading-none ${
                    activeTab === tab.id ? "bg-slate-950/30 text-slate-950" : "bg-orange-500/20 text-orange-400"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="relative hidden sm:block flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tournaments..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/70 transition-colors"
            />
          </form>
        </div>

        {/* ── BROWSE TAB ──────────────────────────────────────────────────── */}
        {activeTab === "browse" && (
          <div className="space-y-4">
            {/* Mobile: Search + Filters button */}
            <div className="flex gap-2 sm:hidden">
              <form onSubmit={handleSearch} className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/70 transition-colors"
                />
              </form>
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <Sliders className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-slate-950 text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Desktop filter bar */}
            <div className="hidden sm:flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
              {availableGames.length > 0 && (
                <div className="relative flex items-center gap-1.5 bg-slate-800/60 border border-slate-700 rounded-full px-3 py-1.5 shrink-0">
                  <Gamepad2 className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={gameFilter}
                    onChange={(e) => { setGameFilter(e.target.value); }}
                    className="bg-transparent text-xs text-white focus:outline-none appearance-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    <option value="">All Games</option>
                    {availableGames.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 pointer-events-none" />
                </div>
              )}

              <div className="flex items-center gap-1.5 overflow-x-auto flex-1 no-scrollbar">
                {STATUS_PILLS.map((pill) => (
                  <button
                    key={pill.value}
                    onClick={() => { setStatusFilter(pill.value); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 ${
                      statusFilter === pill.value
                        ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                        : "border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white hover:border-slate-600"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700 rounded-full p-0.5 shrink-0">
                {(["", "free", "paid"] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => { setFreeFilter(val); }}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
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

            {/* Mobile filter panel */}
            {filtersOpen && (
              <div className="sm:hidden space-y-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                {availableGames.length > 0 && (
                  <div className="relative flex items-center gap-1.5 bg-slate-800/60 border border-slate-700 rounded-full px-3 py-2">
                    <Gamepad2 className="w-3.5 h-3.5 text-slate-500" />
                    <select
                      value={gameFilter}
                      onChange={(e) => { setGameFilter(e.target.value); }}
                      className="bg-transparent text-xs text-white focus:outline-none flex-1 appearance-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
                    >
                      <option value="">All Games</option>
                      {availableGames.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 pointer-events-none" />
                  </div>
                )}

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3">
                  {STATUS_PILLS.map((pill) => (
                    <button
                      key={pill.value}
                      onClick={() => { setStatusFilter(pill.value); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 ${
                        statusFilter === pill.value
                          ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                          : "border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white hover:border-slate-600"
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700 rounded-full p-0.5">
                  {(["", "free", "paid"] as const).map((val) => (
                    <button
                      key={val}
                      onClick={() => { setFreeFilter(val); }}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex-1 ${
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
            )}

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
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
                    registrationStatus={registrationByTournament[t.id]}
                    registrationId={registrationIdByTournament[t.id]}
                    isLoadingRegistrations={isLoadingRegistrations}
                    onRegister={setSelectedTournament}
                    onCompletePayment={handleCompletePayment}
                    onOpenDetails={(id) => navigate(`/auth/tournaments/${id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY REGISTRATIONS TAB ─────────────────────────────────────────── */}
        {activeTab === "registrations" && (
          <div className="space-y-4">
            {isLoadingRegistrations ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : upcomingRegistrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40">
                <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center mb-4">
                  <Trophy className="w-7 h-7 text-slate-600" />
                </div>
                <h2 className="font-display text-lg font-bold text-white mb-1">No Upcoming Registrations</h2>
                <p className="text-sm text-slate-400 max-w-xs mb-5">
                  Browse open tournaments and join one to see it here.
                </p>
                <button
                  onClick={() => setActiveTab("browse")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
                >
                  <Swords className="w-4 h-4" />
                  Browse Tournaments
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {upcomingRegistrations.map((registration) => (
                  <RegistrationCard
                    key={registration.registrationId}
                    registration={registration}
                    canWithdraw={canWithdrawRegistration(registration.status)}
                    isWithdrawing={withdrawingTournamentId === registration.tournamentId}
                    isCompletingPayment={completingPaymentId === registration.registrationId}
                    onRequestWithdraw={handleWithdrawRequest}
                    onCompletePayment={handleCompletePayment}
                    onOpenDetails={(id) => navigate(`/auth/tournaments/${id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY TOURNAMENTS TAB ───────────────────────────────────────────── */}
        {activeTab === "my-tournaments" && (
          <div className="space-y-4">
            {isLoadingRegistrations ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : activeTournaments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40">
                <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center mb-4">
                  <Swords className="w-7 h-7 text-slate-600" />
                </div>
                <h2 className="font-display text-lg font-bold text-white mb-1">No Active Tournaments</h2>
                <p className="text-sm text-slate-400 max-w-xs">
                  Once a tournament you've joined goes live, it'll appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeTournaments.map((registration) => (
                  <ActiveTournamentCard
                    key={registration.registrationId}
                    registration={registration}
                    onView={(id) => navigate(`/auth/tournaments/${id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modals */}
      {withdrawTarget && (
        <WithdrawModal
          target={withdrawTarget}
          reason={withdrawReason}
          reasonError={withdrawReasonError}
          isSubmitting={isConfirmingWithdraw}
          onReasonChange={(value) => {
            setWithdrawReason(value);
            if (withdrawReasonError && value.trim().length > 0) setWithdrawReasonError(null);
          }}
          onClose={() => { setWithdrawTarget(null); setWithdrawReason(""); setWithdrawReasonError(null); }}
          onConfirm={() => { void handleWithdraw(); }}
        />
      )}
      {selectedTournament && (
        <RegisterModal
          tournament={selectedTournament}
          onClose={() => setSelectedTournament(null)}
          onSuccess={handleRegisterSuccess}
          onAlreadyRegistered={() => {
            setSelectedTournament(null);
            void fetchMyRegistrations();
            setActiveTab("registrations");
          }}
        />
      )}
    </div>
  );
};

export default JoinTournament;
