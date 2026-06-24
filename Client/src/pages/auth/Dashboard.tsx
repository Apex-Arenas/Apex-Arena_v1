import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type CalendarEvent,
  PlayerDashboard,
  OrganizerDashboard,
} from "../../components/dashboard";

// ─── Dashboard ───────────────────────────────────────────────────────────────

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
  const [tournamentTab, setTournamentTab] = useState<"active" | "history">(
    "active",
  );
  const [statsOpen, setStatsOpen] = useState(false);
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

  const liveOrganizerStatuses = new Set([
    "open",
    "published",
    "awaiting_deposit",
  ]);
  const organizerTotalParticipants = organizerTournaments.reduce(
    (sum, t) => sum + t.currentCount,
    0,
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
  const organizerActiveHiddenCount = Math.max(
    0,
    organizerActiveList.length - 8,
  );

  const handleDeposit = async () => {
    const amount = Number(walletAmountInput);
    if (!Number.isFinite(amount) || amount < 5) {
      setWalletError("Minimum deposit is GHS 5.00.");
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
        "Deposit initiated. Check your payment app or transaction history.",
      );
      const refreshedWallet = await organizerService
        .getWalletBalance()
        .catch(() => null);
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
      <OrganizerDashboard
        profile={profile}
        initials={initials}
        greeting={greeting}
        displayName={displayName}
        organizerTournaments={organizerTournaments}
        organizerLiveCount={organizerLiveCount}
        organizerTotalParticipants={organizerTotalParticipants}
        organizerWalletBalance={organizerWalletBalance}
        organizerActiveList={organizerActiveList}
        organizerActivePreview={organizerActivePreview}
        organizerActiveHiddenCount={organizerActiveHiddenCount}
        organizerDrafts={organizerDrafts}
        organizerCompletedCount={organizerCompletedCount}
        statsOpen={statsOpen}
        setStatsOpen={setStatsOpen}
        organizerCalendarEvents={organizerCalendarEvents}
      />
    );
  }

  // ─── Player Dashboard ─────────────────────────────────────────────────────

  return (
    <PlayerDashboard
      profile={profile}
      initials={initials}
      greeting={greeting}
      displayName={displayName}
      stats={stats}
      registrations={registrations}
      activeRegistrations={activeRegistrations}
      completedRegistrations={completedRegistrations}
      statsOpen={statsOpen}
      setStatsOpen={setStatsOpen}
      tournamentTab={tournamentTab}
      setTournamentTab={setTournamentTab}
      playerWallet={playerWallet}
      walletAmountInput={walletAmountInput}
      setWalletAmountInput={setWalletAmountInput}
      handleDeposit={handleDeposit}
      isDepositing={isDepositing}
      walletError={walletError}
      walletInfo={walletInfo}
      playerCalendarEvents={playerCalendarEvents}
    />
  );
};

export default Dashboard;
