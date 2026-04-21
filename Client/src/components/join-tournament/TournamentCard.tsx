import { Gamepad2, Lock, Trophy } from "lucide-react";
import { type Tournament } from "../../services/tournament.service";
import { FadeImage } from "../ui/FadeImage";
import {
  formatDate,
  formatFee,
  isActiveRegistrationStatus,
  normalizeRegistrationStatus,
} from "./utils";

interface TournamentCardProps {
  tournament: Tournament;
  registrationStatus?: string;
  isLoadingRegistrations: boolean;
  onRegister: (t: Tournament) => void;
  onOpenDetails: (tournamentId: string) => void;
}

const STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  open:             { label: "Open",             dot: "bg-emerald-400",              text: "text-emerald-300" },
  published:        { label: "Published",        dot: "bg-cyan-400",                 text: "text-cyan-300"   },
  started:          { label: "Live",             dot: "bg-orange-400 animate-pulse", text: "text-orange-300" },
  ongoing:          { label: "Live",             dot: "bg-orange-400 animate-pulse", text: "text-orange-300" },
  locked:           { label: "Locked",           dot: "bg-amber-400",                text: "text-amber-300"  },
  awaiting_deposit: { label: "Awaiting Deposit", dot: "bg-amber-400",                text: "text-amber-300"  },
  completed:        { label: "Completed",        dot: "bg-slate-400",                text: "text-slate-400"  },
  cancelled:        { label: "Cancelled",        dot: "bg-red-400",                  text: "text-red-400"    },
  draft:            { label: "Draft",            dot: "bg-slate-500",                text: "text-slate-300"  },
};

const REG_STATUS_META: Record<string, { label: string; cls: string }> = {
  registered:      { label: "Registered",   cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"          },
  checked_in:      { label: "Checked In",   cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  pending_payment: { label: "Pmt. Pending", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30"       },
  disqualified:    { label: "Disqualified", cls: "bg-red-500/20 text-red-300 border-red-500/30"             },
  withdrawn:       { label: "Withdrawn",    cls: "bg-slate-700/60 text-slate-400 border-slate-600/30"       },
};

export function TournamentCard({
  tournament,
  registrationStatus,
  isLoadingRegistrations,
  onRegister,
  onOpenDetails,
}: TournamentCardProps) {
  const meta = STATUS_META[tournament.status] ?? {
    label: tournament.status.replace(/_/g, " "),
    dot: "bg-slate-500",
    text: "text-slate-300",
  };

  const imageUrl = tournament.thumbnailUrl ?? tournament.bannerUrl ?? null;
  const hasImage = !!imageUrl;

  const normalizedStatus = normalizeRegistrationStatus(registrationStatus);
  const isAlreadyRegistered =
    tournament.isRegistered === true || isActiveRegistrationStatus(normalizedStatus);
  const canRegister =
    !isLoadingRegistrations && tournament.status === "open" && !isAlreadyRegistered;
  const isFull = tournament.currentCount >= tournament.maxParticipants;

  const regMeta = normalizedStatus ? (REG_STATUS_META[normalizedStatus] ?? null) : null;

  const prizeGhs =
    tournament.prizePool && tournament.prizePool > 0
      ? `GHS ${(tournament.prizePool / 100).toLocaleString("en-GH", { minimumFractionDigits: 0 })}`
      : null;

  const entryFee = formatFee(tournament.isFree, tournament.entryFee, tournament.currency);
  const startDate = formatDate(tournament.schedule.tournamentStart);

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-black/40 transition-all cursor-pointer"
      onClick={() => onOpenDetails(tournament.id)}
    >
      {/* ── Cover image ─────────────────────────────────────── */}
      <div className="relative aspect-4/3 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-slate-900" />

        {hasImage ? (
          <>
            <FadeImage
              src={imageUrl}
              alt={tournament.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-linear-to-br from-orange-500/25 via-transparent to-violet-600/25" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-linear-to-br from-orange-950 via-slate-900 to-violet-950" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[32px_32px]" />
            <div className="absolute inset-0 flex items-center justify-center">
              {tournament.game?.logoUrl ? (
                <img
                  src={tournament.game.logoUrl}
                  alt=""
                  className="w-20 h-20 object-contain opacity-20"
                />
              ) : (
                <Gamepad2 className="w-14 h-14 text-slate-700" />
              )}
            </div>
          </>
        )}

        {/* Bottom fade */}
        <div className="absolute inset-0 bg-linear-to-t from-slate-900/95 via-slate-900/20 to-transparent" />

        {/* Tournament status chip — top right */}
        <div className="absolute top-2.5 right-2.5">
          <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-sm border border-white/10 ${meta.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
            {meta.label}
          </span>
        </div>

        {/* Registration status chip — bottom left (only when registered) */}
        {isAlreadyRegistered && regMeta && (
          <div className="absolute bottom-2.5 left-3">
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border backdrop-blur-sm ${regMeta.cls}`}>
              {regMeta.label}
            </span>
          </div>
        )}

        {/* Prize pool — bottom right */}
        {prizeGhs && (
          <div className={`absolute bottom-2.5 right-2.5`}>
            <span className="text-[11px] font-bold text-amber-300 bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-amber-400/20">
              {prizeGhs}
            </span>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4 flex flex-col flex-1 gap-3">
        <div>
          <h4 className="font-display text-sm font-bold text-white leading-tight truncate group-hover:text-orange-300 transition-colors">
            {tournament.title}
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            {tournament.game?.name ?? "Unknown Game"} · {tournament.format ?? "Solo"}
            {tournament.region ? ` · ${tournament.region}` : ""}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Starts</p>
            <p className="text-[11px] font-medium text-slate-300">{startDate}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Players</p>
            <p className="text-[11px] font-medium text-slate-300">
              {tournament.currentCount} / {tournament.maxParticipants}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Entry</p>
            <p className={`text-[11px] font-medium ${entryFee === "Free" ? "text-emerald-400" : "text-slate-300"}`}>
              {entryFee}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Format</p>
            <p className="text-[11px] font-medium text-slate-300 capitalize">
              {tournament.format ?? "Solo"}
            </p>
          </div>
        </div>

        {prizeGhs && (
          <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-slate-800">
            <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-400">{prizeGhs} prize pool</span>
          </div>
        )}

        {/* Action — always pinned to bottom */}
        <div className="mt-auto">
          {isLoadingRegistrations ? (
            <button disabled className="w-full py-2.5 rounded-xl text-sm font-bold bg-slate-800/60 text-slate-500 border border-slate-700 opacity-50 flex items-center justify-center">
              Checking...
            </button>
          ) : isAlreadyRegistered ? (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenDetails(tournament.id); }}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 flex items-center justify-center gap-2"
            >
              View Details
            </button>
          ) : canRegister ? (
            <button
              onClick={(e) => { e.stopPropagation(); onRegister(tournament); }}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 hover:shadow-lg hover:shadow-orange-500/25 flex items-center justify-center gap-2"
            >
              Join Tournament
            </button>
          ) : isFull ? (
            <div className="w-full py-2.5 rounded-xl text-sm font-bold bg-slate-800/40 text-slate-500 border border-slate-700/60 flex items-center justify-center gap-2 cursor-default">
              <Lock className="w-3.5 h-3.5" />
              Full
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
