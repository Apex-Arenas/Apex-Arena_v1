import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Medal,
  Target,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
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
  type TournamentRegistration,
} from "../../services/dashboard.service";
import {
  organizerService,
  type Tournament as OrganizerTournament,
} from "../../services/organizer.service";

// ─── Calendar Widget ────────────────────────────────────────────────────────

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function CalendarWidget() {
  const [date, setDate] = useState(() => new Date());
  const today = useMemo(() => new Date(), []);

  const year = date.getFullYear();
  const month = date.getMonth();
  const monthName = date.toLocaleString("default", { month: "long" });

  const firstDay = new Date(year, month, 1);
  // Monday = 0 offset
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { day: number; current: boolean; isToday: boolean }[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, current: false, isToday: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      d === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();
    cells.push({ day: d, current: true, isToday });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, current: false, isToday: false });
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
          {monthName}, {year}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setDate(new Date(year, month - 1, 1))}
            className="p-1 rounded hover:bg-white/10 text-slate-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDate(new Date(year, month + 1, 1))}
            className="p-1 rounded hover:bg-white/10 text-slate-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-xs">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-slate-500 font-medium">
            {d}
          </div>
        ))}
        {cells.map((c, i) => (
          <div
            key={i}
            className={`py-1.5 rounded-md text-xs ${
              c.isToday
                ? "bg-cyan-500 text-slate-950 font-bold"
                : c.current
                  ? "text-slate-200"
                  : "text-slate-600"
            }`}
          >
            {c.day}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${accent ?? "text-white"}`}>
          {value}
        </p>
      </div>
      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

// ─── Tournament Card ────────────────────────────────────────────────────────

function TournamentCard({ reg }: { reg: TournamentRegistration }) {
  const statusColors: Record<string, string> = {
    registered: "bg-cyan-500/20 text-cyan-300",
    checked_in: "bg-green-500/20 text-green-300",
    pending_payment: "bg-amber-500/20 text-amber-300",
    disqualified: "bg-red-500/20 text-red-300",
    withdrawn: "bg-slate-500/20 text-slate-400",
    cancelled: "bg-slate-500/20 text-slate-400",
  };

  const statusLabel = reg.status.replace(/_/g, " ");
  const dateStr = reg.tournamentSchedule.startDate
    ? new Date(reg.tournamentSchedule.startDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "TBD";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">
            {reg.tournamentTitle}
          </h4>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {dateStr}
            </span>
            <span className="flex items-center gap-1">
              <Gamepad2 className="w-3.5 h-3.5" />
              {reg.registrationType}
            </span>
          </div>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${
            statusColors[reg.status] ?? "bg-slate-700 text-slate-300"
          }`}
        >
          {statusLabel}
        </span>
      </div>
      {reg.finalPlacement && (
        <p className="text-xs text-cyan-300">
          Placed #{reg.finalPlacement}
          {reg.prizeWon ? ` — Won $${reg.prizeWon.toLocaleString()}` : ""}
        </p>
      )}
    </div>
  );
}

function OrganizerTournamentCard({
  tournament,
}: {
  tournament: OrganizerTournament;
}) {
  const statusColors: Record<string, string> = {
    draft: "bg-slate-600/20 text-slate-300",
    awaiting_deposit: "bg-amber-500/20 text-amber-300",
    published: "bg-cyan-500/20 text-cyan-300",
    open: "bg-green-500/20 text-green-300",
    completed: "bg-emerald-500/20 text-emerald-300",
    cancelled: "bg-red-500/20 text-red-300",
  };

  const startDate = tournament.schedule.tournamentStart
    ? new Date(tournament.schedule.tournamentStart).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        },
      )
    : "TBD";

  const fillPercent =
    tournament.maxParticipants > 0
      ? Math.min(
          100,
          Math.round(
            (tournament.currentCount / tournament.maxParticipants) * 100,
          ),
        )
      : 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">
            {tournament.title}
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            {tournament.game?.name ?? "Unknown Game"} •{" "}
            {tournament.format ?? "Solo"}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${
            statusColors[tournament.status] ?? "bg-slate-700 text-slate-300"
          }`}
        >
          {tournament.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" />
          {startDate}
        </span>
        <span>
          {tournament.currentCount}/{tournament.maxParticipants} slots
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-cyan-400 to-emerald-400"
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  actionTo: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-500">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-xs mb-4">{description}</p>
      <Link
        to={actionTo}
        className="px-5 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 transition-colors"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

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
      } else {
        const result = await dashboardService.fetchDashboard();
        setData(result);
        setOrganizerTournaments([]);
        setOrganizerWalletBalance(null);
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
            <CalendarWidget />

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
              <div className="space-y-3">
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

          {/* Upcoming Matches */}
          <section>
            <h2 className="font-display text-lg font-semibold text-white mb-3">
              Upcoming Matches
            </h2>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60">
              <EmptyState
                icon={Gamepad2}
                title="No Upcoming Matches"
                description="You don't have any scheduled matches. Join tournaments to get matched with opponents."
                actionLabel="Join a Tournament"
                actionTo="/auth/player/join-tournament"
              />
            </div>
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
          <CalendarWidget />

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
