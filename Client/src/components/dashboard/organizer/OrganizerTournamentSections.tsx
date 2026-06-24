import { Link } from "react-router-dom";
import { Trophy, PlusCircle, ArrowRight } from "lucide-react";
import type { Tournament as OrganizerTournament } from "../../../services/organizer.service";
import OrganizerTournamentCard from "../OrganizerTournamentCard";

interface OrganizerTournamentSectionsProps {
  organizerActiveList: OrganizerTournament[];
  organizerActivePreview: OrganizerTournament[];
  organizerActiveHiddenCount: number;
  organizerDrafts: OrganizerTournament[];
}

export default function OrganizerTournamentSections({
  organizerActiveList,
  organizerActivePreview,
  organizerActiveHiddenCount,
  organizerDrafts,
}: OrganizerTournamentSectionsProps) {
  return (
    <div className="space-y-8 min-w-0">
      {/* Active Tournaments */}
      <section>
        <div className="flex flex-col items-center text-center gap-2 mb-5 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-bold text-white">
              Active Tournaments
            </h2>
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
              +{organizerActiveHiddenCount} more{" "}
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {organizerActiveList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizerActivePreview.map((t) => (
              <OrganizerTournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 py-14 px-6 text-center">
            <Trophy className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="font-display text-lg font-semibold text-slate-400">
              No active tournaments
            </p>
            <p className="text-sm text-slate-600 mt-1 mb-6">
              Create or publish one to start receiving registrations.
            </p>
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
            <h2 className="font-display text-2xl font-bold text-white">
              Drafts & Pending
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
              {organizerDrafts.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizerDrafts.slice(0, 6).map((t) => (
              <OrganizerTournamentCard
                key={`draft-${t.id}`}
                tournament={t}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
