import { Link } from "react-router-dom";
import type { TournamentRegistration } from "../../services/dashboard.service";
import TournamentImage from "./TournamentImage";

type JoinedTournamentDetailsCardProps = {
  reg: TournamentRegistration;
};

function fmt(value?: string) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const regStatusStyles: Record<string, string> = {
  registered:      "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  checked_in:      "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  pending_payment: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  disqualified:    "bg-red-500/15 text-red-300 border-red-500/25",
  withdrawn:       "bg-slate-500/15 text-slate-400 border-slate-600/25",
  cancelled:       "bg-slate-500/15 text-slate-400 border-slate-600/25",
};

const tourStatusStyles: Record<string, string> = {
  draft:             "bg-slate-600/15 text-slate-400 border-slate-600/25",
  awaiting_deposit:  "bg-amber-500/15 text-amber-300 border-amber-500/25",
  published:         "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  open:              "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  locked:            "bg-violet-500/15 text-violet-300 border-violet-500/25",
  ongoing:           "bg-blue-500/15 text-blue-300 border-blue-500/25",
  awaiting_results:  "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
  verifying_results: "bg-purple-500/15 text-purple-300 border-purple-500/25",
  completed:         "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
  cancelled:         "bg-slate-500/15 text-slate-400 border-slate-600/25",
};

export default function JoinedTournamentDetailsCard({
  reg,
}: JoinedTournamentDetailsCardProps) {
  const regLabel = reg.status.replace(/_/g, " ");
  const tourLabel = reg.tournamentStatus
    ? reg.tournamentStatus.replace(/_/g, " ")
    : null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden group hover:border-slate-700 transition-all">
      {/* Banner image */}
      <div className="relative h-40 bg-gradient-to-br from-cyan-950/80 via-slate-800 to-indigo-950/80 overflow-hidden">
        <TournamentImage
          reg={reg}
          className="absolute inset-0 w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-500"
        />
        {/* Bottom fade so status pills and text stay readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

        {/* Status pills on image */}
        <div className="absolute bottom-2.5 left-3 flex flex-wrap gap-1.5">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-medium border backdrop-blur-sm ${
              regStatusStyles[reg.status] ??
              "bg-slate-700/80 text-slate-300 border-slate-600"
            }`}
          >
            {regLabel}
          </span>
          {tourLabel && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-medium border backdrop-blur-sm ${
                tourStatusStyles[reg.tournamentStatus] ??
                "bg-slate-700/80 text-slate-300 border-slate-600"
              }`}
            >
              {tourLabel}
            </span>
          )}
        </div>

        {/* View Details */}
        <Link
          to={`/auth/tournaments/${reg.tournamentId}`}
          className="absolute top-2.5 right-2.5 text-[11px] px-2.5 py-1 rounded-lg bg-slate-900/70 backdrop-blur-sm border border-slate-700/60 text-cyan-300 hover:bg-slate-800/80 hover:border-cyan-500/40 transition-all font-medium"
        >
          View Details
        </Link>
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-white truncate mb-0.5">
          {reg.tournamentTitle}
        </h4>
        <p className="text-[11px] text-slate-500 mb-3">
          {reg.gameName ?? "Game not set"}&nbsp;·&nbsp;Joined {fmt(reg.createdAt)}
        </p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
          <div>
            <p className="text-slate-500 mb-0.5">Start Date</p>
            <p className="text-slate-200 font-medium">{fmt(reg.tournamentSchedule.startDate)}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-0.5">Check-In</p>
            <p className="text-slate-200 font-medium">{fmt(reg.tournamentSchedule.checkInStart)}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-0.5">Entry Type</p>
            <p className="text-slate-200 font-medium capitalize">{reg.registrationType}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-0.5">In-Game ID</p>
            <p className="text-cyan-300 font-medium truncate" title={reg.inGameId ?? "Not set"}>
              {reg.inGameId ?? "—"}
            </p>
          </div>
          {reg.teamName && (
            <div className="col-span-2">
              <p className="text-slate-500 mb-0.5">Team</p>
              <p className="text-slate-200 font-medium truncate">{reg.teamName}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
