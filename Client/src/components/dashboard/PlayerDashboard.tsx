import type { Dispatch, SetStateAction } from "react";
import type { DashboardData } from "../../services/dashboard.service";
import type { WalletBalance } from "../../services/organizer.service";
import CalendarWidget, { type CalendarEvent } from "./CalendarWidget";
import PlayerHero from "./player/PlayerHero";
import MyTournamentsList from "./player/MyTournamentsList";
import WalletCard from "./player/WalletCard";
import PlayerQuickActions from "./player/PlayerQuickActions";

type Registration = DashboardData["registrations"][number];

interface PlayerDashboardProps {
  profile: DashboardData["profile"] | undefined;
  initials: string;
  greeting: string;
  displayName: string;
  stats: DashboardData["stats"];
  registrations: Registration[];
  activeRegistrations: Registration[];
  completedRegistrations: Registration[];
  statsOpen: boolean;
  setStatsOpen: Dispatch<SetStateAction<boolean>>;
  tournamentTab: "active" | "history";
  setTournamentTab: Dispatch<SetStateAction<"active" | "history">>;
  playerWallet: WalletBalance | null;
  walletAmountInput: string;
  setWalletAmountInput: Dispatch<SetStateAction<string>>;
  handleDeposit: () => Promise<void>;
  isDepositing: boolean;
  walletError: string | null;
  walletInfo: string | null;
  playerCalendarEvents: CalendarEvent[];
}

export default function PlayerDashboard({
  profile,
  initials,
  greeting,
  displayName,
  stats,
  registrations,
  activeRegistrations,
  completedRegistrations,
  statsOpen,
  setStatsOpen,
  tournamentTab,
  setTournamentTab,
  playerWallet,
  walletAmountInput,
  setWalletAmountInput,
  handleDeposit,
  isDepositing,
  walletError,
  walletInfo,
  playerCalendarEvents,
}: PlayerDashboardProps) {
  return (
    <div className="min-h-screen">
      <PlayerHero
        profile={profile}
        initials={initials}
        greeting={greeting}
        displayName={displayName}
        activeCount={activeRegistrations.length}
        stats={stats}
        statsOpen={statsOpen}
        setStatsOpen={setStatsOpen}
      />

      <div className="max-w-7xl mx-auto px-8 sm:px-14 lg:px-20 py-4 sm:py-6 space-y-6">
        {/* ── Main Grid ─────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-[1fr_272px] gap-6">
          {/* LEFT: My Tournaments */}
          <MyTournamentsList
            registrations={registrations}
            activeRegistrations={activeRegistrations}
            completedRegistrations={completedRegistrations}
            tournamentTab={tournamentTab}
            setTournamentTab={setTournamentTab}
          />

          {/* RIGHT Sidebar */}
          <div className="space-y-4">
            <CalendarWidget events={playerCalendarEvents} />
            <WalletCard
              playerWallet={playerWallet}
              walletAmountInput={walletAmountInput}
              setWalletAmountInput={setWalletAmountInput}
              handleDeposit={handleDeposit}
              isDepositing={isDepositing}
              walletError={walletError}
              walletInfo={walletInfo}
            />
            <PlayerQuickActions />
          </div>
        </div>
      </div>
    </div>
  );
}
