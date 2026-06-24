import type { Dispatch, SetStateAction } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { Tournament } from "../../services/tournament.service";
import { formatDate } from "./tournament-manage.utils";

interface TournamentInfoSidebarCardProps {
  tournament: Tournament;
  tournamentInfoOpen: boolean;
  setTournamentInfoOpen: Dispatch<SetStateAction<boolean>>;
}

export default function TournamentInfoSidebarCard({
  tournament,
  tournamentInfoOpen,
  setTournamentInfoOpen,
}: TournamentInfoSidebarCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setTournamentInfoOpen((v) => !v)}
        className="lg:pointer-events-none w-full flex items-center gap-2.5 px-5 py-4 border-b border-slate-800/60 bg-slate-950/20"
      >
        <div className="w-8 h-8 rounded-xl bg-slate-700/60 border border-slate-600/50 flex items-center justify-center shrink-0">
          <CalendarDays className="w-4 h-4 text-slate-300" />
        </div>
        <h2 className="font-display text-sm font-bold text-white flex-1 text-left">
          Tournament Info
        </h2>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 lg:hidden ${tournamentInfoOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`p-4 space-y-2.5 ${tournamentInfoOpen ? "block" : "hidden"} lg:block`}
      >
        {[
          { label: "Game", value: tournament.game?.name ?? "—" },
          {
            label: "Type",
            value: (tournament.tournamentType ?? "—").replace(/_/g, " "),
          },
          { label: "Format", value: tournament.format ?? "—" },
          {
            label: "Entry",
            value: tournament.isFree
              ? "Free"
              : `GHS ${(tournament.entryFee / 100).toFixed(2)}`,
          },
          {
            label: "Prize Pool",
            value: tournament.prizePool
              ? `GHS ${(tournament.prizePool / 100).toFixed(2)}`
              : "—",
          },
          {
            label: "Reg. Closes",
            value: formatDate(tournament.schedule.registrationEnd),
          },
          {
            label: "Starts",
            value: formatDate(tournament.schedule.tournamentStart),
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex items-start justify-between gap-3 py-1 border-b border-slate-800/40 last:border-0"
          >
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide shrink-0">
              {label}
            </span>
            <span className="text-[12px] font-medium text-slate-300 text-right capitalize">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
