import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Medal,
  Target,
  Gamepad2,
  CheckCircle2,
  PlusCircle,
  ListTodo,
  Users,
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

// ─── Dashboard ───────────────────────────────────────────────────────────────

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
      // silently fail — show empty states
    } finally {
      setIsLoading(false);
    }
  }, [isOrganizer]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void fetchData();
  }, [fetchData]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

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

  // ─── Loading ─────────────────────────────────────────────────────────────

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

  // ─── Organizer Dashboard ──────────────────────────────────────────────────

  if (isOrganizer) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto space-y-6">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-6 py-7 sm:px-8 sm:py-8">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/[0.07] blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-emerald-500/[0.05] blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between flex-wrap gap-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-[60px] h-[60px] rounded-full ring-2 ring-slate-700 ring-offset-2 ring-offset-slate-900 bg-slate-800 flex items-center justify-center text-xl font-bold text-white overflow-hidden">
                  {profile?.avatarUrl
                    ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : initials}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-0.5">{greeting} — Organizer</p>
                <h1 className="font-display text-2xl font-bold text-white">{displayName}</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  {organizerTournaments.length > 0
                    ? `${organizerTournaments.length} tournament${organizerTournaments.length !== 1 ? "s" : ""} · ${organizerLiveCount} live`
                    : "No tournaments yet — create your first one"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/auth/organizer/create-tournament"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                Create Tournament
              </Link>
              <Link
                to="/auth/organizer/tournaments"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:border-slate-600 hover:bg-slate-800/50 transition-colors"
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
            value={organizerWalletBalance === null ? "GHS —" : `GHS ${(organizerWalletBalance / 100).toFixed(2)}`}
            accentColor="amber"
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-6 min-w-0">

            {/* Active Tournaments */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base font-semibold text-white">Active Tournaments</h2>
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
                    description="Create or publish a tournament to start receiving registrations."
                    actionLabel="Create Tournament"
                    actionTo="/auth/organizer/create-tournament"
                  />
                </div>
              )}
            </section>

            {/* Drafts */}
            {organizerDrafts.length > 0 && (
              <section>
                <h2 className="font-display text-base font-semibold text-white mb-4">
                  Drafts & Pending Deposit
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {organizerDrafts.slice(0, 4).map((t) => (
                    <OrganizerTournamentCard key={`draft-${t.id}`} tournament={t} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <CalendarWidget events={organizerCalendarEvents} />

            {/* Snapshot */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Snapshot
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: "Open / Live",      value: organizerLiveCount,      color: "text-cyan-300" },
                  { label: "Draft / Pending",  value: organizerDrafts.length,  color: "text-amber-300" },
                  { label: "Completed",        value: organizerCompletedCount, color: "text-emerald-300" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{row.label}</span>
                    <span className={`text-sm font-bold tabular-nums ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Quick Links
              </h3>
              <div className="space-y-1.5">
                {[
                  { label: "Create a tournament",   to: "/auth/organizer/create-tournament" },
                  { label: "Tournament management", to: "/auth/organizer/tournaments" },
                  { label: "Organizer profile",     to: "/auth/organizer/profile" },
                  { label: "Analytics",             to: "/auth/organizer/analytics" },
                ].map((a) => (
                  <Link
                    key={a.to}
                    to={a.to}
                    className="flex items-center justify-between text-xs rounded-lg border border-slate-800 px-3 py-2.5 text-slate-400 hover:border-slate-700 hover:text-white hover:bg-slate-800/40 transition-all"
                  >
                    {a.label}
                    <ArrowRight className="w-3 h-3 opacity-40" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Player Dashboard ─────────────────────────────────────────────────────

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto space-y-6">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-6 py-7 sm:px-8 sm:py-8">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/[0.07] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-indigo-500/[0.05] blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between flex-wrap gap-5">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-[60px] h-[60px] rounded-full ring-2 ring-slate-700 ring-offset-2 ring-offset-slate-900 bg-slate-800 flex items-center justify-center text-xl font-bold text-white overflow-hidden">
                {profile?.avatarUrl
                  ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : initials}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-0.5">{greeting}</p>
              <h1 className="font-display text-2xl font-bold text-white">{displayName}</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {activeRegistrations.length > 0
                  ? `${activeRegistrations.length} active tournament${activeRegistrations.length !== 1 ? "s" : ""}`
                  : "No active tournaments · browse to join one"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/auth/player/join-tournament"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
            >
              <Swords className="w-4 h-4" />
              Find Tournaments
            </Link>
            <Link
              to="/auth/player/profile"
              className="inline-flex items-center px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:border-slate-600 hover:bg-slate-800/50 transition-colors"
            >
              Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Trophy}       label="Tournaments"  value={stats.joinedTournaments}  accentColor="cyan" />
        <StatCard icon={Target}       label="Total Wins"   value={stats.totalWins}           accentColor="emerald" />
        <StatCard
          icon={Medal}
          label="Prize Won"
          value={stats.totalPrizeWon > 0 ? `$${stats.totalPrizeWon.toLocaleString()}` : "$0"}
          accentColor="amber"
        />
        <StatCard icon={CheckCircle2} label="Checked In"   value={stats.checkedInCount}      accentColor="indigo" />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-6">

        {/* Left: My Tournaments */}
        <section className="min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-white">My Tournaments</h2>
            <div className="flex items-center rounded-lg bg-slate-800/60 border border-slate-700/60 p-0.5">
              <button
                onClick={() => setTournamentTab("active")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  tournamentTab === "active"
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                Active ({activeRegistrations.length})
              </button>
              <button
                onClick={() => setTournamentTab("history")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  tournamentTab === "history"
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                History ({completedRegistrations.length})
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
                actionLabel="Browse Tournaments"
                actionTo="/auth/player/join-tournament"
              />
            </div>
          )}
        </section>

        {/* Right Sidebar */}
        <div className="space-y-4">

          {/* Calendar */}
          <CalendarWidget events={playerCalendarEvents} />

          {/* Wallet */}
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900">
              <Wallet className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Wallet</h3>
              <Link
                to="/auth/transactions"
                className="ml-auto text-[11px] text-slate-500 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                History <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-slate-900 p-4 space-y-3">
              {/* Balance */}
              <div className="text-center py-1">
                <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Total Balance</p>
                <p className="text-2xl font-bold text-white">{formatGhs(playerWallet?.totalBalance)}</p>
              </div>

              {/* Available / Pending */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-800 px-3 py-2.5 text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Available</p>
                  <p className="text-sm font-semibold text-emerald-300">{formatGhs(playerWallet?.availableBalance)}</p>
                </div>
                <div className="rounded-lg border border-slate-800 px-3 py-2.5 text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Pending</p>
                  <p className="text-sm font-semibold text-amber-300">{formatGhs(playerWallet?.pendingBalance)}</p>
                </div>
              </div>

              {/* Deposit */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs text-slate-400" htmlFor="wallet-amount">
                  Deposit (GHS)
                </label>
                <div className="flex gap-2">
                  <input
                    id="wallet-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={walletAmountInput}
                    onChange={(e) => setWalletAmountInput(e.target.value)}
                    className="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
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
                <p className="text-xs text-red-300 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                  {walletError}
                </p>
              )}
              {walletInfo && (
                <p className="text-xs text-cyan-300 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2">
                  {walletInfo}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Quick actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Swords,       label: "Browse tournaments", to: "/auth/player/join-tournament" },
                { icon: Target,       label: "Leaderboard",        to: "/auth/leaderboard" },
                { icon: Gamepad2,     label: "My profile",         to: "/auth/player/profile" },
                { icon: ArrowRight,   label: "Wallet",             to: "/auth/wallet" },
              ].map(({ icon: Icon, label, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 transition-all text-xs text-slate-300"
                >
                  <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Live Now */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-orange-400" />
              <p className="text-sm font-semibold text-white">Live now</p>
            </div>
            <div className="space-y-2">
              {[
                { title: "Arena Showdown · CODM",  count: "48 players" },
                { title: "Lunchbreak Cup · FIFA",  count: "16 players" },
                { title: "MLBB Weekly Finals",     count: "32 players" },
              ].map((t) => (
                <div key={t.title} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <span className="text-slate-300 truncate text-xs">{t.title}</span>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0 ml-2">{t.count}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
