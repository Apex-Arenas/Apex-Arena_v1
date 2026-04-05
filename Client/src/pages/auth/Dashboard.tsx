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
  const [organizerTournaments, setOrganizerTournaments] = useState<
    OrganizerTournament[]
  >([]);
  const [organizerWalletBalance, setOrganizerWalletBalance] = useState<
    number | null
  >(null);
  const [playerWallet, setPlayerWallet] = useState<WalletBalance | null>(null);
  const [walletAmountInput, setWalletAmountInput] = useState("10");
  const [isDepositing, setIsDepositing] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
          stats: {
            joinedTournaments: 0,
            totalWins: 0,
            totalPrizeWon: 0,
            checkedInCount: 0,
          },
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
  const joinedTournamentDetails = [...registrations]
    .sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();

      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;
      return bTime - aTime;
    })
    .slice(0, 6);
  const joinedTournamentHiddenCount = Math.max(
    0,
    registrations.length - joinedTournamentDetails.length,
  );

  const initials = profile
    ? `${(profile.firstName?.[0] ?? "").toUpperCase()}${(profile.lastName?.[0] ?? "").toUpperCase()}`
    : user
      ? `${(user.firstName?.[0] ?? "").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}`
      : "?";

  const liveOrganizerStatuses = new Set([
    "open",
    "published",
    "awaiting_deposit",
  ]);
  const organizerTotalParticipants = organizerTournaments.reduce(
    (sum, tournament) => sum + tournament.currentCount,
    0,
  );
  const organizerLiveCount = organizerTournaments.filter((tournament) =>
    liveOrganizerStatuses.has(tournament.status),
  ).length;
  const organizerCompletedCount = organizerTournaments.filter(
    (tournament) => tournament.status === "completed",
  ).length;
  const organizerDrafts = organizerTournaments.filter(
    (tournament) =>
      tournament.status === "draft" || tournament.status === "awaiting_deposit",
  );
  const organizerActiveList = organizerTournaments.filter(
    (tournament) =>
      tournament.status !== "completed" && tournament.status !== "cancelled",
  );
  const organizerActivePreview = organizerActiveList.slice(0, 4);
  const organizerActiveHiddenCount = Math.max(
    0,
    organizerActiveList.length - organizerActivePreview.length,
  );

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

      setWalletInfo(
        "Deposit initiated. Check your payment app or transaction history for confirmation.",
      );
      const refreshedWallet = await organizerService
        .getWalletBalance()
        .catch(() => null);
      if (refreshedWallet) {
        setPlayerWallet(refreshedWallet);
      }
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

    registrations.forEach((registration) => {
      if (registration.tournamentSchedule.startDate) {
        events.push({
          id: `${registration.id}-start`,
          title: registration.tournamentTitle,
          date: registration.tournamentSchedule.startDate,
          to: `/auth/tournaments/${registration.tournamentId}`,
          badge: "Start",
          status: registration.tournamentStatus,
        });
      }

      if (registration.tournamentSchedule.checkInStart) {
        events.push({
          id: `${registration.id}-checkin`,
          title: registration.tournamentTitle,
          date: registration.tournamentSchedule.checkInStart,
          to: `/auth/tournaments/${registration.tournamentId}`,
          badge: "Check-In",
          status: registration.tournamentStatus,
        });
      }
    });

    return events;
  }, [registrations]);

  const organizerCalendarEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];

    organizerTournaments.forEach((tournament) => {
      if (tournament.schedule.tournamentStart) {
        events.push({
          id: `${tournament.id}-start`,
          title: tournament.title,
          date: tournament.schedule.tournamentStart,
          to: `/auth/organizer/tournaments/${tournament.id}`,
          badge: "Start",
          status: tournament.status,
        });
      }

      if (tournament.schedule.checkInStart) {
        events.push({
          id: `${tournament.id}-checkin`,
          title: tournament.title,
          date: tournament.schedule.checkInStart,
          to: `/auth/organizer/tournaments/${tournament.id}`,
          badge: "Check-In",
          status: tournament.status,
        });
      }
    });

    return events;
  }, [organizerTournaments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="h-5 w-5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (isOrganizer) {
    return (
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-linear-to-r from-cyan-500/10 via-slate-900/70 to-emerald-500/10 p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover border-2 border-slate-700"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-lg font-bold text-slate-300">
                  {initials}
                </div>
              )}

              <div>
                <h1 className="font-display text-2xl font-bold text-white">
                  Organizer Command Center
                </h1>
                <p className="text-sm text-slate-300 mt-0.5">
                  {displayName}, manage tournaments, deposits, and live
                  participation.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/auth/organizer/create-tournament"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Create Tournament
              </Link>
              <Link
                to="/auth/organizer/tournaments"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-200 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                <ListTodo className="w-4 h-4" />
                Manage Tournaments
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Trophy}
            label="Total Tournaments"
            value={organizerTournaments.length}
          />
          <StatCard
            icon={Activity}
            label="Live / Published"
            value={organizerLiveCount}
            accent="text-emerald-300"
          />
          <StatCard
            icon={Users}
            label="Total Entrants"
            value={organizerTotalParticipants}
          />
          <StatCard
            icon={Wallet}
            label="Wallet Balance"
            value={
              organizerWalletBalance === null
                ? "GHS --"
                : `GHS ${(organizerWalletBalance / 100).toFixed(2)}`
            }
            accent="text-cyan-300"
          />
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-6">
            <section>
              <h2 className="font-display text-lg font-semibold text-white mb-3">
                Active Tournaments
              </h2>
              {organizerActiveList.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {organizerActivePreview.map((tournament) => (
                      <OrganizerTournamentCard
                        key={tournament.id}
                        tournament={tournament}
                      />
                    ))}
                  </div>
                  {organizerActiveHiddenCount > 0 && (
                    <p className="text-xs text-slate-400 mt-2">
                      {organizerActiveHiddenCount} more active tournament
                      {organizerActiveHiddenCount > 1 ? "s" : ""} hidden. Use
                      Manage Tournaments to view all.
                    </p>
                  )}
                </>
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

            <section>
              <h2 className="font-display text-lg font-semibold text-white mb-3">
                Drafts & Pending Deposit
              </h2>
              {organizerDrafts.length > 0 ? (
                <div className="space-y-3">
                  {organizerDrafts.slice(0, 4).map((tournament) => (
                    <OrganizerTournamentCard
                      key={`draft-${tournament.id}`}
                      tournament={tournament}
                    />
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

          <div className="space-y-4">
            <CalendarWidget events={organizerCalendarEvents} />

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="text-sm font-semibold text-white mb-3">
                Organizer Snapshot
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Completed Tournaments</span>
                  <span className="font-semibold text-emerald-300">
                    {organizerCompletedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Draft/Pending Deposit</span>
                  <span className="font-semibold text-amber-300">
                    {organizerDrafts.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">
                    Open/Public Tournaments
                  </span>
                  <span className="font-semibold text-cyan-300">
                    {organizerLiveCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="text-sm font-semibold text-white mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Link
                  to="/auth/organizer/create-tournament"
                  className="block text-xs rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors"
                >
                  Create a new tournament
                </Link>
                <Link
                  to="/auth/organizer/tournaments"
                  className="block text-xs rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors"
                >
                  Open tournament management
                </Link>
                <Link
                  to="/auth/organizer/profile"
                  className="block text-xs rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors"
                >
                  Update organizer profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="w-14 h-14 rounded-full object-cover border-2 border-slate-700"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-lg font-bold text-slate-300">
              {initials}
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              {displayName}
            </h1>
            <p className="text-sm text-slate-400">Welcome to your dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
            <Medal className="w-4 h-4 text-cyan-400" />
            <div className="text-xs">
              <p className="text-slate-400">Badge</p>
              <p className="font-semibold text-white">Average</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <div className="text-xs">
              <p className="text-slate-400">Rating</p>
              <p className="font-semibold text-white">1000</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Trophy}
          label="Joined Tournaments"
          value={stats.joinedTournaments}
        />
        <StatCard icon={Target} label="Total Wins" value={stats.totalWins} />
        <StatCard
          icon={Medal}
          label="Prize Won"
          value={
            stats.totalPrizeWon > 0
              ? `$${stats.totalPrizeWon.toLocaleString()}`
              : "$0"
          }
          accent="text-cyan-300"
        />
        <StatCard
          icon={CheckCircle2}
          label="Checked In"
          value={stats.checkedInCount}
        />
      </div>

      {/* Main Grid: Content + Right Sidebar */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* My Tournaments */}
          <section>
            <h2 className="font-display text-lg font-semibold text-white mb-3">
              My Tournaments
            </h2>
            {activeRegistrations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeRegistrations.map((reg) => (
                  <TournamentCard key={reg.id} reg={reg} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60">
                <EmptyState
                  icon={Trophy}
                  title="No Tournaments Yet"
                  description="You haven't joined any tournaments. Browse and join tournaments to compete with other players."
                  actionLabel="Browse Tournaments"
                  actionTo="/auth/player/join-tournament"
                />
              </div>
            )}
          </section>

          {/* Joined Tournaments Details */}
          <section>
            <h2 className="font-display text-lg font-semibold text-white mb-3">
              Joined Tournaments Details
            </h2>
            {joinedTournamentDetails.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {joinedTournamentDetails.map((reg) => (
                    <JoinedTournamentDetailsCard
                      key={`joined-${reg.id}`}
                      reg={reg}
                    />
                  ))}
                </div>
                {joinedTournamentHiddenCount > 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    {joinedTournamentHiddenCount} more joined tournament
                    {joinedTournamentHiddenCount > 1 ? "s" : ""} hidden.
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60">
                <EmptyState
                  icon={Gamepad2}
                  title="No Joined Tournaments"
                  description="You have not joined any tournaments yet. Join one to see detailed tracking here."
                  actionLabel="Join a Tournament"
                  actionTo="/auth/player/join-tournament"
                />
              </div>
            )}
          </section>

          {/* Past Tournaments */}
          {completedRegistrations.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-white mb-3">
                Past Tournaments
              </h2>
              <div className="space-y-3">
                {completedRegistrations.map((reg) => (
                  <TournamentCard key={reg.id} reg={reg} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Calendar */}
          <CalendarWidget events={playerCalendarEvents} />

          {/* Wallet */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-cyan-300" />
              Wallet
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2">
                <p className="text-slate-400">Available</p>
                <p className="font-semibold text-emerald-300">
                  {formatGhs(playerWallet?.availableBalance)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2">
                <p className="text-slate-400">Pending</p>
                <p className="font-semibold text-amber-300">
                  {formatGhs(playerWallet?.pendingBalance)}
                </p>
              </div>
              <div className="col-span-2 rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2">
                <p className="text-slate-400">Total Balance</p>
                <p className="font-semibold text-cyan-300">
                  {formatGhs(playerWallet?.totalBalance)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400" htmlFor="wallet-amount">
                Deposit Amount (GHS)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="wallet-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={walletAmountInput}
                  onChange={(e) => setWalletAmountInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g. 20"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleDeposit();
                  }}
                  disabled={isDepositing}
                  className="shrink-0 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
                >
                  {isDepositing ? "Processing..." : "Deposit"}
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

          {/* Score Confirmations */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-slate-400" />
              Score Confirmations
            </h3>
            <div className="flex flex-col items-center py-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">No pending confirmations</p>
            </div>
          </div>

          {/* Connections */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              Connections
            </h3>
            <div className="flex rounded-lg bg-slate-800/50 p-0.5 mb-3">
              <button className="flex-1 py-1.5 text-xs font-medium rounded-md bg-slate-700 text-white">
                Followers 0
              </button>
              <button className="flex-1 py-1.5 text-xs font-medium rounded-md text-slate-400">
                Following 0
              </button>
            </div>
            <p className="text-xs text-slate-500 text-center py-2">
              No followers yet
            </p>
          </div>

          {/* Quick Stats */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-slate-400" />
              Quick Stats
            </h3>
            <div className="space-y-2">
              {[
                { label: "Total Matches", value: "0" },
                { label: "Win Rate", value: "0%" },
                {
                  label: "Tournaments Played",
                  value: String(stats.joinedTournaments),
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-slate-400">{s.label}</span>
                  <span className="font-semibold text-white">{s.value}</span>
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
