import { Link } from "react-router-dom";
import { Gamepad2, Trophy } from "lucide-react";
import type { Tournament as OrganizerTournament } from "../../services/organizer.service";

type Props = { tournament: OrganizerTournament };

const STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  draft:            { label: "Draft",            dot: "bg-slate-500",   text: "text-slate-300"  },
  awaiting_deposit: { label: "Awaiting Deposit", dot: "bg-amber-400",   text: "text-amber-300"  },
  published:        { label: "Published",        dot: "bg-cyan-400",    text: "text-cyan-300"   },
  open:             { label: "Open",             dot: "bg-emerald-400", text: "text-emerald-300"},
  in_progress:      { label: "Live",             dot: "bg-orange-400",  text: "text-orange-300" },
  completed:        { label: "Completed",        dot: "bg-slate-400",   text: "text-slate-400"  },
  cancelled:        { label: "Cancelled",        dot: "bg-red-400",     text: "text-red-400"    },
};

export default function OrganizerTournamentCard({ tournament }: Props) {
  const meta = STATUS_META[tournament.status] ?? {
    label: tournament.status.replace(/_/g, " "),
    dot: "bg-slate-500",
    text: "text-slate-300",
  };

  const coverImage = tournament.thumbnailUrl ?? tournament.bannerUrl ?? null;

  const startDate = tournament.schedule.tournamentStart
    ? new Date(tournament.schedule.tournamentStart).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "TBD";

  const regEnd = tournament.schedule.registrationEnd
    ? new Date(tournament.schedule.registrationEnd).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : null;

  const prizeGhs =
    tournament.prizePool && tournament.prizePool > 0
      ? `GHS ${(tournament.prizePool / 100).toLocaleString("en-GH", { minimumFractionDigits: 0 })}`
      : null;

  const entryFee =
    tournament.isFree || tournament.entryFee === 0
      ? "Free"
      : `GHS ${(tournament.entryFee / 100).toLocaleString("en-GH", { minimumFractionDigits: 0 })}`;

  return (
    <Link
      to={`/auth/organizer/tournaments/${tournament.id}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-black/40 transition-all"
    >
      {/* ── Cover image ─────────────────────────────────────── */}
      <div className="relative aspect-4/3 overflow-hidden bg-slate-800 shrink-0">
        {coverImage ? (
          <img
            src={coverImage}
            alt={tournament.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-slate-800 to-slate-900">
            {tournament.game?.logoUrl ? (
              <img src={tournament.game.logoUrl} alt="" className="w-20 h-20 object-contain opacity-25" />
            ) : (
              <Gamepad2 className="w-14 h-14 text-slate-700" />
            )}
          </div>
        )}

        {/* Bottom fade */}
        <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/20 to-transparent" />

        {/* Status chip — top right */}
        <div className="absolute top-2.5 right-2.5">
          <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-sm border border-white/10 ${meta.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${tournament.status === "open" || tournament.status === "in_progress" ? "animate-pulse" : ""}`} />
            {meta.label}
          </span>
        </div>

        {/* Game logo — bottom left */}
        {tournament.game?.logoUrl && (
          <div className="absolute bottom-2.5 left-2.5">
            <img
              src={tournament.game.logoUrl}
              alt={tournament.game.name}
              className="w-7 h-7 rounded-md object-cover border border-white/15 shadow-md"
            />
          </div>
        )}

        {/* Prize pool — bottom right */}
        {prizeGhs && (
          <div className="absolute bottom-2.5 right-2.5">
            <span className="text-[11px] font-bold text-amber-300 bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-amber-400/20">
              {prizeGhs}
            </span>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
        {/* Title + game */}
        <div>
          <h4 className="font-display text-sm font-bold text-white leading-tight truncate group-hover:text-orange-300 transition-colors">
            {tournament.title}
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            {tournament.game?.name ?? "Unknown Game"} · {tournament.format ?? "Solo"}
            {tournament.region ? ` · ${tournament.region}` : ""}
          </p>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Starts</p>
            <p className="text-[11px] font-medium text-slate-300">{startDate}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Players</p>
            <p className="text-[11px] font-medium text-slate-300">{tournament.currentCount} / {tournament.maxParticipants}</p>
          </div>
          {regEnd && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Reg. closes</p>
              <p className="text-[11px] font-medium text-slate-300">{regEnd}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Entry</p>
            <p className={`text-[11px] font-medium ${entryFee === "Free" ? "text-emerald-400" : "text-slate-300"}`}>{entryFee}</p>
          </div>
        </div>

        {/* Prize pool — full width */}
        {prizeGhs && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
            <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-400">{prizeGhs} prize pool</span>
          </div>
        )}
      </div>
    </Link>
  );
}
