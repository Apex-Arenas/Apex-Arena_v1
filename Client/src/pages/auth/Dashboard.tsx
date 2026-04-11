import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Medal,
  Target,
  Clock,
  Users,
  Gamepad2,
  CheckCircle2,
  Zap,
  PlusCircle,
  ListTodo,
  Wallet,
  Activity,
  ArrowRight,
  Swords,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import {
  dashboardService,
  type DashboardData,
} from "../../services/dashboard.service";
import {
  organizerService,
  type Tournament as OrganizerTournament,
  type WalletBalance,
} from "../../services/organizer.service";
import {
  CalendarWidget,
  type CalendarEvent,
  EmptyState,
  JoinedTournamentDetailsCard,
  OrganizerTournamentCard,
  StatCard,
  TournamentCard,
} from "../../components/dashboard";

// ─── Dashboard Page ─────────────────────────────────────────────────────────

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [organizerTournaments, setOrganizerTournaments] = useState<OrganizerTournament[]>([]);
  const [organizerWalletBalance, setOrganizerWalletBalance] = useState<number | null>(null);
  const [playerWallet, setPlayerWallet] = useState<WalletBalance | null>(null);
  const [walletAmountInput, setWalletAmountInput] = useState("10");
  const [isDepositing, setIsDepositing] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tournamentTab, setTournamentTab] = useState<"active" | "history">("active");
  const hasFetched = useRef(false);
  const isOrganizer = user?.role === "organizer";

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isOrganizer) {
        const [profile, tournaments, wallet] = await Promise.all([
          dashboardService.fetchProfile(),
          organizerService.getMyTournaments(),
          organizerService.getWalletBalance().catch(() => null),
        ]);
        setData({
          profile,
          registrations: [],
          stats: { joinedTournaments: 0, totalWins: 0, totalPrizeWon: 0, checkedInCount: 0 },
        });
        setOrganizerTournaments(tournaments);
        setOrganizerWalletBalance(wallet?.availableBalance ?? null);
        setPlayerWallet(null);
      } else {
        const [result, wallet] = await Promise.all([
          dashboardService.fetchDashboard(),
          organizerService.getWalletBalance().catch(() => null),
        ]);
        setData(result);
        setOrganizerTournaments([]);
        setOrganizerWalletBalance(null);
        setPlayerWallet(wallet);
      }
    } catch {
      // Silently fail — show empty states
    } finally {
      setIsLoading(false);
    }
  }, [isOrganizer]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void fetchData();
  }, [fetchData]);

  const displayName = useMemo(() => {
    if (data?.profile) {
      const full = `${data.profile.firstName} ${data.profile.lastName}`.trim();
      return full || data.profile.username;
    }
    const full = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
    return full || user?.username || (isOrganizer ? "Organizer" : "Player");
  }, [data?.profile, isOrganizer, user]);

  const profile = data?.profile;
  const registrations = data?.registrations ?? [];
  const stats = data?.stats ?? {
    joinedTournaments: 0,
    totalWins: 0,
    totalPrizeWon: 0,
    checkedInCount: 0,
  };

  const activeRegistrations = registrations.filter(
    (r) => r.status === "registered" || r.status === "checked_in",
  );
  const completedRegistrations = registrations.filter(
    (r) =>
      r.status !== "registered" &&
      r.status !== "checked_in" &&
      r.status !== "pending_payment",
  );

  const initials = profile
    ? `${(profile.firstName?.[0] ?? "").toUpperCase()}${(profile.lastName?.[0] ?? "").toUpperCase()}`
    : user
      ? `${(user.firstName?.[0] ?? "").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}`
      : "?";

  const liveOrganizerStatuses = new Set(["open", "published", "awaiting_deposit"]);
  const organizerTotalParticipants = organizerTournaments.reduce(
    (sum, t) => sum + t.currentCount, 0,
  );
  const organizerLiveCount = organizerTournaments.filter((t) =>
    liveOrganizerStatuses.has(t.status),
  ).length;
  const organizerCompletedCount = organizerTournaments.filter(
    (t) => t.status === "completed",
  ).length;
  const organizerDrafts = organizerTournaments.filter(
    (t) => t.status === "draft" || t.status === "awaiting_deposit",
  );
  const organizerActiveList = organizerTournaments.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled",
  );
  const organizerActivePreview = organizerActiveList.slice(0, 4);
  const organizerActiveHiddenCount = Math.max(0, organizerActiveList.length - 4);

  const formatGhs = (amountMinorUnits?: number | null) => {
    const value = Number(amountMinorUnits ?? 0) / 100;
    return `GHS ${value.toFixed(2)}`;
  };

  const handleDeposit = async () => {
    const amount = Number(walletAmountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setWalletError("Enter a valid amount greater than 0.");
      return;
    }
    setIsDepositing(true);
    setWalletError(null);
    setWalletInfo(null);
    try {
      const result = await organizerService.initiateWalletTopUp(amount);
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      setWalletInfo("Deposit initiated. Check your payment app or transaction history.");
      const refreshedWallet = await organizerService.getWalletBalance().catch(() => null);
      if (refreshedWallet) setPlayerWallet(refreshedWallet);
    } catch (error) {
      setWalletError(
        error instanceof Error ? error.message : "Failed to initiate deposit.",
      );
    } finally {
      setIsDepositing(false);
    }
  };

  const playerCalendarEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];
    registrations.forEach((r) => {
      if (r.tournamentSchedule.startDate) {
        events.push({
          id: `${r.id}-start`,
          title: r.tournamentTitle,
          date: r.tournamentSchedule.startDate,
          to: `/auth/tournaments/${r.tournamentId}`,
          badge: "Start",
          status: r.tournamentStatus,
        });
      }
      if (r.tournamentSchedule.checkInStart) {
        events.push({
          id: `${r.id}-checkin`,
          title: r.tournamentTitle,
          date: r.tournamentSchedule.checkInStart,
          to: `/auth/tournaments/${r.tournamentId}`,
          badge: "Check-In",
          status: r.tournamentStatus,
        });
      }
    });
    return events;
  }, [registrations]);

  const organizerCalendarEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];
    organizerTournaments.forEach((t) => {
      if (t.schedule.tournamentStart) {
        events.push({
          id: `${t.id}-start`,
          title: t.title,
          date: t.schedule.tournamentStart,
          to: `/auth/organizer/tournaments/${t.id}`,
          badge: "Start",
          status: t.status,
        });
      }
      if (t.schedule.checkInStart) {
        events.push({
          id: `${t.id}-checkin`,
          title: t.title,
          date: t.schedule.checkInStart,
          to: `/auth/organizer/tournaments/${t.id}`,
          badge: "Check-In",
          status: t.status,
        });
      }
    });
    return events;
  }, [organizerTournaments]);

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="h-8 w-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <span className="text-sm">Loading dashboard…</span>
        </div>
      </div>
    );
  }

  // ─── Organizer Dashboard ───────────────────────────────────────────────────

  if (isOrganizer) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto space-y-6">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_0%,rgba(6,182,212,0.1),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_100%_100%,rgba(16,185,129,0.07),transparent)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:40px_40px]" />

          <div className="relative flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-cyan-500/30 to-emerald-500/20 blur-sm" />
                <div className="relative w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl font-bold text-white overflow-hidden">
                  {profile?.avatarUrl
                    ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : initials}
                </div>
                <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium mb-0.5">
                  Organizer Command Center
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                  {displayName}
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Manage tournaments, track entrants, and monitor earnings.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to="/auth/organizer/create-tournament"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                Create Tournament
              </Link>
              <Link
                to="/auth/organizer/tournaments"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800/60 hover:border-slate-600 transition-colors"
              >
                <ListTodo className="w-4 h-4" />
                Manage
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Trophy}   label="Total Tournaments" value={organizerTournaments.length} accentColor="cyan" />
          <StatCard icon={Activity} label="Live / Published"   value={organizerLiveCount}          accentColor="emerald" />
          <StatCard icon={Users}    label="Total Entrants"     value={organizerTotalParticipants}  accentColor="indigo" />
          <StatCard
            icon={Wallet}
            label="Wallet Balance"
            value={
              organizerWalletBalance === null
                ? "GHS —"
                : `GHS ${(organizerWalletBalance / 100).toFixed(2)}`
            }
            accentColor="amber"
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-6 min-w-0">

            {/* Active Tournaments */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-semibold text-white">Active Tournaments</h2>
                {organizerActiveHiddenCount > 0 && (
                  <Link
                    to="/auth/organizer/tournaments"
                    className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    +{organizerActiveHiddenCount} more <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              {organizerActiveList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {organizerActivePreview.map((t) => (
                    <OrganizerTournamentCard key={t.id} tournament={t} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60">
                  <EmptyState
                    icon={Trophy}
                    title="No Active Tournaments"
                    description="Create or publish a tournament to start receiving player registrations."
                    actionLabel="Create Tournament"
                    actionTo="/auth/organizer/create-tournament"
                  />
                </div>
              )}
            </section>

            {/* Drafts */}
            <section>
              <h2 className="font-display text-lg font-semibold text-white mb-3">
                Drafts & Pending Deposit
              </h2>
              {organizerDrafts.length > 0 ? (
                <div className="space-y-3">
                  {organizerDrafts.slice(0, 4).map((t) => (
                    <OrganizerTournamentCard key={`draft-${t.id}`} tournament={t} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60">
                  <EmptyState
                    icon={CheckCircle2}
                    title="No Pending Drafts"
                    description="Great. You have no draft or deposit-pending tournaments right now."
                    actionLabel="View All Tournaments"
                    actionTo="/auth/organizer/tournaments"
                  />
                </div>
              )}
            </section>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <CalendarWidget events={organizerCalendarEvents} />

            {/* Snapshot */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Organizer Snapshot
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Completed",         value: organizerCompletedCount, color: "text-emerald-300" },
                  { label: "Draft / Pending",   value: organizerDrafts.length,  color: "text-amber-300"   },
                  { label: "Open / Published",  value: organizerLiveCount,      color: "text-cyan-300"    },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{row.label}</span>
                    <span className={`font-bold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Create a new tournament",    to: "/auth/organizer/create-tournament" },
                  { label: "Open tournament management", to: "/auth/organizer/tournaments"       },
                  { label: "Update organizer profile",   to: "/auth/organizer/profile"           },
                ].map((a) => (
                  <Link
                    key={a.to}
                    to={a.to}
                    className="flex items-center justify-between text-xs rounded-lg border border-slate-800 px-3 py-2.5 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300 hover:bg-cyan-500/5 transition-all"
                  >
                    {a.label}
                    <ArrowRight className="w-3 h-3 opacity-50" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Player Dashboard ──────────────────────────────────────────────────────

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto space-y-6">

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        {/* Radial glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_0%_0%,rgba(6,182,212,0.1),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_100%_100%,rgba(99,102,241,0.08),transparent)]" />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="relative flex items-center justify-between flex-wrap gap-6">
          {/* Left: Avatar + Name */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-cyan-500/35 to-indigo-500/20 blur-sm" />
              <div className="relative w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl font-bold text-white overflow-hidden">
                {profile?.avatarUrl
                  ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : initials}
              </div>
              <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 ring-1 ring-emerald-500/30" />
            </div>

            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium mb-0.5">
                Player Dashboard
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                {displayName}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-300">
                  <Medal className="w-3 h-3" /> Average
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-300">
                  <Zap className="w-3 h-3" /> 1000 ELO
                </span>
              </div>
            </div>
          </div>

          {/* Right: CTAs */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              to="/auth/player/join-tournament"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
            >
              <Swords className="w-4 h-4" />
              Browse
            </Link>
            <Link
              to="/auth/player/profile"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800/60 hover:border-slate-600 transition-colors"
            >
              Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Trophy}       label="Tournaments"   value={stats.joinedTournaments}                                               accentColor="cyan"    />
        <StatCard icon={Target}       label="Total Wins"    value={stats.totalWins}                                                       accentColor="emerald" />
        <StatCard icon={Medal}        label="Prize Won"     value={stats.totalPrizeWon > 0 ? `$${stats.totalPrizeWon.toLocaleString()}` : "$0"} accentColor="amber"   />
        <StatCard icon={CheckCircle2} label="Checked In"    value={stats.checkedInCount}                                                  accentColor="indigo"  />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-6">

        {/* ── Left Column ── */}
        <div className="space-y-4 min-w-0">

          {/* Tournaments section with tabs */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-white">My Tournaments</h2>
              <div className="flex items-center rounded-lg bg-slate-800/60 border border-slate-700/60 p-0.5 gap-0.5">
                <button
                  onClick={() => setTournamentTab("active")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    tournamentTab === "active"
                      ? "bg-slate-700 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  Active&nbsp;
                  <span className={`${tournamentTab === "active" ? "text-cyan-400" : "text-slate-500"}`}>
                    ({activeRegistrations.length})
                  </span>
                </button>
                <button
                  onClick={() => setTournamentTab("history")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    tournamentTab === "history"
                      ? "bg-slate-700 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  History&nbsp;
                  <span className={`${tournamentTab === "history" ? "text-cyan-400" : "text-slate-500"}`}>
                    ({completedRegistrations.length})
                  </span>
                </button>
              </div>
            </div>

            {tournamentTab === "active" ? (
              activeRegistrations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeRegistrations.map((reg) => (
                    <JoinedTournamentDetailsCard key={reg.id} reg={reg} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60">
                  <EmptyState
                    icon={Trophy}
                    title="No Active Tournaments"
                    description="Browse and join tournaments to compete with other players."
                    actionLabel="Browse Tournaments"
                    actionTo="/auth/player/join-tournament"
                  />
                </div>
              )
            ) : completedRegistrations.length > 0 ? (
              <div className="space-y-2">
                {completedRegistrations.map((reg) => (
                  <TournamentCard key={reg.id} reg={reg} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60">
                <EmptyState
                  icon={Gamepad2}
                  title="No Tournament History"
                  description="Completed tournaments will appear here."
                />
              </div>
            )}
          </section>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-4">

          {/* Calendar */}
          <CalendarWidget events={playerCalendarEvents} />

          {/* Wallet */}
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-cyan-950/60 to-slate-900">
              <Wallet className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Wallet</h3>
              <Link
                to="/auth/transactions"
                className="ml-auto text-[11px] text-slate-500 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                History <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-slate-900/60 p-4 space-y-3">
              {/* Total balance — hero number */}
              <div className="rounded-xl bg-gradient-to-br from-cyan-500/8 to-indigo-500/5 border border-cyan-500/10 p-4 text-center">
                <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">
                  Total Balance
                </p>
                <p className="text-2xl font-bold text-cyan-300">
                  {formatGhs(playerWallet?.totalBalance)}
                </p>
              </div>

              {/* Available / Pending split */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2.5 text-center">
                  <p className="text-[11px] text-slate-500 mb-0.5">Available</p>
                  <p className="text-sm font-bold text-emerald-300">
                    {formatGhs(playerWallet?.availableBalance)}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 px-3 py-2.5 text-center">
                  <p className="text-[11px] text-slate-500 mb-0.5">Pending</p>
                  <p className="text-sm font-bold text-amber-300">
                    {formatGhs(playerWallet?.pendingBalance)}
                  </p>
                </div>
              </div>

              {/* Deposit input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs text-slate-400" htmlFor="wallet-amount">
                  Deposit Amount (GHS)
                </label>
                <div className="flex gap-2">
                  <input
                    id="wallet-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={walletAmountInput}
                    onChange={(e) => setWalletAmountInput(e.target.value)}
                    className="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. 20"
                  />
                  <button
                    type="button"
                    onClick={() => { void handleDeposit(); }}
                    disabled={isDepositing}
                    className="shrink-0 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors"
                  >
                    {isDepositing ? "…" : "Deposit"}
                  </button>
                </div>
              </div>

              {walletError && (
                <p className="text-xs text-red-300 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-2">
                  {walletError}
                </p>
              )}
              {walletInfo && (
                <p className="text-xs text-cyan-300 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-2">
                  {walletInfo}
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Quick Stats
            </h3>
            <div className="space-y-3">
              {[
                { label: "Total Matches",        value: "0",                                icon: Gamepad2,    color: "text-slate-300"   },
                { label: "Win Rate",             value: "0%",                               icon: Target,      color: "text-emerald-300" },
                { label: "Tournaments Played",   value: String(stats.joinedTournaments),    icon: Trophy,      color: "text-cyan-300"    },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <s.icon className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-xs text-slate-400">{s.label}</span>
                  </div>
                  <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Score Confirmations */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Score Confirmations
              </h3>
            </div>
            <div className="flex items-center justify-center gap-2 py-3 text-slate-600">
              <CheckCircle2 className="w-4 h-4" />
              <p className="text-xs">No pending confirmations</p>
            </div>
          </div>

          {/* Connections */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Connections
              </h3>
            </div>
            <div className="flex rounded-lg bg-slate-800/50 border border-slate-700/40 p-0.5 mb-3">
              <button className="flex-1 py-1.5 text-xs font-medium rounded-md bg-slate-700 text-white">
                Followers 0
              </button>
              <button className="flex-1 py-1.5 text-xs font-medium rounded-md text-slate-400 hover:text-slate-300 transition-colors">
                Following 0
              </button>
            </div>
            <p className="text-xs text-slate-600 text-center py-1">No followers yet</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
