import { Link } from "react-router-dom";
import { CalendarDays, Gamepad2, Star } from "lucide-react";
import type { TournamentRegistration } from "../../services/dashboard.service";
import TournamentImage from "./TournamentImage";

type TournamentCardProps = {
  reg: TournamentRegistration;
};

const statusStyles: Record<string, string> = {
  registered:      "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  checked_in:      "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  pending_payment: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  disqualified:    "bg-red-500/15 text-red-300 border-red-500/25",
  withdrawn:       "bg-slate-500/15 text-slate-400 border-slate-600/25",
  cancelled:       "bg-slate-500/15 text-slate-400 border-slate-600/25",
  completed:       "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
};

export default function TournamentCard({ reg }: TournamentCardProps) {
  const statusLabel = reg.status.replace(/_/g, " ");
  const dateStr = reg.tournamentSchedule.startDate
    ? new Date(reg.tournamentSchedule.startDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "TBD";

  return (
    <Link
      to={`/auth/tournaments/${reg.tournamentId}`}
      className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 hover:border-slate-700 hover:bg-slate-900/80 transition-all group"
    >
      <TournamentImage reg={reg} className="w-11 h-11 rounded-lg border border-slate-700 shrink-0 object-cover" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate group-hover:text-cyan-100 transition-colors">
          {reg.tournamentTitle}
        </p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {dateStr}
          </span>
          {reg.gameName && (
            <span className="flex items-center gap-1">
              <Gamepad2 className="w-3 h-3" />
              <span className="truncate max-w-[80px]">{reg.gameName}</span>
            </span>
          )}
        </div>
        {reg.finalPlacement != null && (
          <p className="text-xs text-amber-300 mt-0.5 flex items-center gap-1">
            <Star className="w-3 h-3" />
            #{reg.finalPlacement}
            {reg.prizeWon ? ` · Won $${reg.prizeWon.toLocaleString()}` : ""}
          </p>
        )}
      </div>

      <span
        className={`text-[11px] px-2 py-0.5 rounded-full capitalize whitespace-nowrap border shrink-0 font-medium ${
          statusStyles[reg.status] ?? "bg-slate-700 text-slate-300 border-slate-600"
        }`}
      >
        {statusLabel}
      </span>
    </Link>
  );
}
