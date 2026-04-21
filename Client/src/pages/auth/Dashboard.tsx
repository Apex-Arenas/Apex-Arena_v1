import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Gamepad2,
  PlusCircle,
  ListTodo,
  Wallet,
  ArrowRight,
  Swords,
  BarChart2,
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
  const organizerActivePreview = organizerActiveList.slice(0, 8);
  const organizerActiveHiddenCount = Math.max(0, organizerActiveList.length - 8);

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
      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto space-y-8">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800">
          {/* Ambient glows */}
          <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-orange-500/12 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />
          {/* Fine grid */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[48px_48px]" />

          <div className="relative px-6 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6 justify-between">
              {/* Identity */}
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-full ring-2 ring-orange-500/40 ring-offset-2 ring-offset-slate-900 bg-slate-800 flex items-center justify-center text-xl font-bold text-white overflow-hidden">
                    {profile?.avatarUrl
                      ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : initials}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                </div>
                <div>
                  <p className="text-xs text-orange-400/80 font-semibold uppercase tracking-[0.18em] mb-1">
                    {greeting} · Organizer
                  </p>
                  <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-none">
                    {displayName}
                  </h1>
                  {organizerTournaments.length > 0 ? (
                    <p className="text-sm text-slate-400 mt-2">
                      {organizerTournaments.length} tournament{organizerTournaments.length !== 1 ? "s" : ""} ·{" "}
                      <span className="text-emerald-400">{organizerLiveCount} live</span>
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 mt-2">No tournaments yet — create your first one</p>
                  )}
                </div>
              </div>

              {/* Live count + CTAs */}
              <div className="flex flex-col sm:items-end gap-4 shrink-0">
                {organizerLiveCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                    </span>
                    <span className="font-display text-2xl font-bold text-white">{organizerLiveCount}</span>
                    <span className="text-sm text-slate-400">live right now</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Link
                    to="/auth/organizer/create-tournament"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Create Tournament
                  </Link>
                  <Link
                    to="/auth/organizer/tournaments"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:border-slate-600 hover:bg-slate-800/60 transition-all"
                  >
                    <ListTodo className="w-4 h-4" />
                    Manage
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800/60 rounded-xl overflow-hidden border border-slate-800/60">
              {[
                { label: "Tournaments",   value: String(organizerTournaments.length),            accent: "text-white" },
                { label: "Live / Active", value: String(organizerLiveCount),                     accent: "text-emerald-400" },
                { label: "Total Entrants",value: String(organizerTotalParticipants),              accent: "text-cyan-400" },
                { label: "Wallet",        value: organizerWalletBalance === null ? "GHS —" : `GHS ${(organizerWalletBalance / 100).toFixed(2)}`, accent: "text-amber-400" },
              ].map((s) => (
                <div key={s.label} className="bg-slate-900 px-4 py-3">
                  <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className={`font-display text-xl font-bold tabular-nums ${s.accent}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-[1fr_272px] gap-6">
          <div className="space-y-8 min-w-0">

            {/* Active Tournaments */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-xl font-bold text-white">Active Tournaments</h2>
                  {organizerActiveList.length > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
                      {organizerActiveList.length}
                    </span>
                  )}
                </div>
                {organizerActiveHiddenCount > 0 && (
                  <Link
                    to="/auth/organizer/tournaments"
                    className="text-xs text-slate-400 hover:text-orange-400 flex items-center gap-1 transition-colors"
                  >
                    +{organizerActiveHiddenCount} more <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {organizerActiveList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {organizerActivePreview.map((t) => (
                    <OrganizerTournamentCard key={t.id} tournament={t} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 py-14 px-6 text-center">
                  <Trophy className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="font-display text-lg font-semibold text-slate-400">No active tournaments</p>
                  <p className="text-sm text-slate-600 mt-1 mb-6">Create or publish one to start receiving registrations.</p>
                  <Link
                    to="/auth/organizer/create-tournament"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Create Tournament
                  </Link>
                </div>
              )}
            </section>

            {/* Drafts */}
            {organizerDrafts.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="font-display text-xl font-bold text-white">Drafts & Pending</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    {organizerDrafts.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {organizerDrafts.slice(0, 6).map((t) => (
                    <OrganizerTournamentCard key={`draft-${t.id}`} tournament={t} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <CalendarWidget events={organizerCalendarEvents} />

            {/* Portfolio at a glance */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800/60">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Portfolio</p>
              </div>
              <div className="divide-y divide-slate-800/60">
                {[
                  { label: "Open / Live",     value: organizerLiveCount,      accent: "text-emerald-400", dot: "bg-emerald-400" },
                  { label: "Draft / Pending", value: organizerDrafts.length,  accent: "text-amber-400",   dot: "bg-amber-400" },
                  { label: "Completed",       value: organizerCompletedCount, accent: "text-cyan-300",    dot: "bg-cyan-400" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.dot}`} />
                      <span className="text-xs text-slate-400">{row.label}</span>
                    </div>
                    <span className={`font-display text-xl font-bold tabular-nums ${row.accent}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800/60">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Quick Actions</p>
              </div>
              <div className="p-2">
                {[
                  { label: "Create a tournament",  to: "/auth/organizer/create-tournament", accent: true },
                  { label: "Manage tournaments",   to: "/auth/organizer/tournaments" },
                  { label: "Analytics",            to: "/auth/organizer/analytics" },
                  { label: "Payouts",              to: "/auth/organizer/payouts" },
                  { label: "Profile",              to: "/auth/organizer/profile" },
                ].map((a) => (
                  <Link
                    key={a.to}
                    to={a.to}
                    className={`flex items-center justify-between text-xs rounded-lg px-3 py-2.5 transition-all group ${
                      a.accent
                        ? "text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    {a.label}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
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

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {/* Ambient glows */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-orange-500/12 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />
        {/* Fine grid */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[48px_48px]" />

        <div className="relative px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6 justify-between">
            {/* Identity */}
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full ring-2 ring-orange-500/40 ring-offset-2 ring-offset-slate-900 bg-slate-800 flex items-center justify-center text-xl font-bold text-white overflow-hidden">
                  {profile?.avatarUrl
                    ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : initials}
                </div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              <div>
                <p className="text-xs text-orange-400/80 font-semibold uppercase tracking-[0.18em] mb-1">
                  {greeting} · Player
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-none">
                  {displayName}
                </h1>
                <p className="text-sm text-slate-400 mt-2">
                  {activeRegistrations.length > 0
                    ? `${activeRegistrations.length} active tournament${activeRegistrations.length !== 1 ? "s" : ""}`
                    : "No active tournaments · browse to join one"}
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Link
                to="/auth/player/join-tournament"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
              >
                <Swords className="w-4 h-4" />
                Find Tournaments
              </Link>
              <Link
                to="/auth/player/profile"
                className="inline-flex items-center px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:border-slate-600 hover:bg-slate-800/60 transition-all"
              >
                Profile
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800/60 rounded-xl overflow-hidden border border-slate-800/60">
            {[
              { label: "Tournaments",  value: String(stats.joinedTournaments),  accent: "text-white" },
              { label: "Total Wins",   value: String(stats.totalWins),           accent: "text-emerald-400" },
              { label: "Prize Won",    value: stats.totalPrizeWon > 0 ? `GHS ${(stats.totalPrizeWon / 100).toFixed(2)}` : "GHS 0", accent: "text-amber-400" },
              { label: "Checked In",  value: String(stats.checkedInCount),       accent: "text-orange-400" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 px-4 py-3">
                <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                <p className={`font-display text-xl font-bold tabular-nums ${s.accent}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-6">

        {/* Left: My Tournaments */}
        <section className="min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-white">My Tournaments</h2>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRegistrations.map((reg) => (
                <JoinedTournamentDetailsCard key={reg.id} reg={reg} />
              ))}
              {/* Join more tournaments CTA card */}
              <Link
                to="/auth/player/join-tournament"
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 py-10 px-6 text-center hover:border-orange-500/40 hover:bg-orange-500/5 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                  <Swords className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-slate-300 group-hover:text-white transition-colors">
                    {activeRegistrations.length === 0 ? "Join a Tournament" : "Find More"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Browse open tournaments</p>
                </div>
              </Link>
            </div>
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
              <Wallet className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-white">Wallet</h3>
              <Link
                to="/auth/wallet"
                className="ml-auto text-[11px] text-slate-500 hover:text-orange-400 flex items-center gap-1 transition-colors"
              >
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-slate-900 p-4 space-y-3">
              {/* Balance */}
              <div className="text-center py-1">
                <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Total Balance</p>
                <p className="font-display text-2xl font-bold text-white">{formatGhs(playerWallet?.totalBalance)}</p>
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

              {/* Quick Deposit */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs text-slate-400" htmlFor="wallet-amount">
                  Quick Deposit (GHS)
                </label>
                <div className="flex gap-2">
                  <input
                    id="wallet-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={walletAmountInput}
                    onChange={(e) => setWalletAmountInput(e.target.value)}
                    className="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500/70 focus:outline-none transition-colors"
                    placeholder="e.g. 20"
                  />
                  <button
                    type="button"
                    onClick={() => { void handleDeposit(); }}
                    disabled={isDepositing}
                    className="shrink-0 rounded-lg bg-linear-to-r from-orange-500 to-amber-400 px-3 py-2 text-sm font-bold text-slate-950 hover:shadow-md hover:shadow-orange-500/20 disabled:opacity-60 transition-all"
                  >
                    {isDepositing ? "…" : "Go"}
                  </button>
                </div>
              </div>

              {walletError && (
                <p className="text-xs text-red-300 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                  {walletError}
                </p>
              )}
              {walletInfo && (
                <p className="text-xs text-orange-300 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2">
                  {walletInfo}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800/60">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Quick Actions</p>
            </div>
            <div className="p-2">
              {[
                { icon: Swords,    label: "Browse Tournaments", to: "/auth/player/join-tournament", accent: true },
                { icon: Trophy,    label: "Leaderboard",        to: "/auth/leaderboard" },
                { icon: Wallet,    label: "Wallet",             to: "/auth/wallet" },
                { icon: BarChart2, label: "Friends & Teams",    to: "/auth/friends" },
              ].map(({ icon: Icon, label, to, accent }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center justify-between text-xs rounded-lg px-3 py-2.5 transition-all group ${
                    accent
                      ? "text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </div>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
