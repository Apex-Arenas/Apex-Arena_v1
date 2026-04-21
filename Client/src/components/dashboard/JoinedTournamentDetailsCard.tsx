import { Link } from "react-router-dom";
import { Gamepad2, Trophy } from "lucide-react";
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

const REG_STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  registered:      { label: "Registered",       dot: "bg-cyan-400",    text: "text-cyan-300"    },
  checked_in:      { label: "Checked In",        dot: "bg-emerald-400", text: "text-emerald-300" },
  pending_payment: { label: "Payment Pending",   dot: "bg-amber-400 animate-pulse", text: "text-amber-300" },
  disqualified:    { label: "Disqualified",      dot: "bg-red-400",     text: "text-red-300"     },
  withdrawn:       { label: "Withdrawn",         dot: "bg-slate-500",   text: "text-slate-400"   },
  cancelled:       { label: "Cancelled",         dot: "bg-slate-500",   text: "text-slate-400"   },
};

const TOUR_STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  draft:             { label: "Draft",            dot: "bg-slate-500",   text: "text-slate-300"  },
  awaiting_deposit:  { label: "Awaiting Deposit", dot: "bg-amber-400",   text: "text-amber-300"  },
  published:         { label: "Published",        dot: "bg-cyan-400",    text: "text-cyan-300"   },
  open:              { label: "Open",             dot: "bg-emerald-400", text: "text-emerald-300"},
  locked:            { label: "Locked",           dot: "bg-violet-400",  text: "text-violet-300" },
  in_progress:       { label: "Live",             dot: "bg-orange-400",  text: "text-orange-300" },
  ongoing:           { label: "Live",             dot: "bg-orange-400",  text: "text-orange-300" },
  awaiting_results:  { label: "Awaiting Results", dot: "bg-yellow-400",  text: "text-yellow-300" },
  verifying_results: { label: "Verifying",        dot: "bg-purple-400",  text: "text-purple-300" },
  completed:         { label: "Completed",        dot: "bg-slate-400",   text: "text-slate-400"  },
  cancelled:         { label: "Cancelled",        dot: "bg-red-400",     text: "text-red-400"    },
};

export default function JoinedTournamentDetailsCard({ reg }: Props) {
  const regMeta = REG_STATUS_META[reg.status] ?? {
    label: reg.status.replace(/_/g, " "),
    dot: "bg-slate-500",
    text: "text-slate-300",
  };
  const tourMeta = TOUR_STATUS_META[reg.tournamentStatus] ?? null;

  const imageUrl = reg.tournamentThumbnailUrl ?? reg.tournamentBannerUrl ?? reg.gameLogoUrl ?? null;
  const hasImage = !!imageUrl;

  const prizeGhs =
    reg.prizeWon && reg.prizeWon > 0
      ? `GHS ${(reg.prizeWon / 100).toLocaleString("en-GH", { minimumFractionDigits: 0 })}`
      : null;

  const startDate = fmt(reg.tournamentSchedule.startDate);
  const checkIn = fmt(reg.tournamentSchedule.checkInStart);

  return (
    <Link
      to={`/auth/tournaments/${reg.tournamentId}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-black/40 transition-all"
    >
      {/* ── Cover image ─────────────────────────────────────── */}
      <div className="relative aspect-4/3 overflow-hidden shrink-0">
        {/* Neutral dark base so images render true-to-colour */}
        <div className="absolute inset-0 bg-slate-900" />

        {hasImage ? (
          <>
            <FadeImage
              src={imageUrl}
              alt={reg.tournamentTitle}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {/* Branded colour overlay */}
            <div className="absolute inset-0 bg-linear-to-br from-orange-500/25 via-transparent to-violet-600/25" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-linear-to-br from-orange-950 via-slate-900 to-violet-950" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Gamepad2 className="w-14 h-14 text-slate-700" />
            </div>
          </>
        )}

        {/* Bottom fade — only covers the bottom third for chip readability */}
        <div className="absolute inset-0 bg-linear-to-t from-slate-900/95 via-slate-900/20 to-transparent" />

        {/* Top-right: tournament status chip */}
        {tourMeta && (
          <div className="absolute top-2.5 right-2.5">
            <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-sm border border-white/10 ${tourMeta.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tourMeta.dot}`} />
              {tourMeta.label}
            </span>
          </div>
        )}


        {/* Bottom-right: prize won or placement */}
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
        ) : null}
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
        {/* Title + reg status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-display text-sm font-bold text-white leading-tight truncate group-hover:text-orange-300 transition-colors">
              {reg.tournamentTitle}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {reg.gameName ?? "Unknown Game"} · {reg.registrationType === "team" ? "Team" : "Solo"}
            </p>
          </div>
          <span className={`shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-800 border border-white/5 ${regMeta.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${regMeta.dot}`} />
            {regMeta.label}
          </span>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Starts</p>
            <p className="text-[11px] font-medium text-slate-300">{startDate}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Check-In</p>
            <p className="text-[11px] font-medium text-slate-300">{checkIn}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">In-Game ID</p>
            <p className="text-[11px] font-medium text-orange-300 truncate" title={reg.inGameId || "Not set"}>
              {reg.inGameId || "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Type</p>
            <p className="text-[11px] font-medium text-slate-300 capitalize">{reg.registrationType}</p>
          </div>
        </div>

        {/* Team name */}
        {reg.teamName && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
            <Trophy className="w-3 h-3 text-orange-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-300 truncate">{reg.teamName}</span>
          </div>
        )}

        {/* Prize won */}
        {prizeGhs && !reg.teamName && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
            <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-400">{prizeGhs} prize won</span>
          </div>
        )}
      </div>
    </Link>
  );
}
