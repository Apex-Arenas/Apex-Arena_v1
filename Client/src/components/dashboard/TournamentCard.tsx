import { Link } from "react-router-dom";
import { CalendarDays, Gamepad2, Star } from "lucide-react";
import type { TournamentRegistration } from "../../services/dashboard.service";
import TournamentImage from "./TournamentImage";

type TournamentCardProps = {
  reg: TournamentRegistration;
};

const statusStyles: Record<string, string> = {
  registered: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  checked_in: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  pending_payment: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  disqualified: "bg-red-500/15 text-red-300 border-red-500/25",
  withdrawn: "bg-slate-500/15 text-slate-400 border-slate-600/25",
  cancelled: "bg-slate-500/15 text-slate-400 border-slate-600/25",
  completed: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
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
  const prizeText =
    reg.prizeWon && reg.prizeWon > 0
      ? `Won GHS ${(reg.prizeWon / 100).toLocaleString("en-GH", { minimumFractionDigits: 0 })}`
      : null;

  return (
    <Link
      to={`/auth/tournaments/${reg.tournamentId}`}
      className="group relative flex items-center gap-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/55 p-3.5 hover:border-slate-700/90 hover:-translate-y-0.5 hover:shadow-[0_20px_38px_-30px_rgba(14,165,233,0.65)] transition-[border-color,background-color,transform,box-shadow] duration-300"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl bg-linear-to-br from-cyan-500/8 via-transparent to-orange-500/10" />

      <TournamentImage
        reg={reg}
        className="w-11 h-11 rounded-lg border border-slate-700 shrink-0 object-cover"
      />

      <div className="relative flex-1 min-w-0">
        <p className="font-display text-[15px] font-bold text-white truncate group-hover:text-cyan-100 transition-colors">
          {reg.tournamentTitle}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3 text-slate-500" />
            {dateStr}
          </span>
          {reg.gameName && (
            <span className="flex items-center gap-1">
              <Gamepad2 className="w-3 h-3 text-slate-500" />
              <span className="truncate max-w-20">{reg.gameName}</span>
            </span>
          )}
        </div>
        {reg.finalPlacement != null && (
          <p className="text-xs text-amber-300 mt-1 flex items-center gap-1.5 font-semibold">
            <Star className="w-3 h-3" />#{reg.finalPlacement}
            {prizeText ? ` · ${prizeText}` : ""}
          </p>
        )}
      </div>

      <span
        className={`relative text-[10px] px-2.5 py-1 rounded-full uppercase tracking-[0.12em] whitespace-nowrap border shrink-0 font-semibold ${
          statusStyles[reg.status] ??
          "bg-slate-700 text-slate-300 border-slate-600"
        }`}
      >
        {statusLabel}
      </span>
    </Link>
  );
}
