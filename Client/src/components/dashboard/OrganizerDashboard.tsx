import type { Dispatch, SetStateAction } from "react";
import type { DashboardData } from "../../services/dashboard.service";
import type { Tournament as OrganizerTournament } from "../../services/organizer.service";
import CalendarWidget, { type CalendarEvent } from "./CalendarWidget";
import OrganizerHero from "./organizer/OrganizerHero";
import OrganizerTournamentSections from "./organizer/OrganizerTournamentSections";
import OrganizerPortfolio from "./organizer/OrganizerPortfolio";
import OrganizerQuickActions from "./organizer/OrganizerQuickActions";

interface OrganizerDashboardProps {
  profile: DashboardData["profile"] | undefined;
  initials: string;
  greeting: string;
  displayName: string;
  organizerTournaments: OrganizerTournament[];
  organizerLiveCount: number;
  organizerTotalParticipants: number;
  organizerWalletBalance: number | null;
  organizerActiveList: OrganizerTournament[];
  organizerActivePreview: OrganizerTournament[];
  organizerActiveHiddenCount: number;
  organizerDrafts: OrganizerTournament[];
  organizerCompletedCount: number;
  statsOpen: boolean;
  setStatsOpen: Dispatch<SetStateAction<boolean>>;
  organizerCalendarEvents: CalendarEvent[];
}

export default function OrganizerDashboard({
  profile,
  initials,
  greeting,
  displayName,
  organizerTournaments,
  organizerLiveCount,
  organizerTotalParticipants,
  organizerWalletBalance,
  organizerActiveList,
  organizerActivePreview,
  organizerActiveHiddenCount,
  organizerDrafts,
  organizerCompletedCount,
  statsOpen,
  setStatsOpen,
  organizerCalendarEvents,
}: OrganizerDashboardProps) {
  return (
    <div className="min-h-screen">
      <OrganizerHero
        profile={profile}
        initials={initials}
        greeting={greeting}
        displayName={displayName}
        tournamentCount={organizerTournaments.length}
        organizerLiveCount={organizerLiveCount}
        organizerTotalParticipants={organizerTotalParticipants}
        organizerWalletBalance={organizerWalletBalance}
        statsOpen={statsOpen}
        setStatsOpen={setStatsOpen}
      />

      <div className="max-w-7xl mx-auto px-8 sm:px-14 lg:px-20 py-4 sm:py-6 space-y-6">
        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-[1fr_272px] gap-6">
          <OrganizerTournamentSections
            organizerActiveList={organizerActiveList}
            organizerActivePreview={organizerActivePreview}
            organizerActiveHiddenCount={organizerActiveHiddenCount}
            organizerDrafts={organizerDrafts}
          />

          {/* Right Sidebar */}
          <div className="space-y-4">
            <CalendarWidget events={organizerCalendarEvents} />
            <OrganizerPortfolio
              organizerLiveCount={organizerLiveCount}
              organizerDraftsCount={organizerDrafts.length}
              organizerCompletedCount={organizerCompletedCount}
            />
            <OrganizerQuickActions />
          </div>
        </div>
      </div>
    </div>
  );
}
