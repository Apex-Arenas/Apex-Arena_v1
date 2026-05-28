import { Link } from "react-router-dom";
import { CalendarDays, Gamepad2, Trophy, Users } from "lucide-react";
import type { TournamentRegistration } from "../../services/dashboard.service";
import { FadeImage } from "../ui/FadeImage";

type Props = { reg: TournamentRegistration };

function fmt(value?: string) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const REG_STATUS_META: Record<string, { label: string; cls: string }> = {
  registered:      { label: "Registered",      cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25"          },
  checked_in:      { label: "Checked In",      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" },
  pending_payment: { label: "Pmt. Pending",    cls: "bg-amber-500/15 text-amber-300 border-amber-500/25"       },
  disqualified:    { label: "Disqualified",    cls: "bg-red-500/15 text-red-300 border-red-500/25"             },
  withdrawn:       { label: "Withdrawn",       cls: "bg-slate-700/50 text-slate-400 border-slate-600/25"       },
  cancelled:       { label: "Cancelled",       cls: "bg-slate-700/50 text-slate-400 border-slate-600/25"       },
};

const TOUR_STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  draft:             { label: "Draft",            dot: "bg-slate-500",                text: "text-slate-300"   },
  awaiting_deposit:  { label: "Awaiting Deposit", dot: "bg-amber-400",                text: "text-amber-300"   },
  published:         { label: "Published",        dot: "bg-cyan-400",                 text: "text-cyan-300"    },
  open:              { label: "Open",             dot: "bg-emerald-400",              text: "text-emerald-300" },
  locked:            { label: "Locked",           dot: "bg-violet-400",               text: "text-violet-300"  },
  in_progress:       { label: "Live",             dot: "bg-orange-400 animate-pulse", text: "text-orange-300"  },
  started:           { label: "Live",             dot: "bg-orange-400 animate-pulse", text: "text-orange-300"  },
  ongoing:           { label: "Live",             dot: "bg-orange-400 animate-pulse", text: "text-orange-300"  },
  awaiting_results:  { label: "Awaiting Results", dot: "bg-yellow-400",               text: "text-yellow-300"  },
  verifying_results: { label: "Verifying",        dot: "bg-purple-400",               text: "text-purple-300"  },
  completed:         { label: "Completed",        dot: "bg-slate-400",                text: "text-slate-400"   },
  cancelled:         { label: "Cancelled",        dot: "bg-red-400",                  text: "text-red-400"     },
};

export default function JoinedTournamentDetailsCard({ reg }: Props) {
  const regMeta = REG_STATUS_META[reg.status] ?? {
    label: reg.status.replace(/_/g, " "),
    cls: "bg-slate-700/50 text-slate-400 border-slate-600/25",
  };
  const tourMeta = TOUR_STATUS_META[reg.tournamentStatus] ?? {
    label: reg.tournamentStatus.replace(/_/g, " "),
    dot: "bg-slate-500",
    text: "text-slate-300",
  };

  const imageUrl =
    reg.tournamentThumbnailUrl ??
    reg.tournamentBannerUrl ??
    null;

  const prizeGhs =
    reg.prizeWon && reg.prizeWon > 0
      ? `GHS ${(reg.prizeWon / 100).toLocaleString("en-GH", { minimumFractionDigits: 0 })}`
      : null;

  const isLive =
    reg.tournamentStatus === "in_progress" ||
    reg.tournamentStatus === "started" ||
    reg.tournamentStatus === "ongoing";

  return (
    <Link
      to={`/auth/tournaments/${reg.tournamentId}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-black/40 transition-all"
    >
      {/* ── Cover image ─────────────────────────────────────── */}
      <div className="relative aspect-4/3 overflow-hidden bg-slate-800 shrink-0">
        {imageUrl ? (
          <>
            <FadeImage
              src={imageUrl}
              alt={reg.tournamentTitle}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-linear-to-br from-orange-600/40 via-transparent to-violet-700/40" />
          </>
        ) : reg.gameLogoUrl ? (
          <>
            <FadeImage
              src={reg.gameLogoUrl}
              alt={reg.tournamentTitle}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-linear-to-br from-orange-600/40 via-transparent to-violet-700/40" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-linear-to-br from-orange-950 via-slate-900 to-violet-950" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[32px_32px]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Gamepad2 className="w-14 h-14 text-slate-700" />
            </div>
          </>
        )}

        {/* Bottom fade */}
        <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/20 to-transparent" />

        {/* Tournament status — top right */}
        <div className="absolute top-2.5 right-2.5">
          <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-sm border border-white/10 ${tourMeta.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tourMeta.dot}`} />
            {tourMeta.label}
          </span>
        </div>

        {/* Game logo — bottom left */}
        {reg.gameLogoUrl && imageUrl && (
          <div className="absolute bottom-2.5 left-2.5">
            <img
              src={reg.gameLogoUrl}
              alt={reg.gameName ?? ""}
              className="w-7 h-7 rounded-md object-cover border border-white/15 shadow-md"
            />
          </div>
        )}

        {/* Prize won or placement — bottom right */}
        {prizeGhs ? (
          <div className="absolute bottom-2.5 right-2.5">
            <span className="text-[11px] font-bold text-amber-300 bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-amber-400/20">
              {prizeGhs}
            </span>
          </div>
        ) : reg.finalPlacement ? (
          <div className="absolute bottom-2.5 right-2.5">
            <span className="text-[11px] font-bold text-orange-300 bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-orange-400/20">
              #{reg.finalPlacement}
            </span>
          </div>
        ) : (
          /* Registration status — bottom left if no game logo offset, else offset */
          <div className={`absolute bottom-2.5 ${reg.gameLogoUrl && imageUrl ? "left-11" : "left-3"}`}>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border backdrop-blur-sm ${regMeta.cls}`}>
              {regMeta.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-3 flex-1">
        {/* Title + subtitle */}
        <div>
          <h4 className="font-display text-sm font-bold text-white leading-tight truncate group-hover:text-orange-300 transition-colors">
            {reg.tournamentTitle}
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            {reg.gameName ?? "Unknown Game"} · {reg.registrationType === "team" ? "Team" : "Solo"}
          </p>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5 flex items-center gap-1">
              <CalendarDays className="w-2.5 h-2.5" /> Starts
            </p>
            <p className="text-[11px] font-medium text-slate-300">{fmt(reg.tournamentSchedule.startDate)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5 flex items-center gap-1">
              <CalendarDays className="w-2.5 h-2.5" /> Check-In
            </p>
            <p className="text-[11px] font-medium text-slate-300">{fmt(reg.tournamentSchedule.checkInStart)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5 flex items-center gap-1">
              <Gamepad2 className="w-2.5 h-2.5" /> In-Game ID
            </p>
            <p className="text-[11px] font-medium text-orange-300 truncate">{reg.inGameId || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5 flex items-center gap-1">
              <Users className="w-2.5 h-2.5" /> Type
            </p>
            <p className="text-[11px] font-medium text-slate-300 capitalize">{reg.registrationType}</p>
          </div>
        </div>

        {/* Team name or prize won */}
        {reg.teamName && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
            <Trophy className="w-3 h-3 text-orange-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-300 truncate">{reg.teamName}</span>
          </div>
        )}
        {prizeGhs && !reg.teamName && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
            <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-400">{prizeGhs} prize won</span>
          </div>
        )}

        {/* CTA pinned to bottom */}
        <div
          className={`mt-auto w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${
            isLive
              ? "bg-linear-to-r from-orange-500 to-amber-400 text-slate-950"
              : "border border-slate-700 bg-slate-800/60 text-slate-300"
          }`}
        >
          {isLive ? "View Live" : "View Details"}
        </div>
      </div>
    </Link>
  );
}
