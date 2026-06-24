import { Trophy, Users, CalendarDays, Award } from "lucide-react";
import type { Tournament } from "../../services/tournament.service";
import { formatDate, formatFee } from "./tournament-detail.utils";

interface TournamentStatsStripProps {
  tournament: Tournament;
  prizeGhs: string | null;
}

export default function TournamentStatsStrip({ tournament, prizeGhs }: TournamentStatsStripProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800/60 rounded-2xl overflow-hidden">
      {[
        {
          Icon: Trophy,
          label: "Prize Pool",
          value: prizeGhs ?? "—",
          accent: prizeGhs ? "text-amber-300" : "text-slate-600",
          iconCls: "text-amber-400",
        },
        {
          Icon: Users,
          label: "Players",
          value: `${tournament.currentCount} / ${tournament.maxParticipants}`,
          accent: "text-white",
          iconCls: "text-orange-400",
        },
        {
          Icon: CalendarDays,
          label: "Starts",
          value: formatDate(tournament.schedule.tournamentStart),
          accent: "text-white",
          iconCls: "text-orange-400",
        },
        {
          Icon: Award,
          label: "Entry",
          value: formatFee(
            tournament.isFree,
            tournament.entryFee,
            tournament.currency,
          ),
          accent: tournament.isFree ? "text-emerald-400" : "text-white",
          iconCls: "text-orange-400",
        },
      ].map(({ Icon, label, value, accent, iconCls }) => (
        <div
          key={label}
          className="bg-slate-900/90 px-4 py-4 flex flex-col items-center text-center gap-2"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0">
            <Icon className={`w-4 h-4 ${iconCls}`} />
          </div>
          <div>
            <p
              className={`font-display text-lg font-bold leading-tight ${accent}`}
            >
              {value}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
