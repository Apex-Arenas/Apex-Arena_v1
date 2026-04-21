import { CalendarDays, ExternalLink, Gamepad2, LogOut } from "lucide-react";
import { type MyTournamentRegistration } from "../../services/tournament.service";
import { FadeImage } from "../ui/FadeImage";
import { formatDate } from "./utils";

interface RegistrationCardProps {
  registration: MyTournamentRegistration;
  canWithdraw: boolean;
  isWithdrawing: boolean;
  onRequestWithdraw: (registration: MyTournamentRegistration) => void;
  onOpenDetails: (tournamentId: string) => void;
}

const TOUR_STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  open:             { label: "Open",             dot: "bg-emerald-400",              text: "text-emerald-300" },
  published:        { label: "Published",        dot: "bg-cyan-400",                 text: "text-cyan-300"   },
  started:          { label: "Live",             dot: "bg-orange-400 animate-pulse", text: "text-orange-300" },
  ongoing:          { label: "Live",             dot: "bg-orange-400 animate-pulse", text: "text-orange-300" },
  locked:           { label: "Locked",           dot: "bg-amber-400",                text: "text-amber-300"  },
  awaiting_deposit: { label: "Awaiting Deposit", dot: "bg-amber-400",                text: "text-amber-300"  },
  completed:        { label: "Completed",        dot: "bg-slate-400",                text: "text-slate-400"  },
  cancelled:        { label: "Cancelled",        dot: "bg-red-400",                  text: "text-red-400"    },
};

const REG_STATUS_META: Record<string, { label: string; cls: string }> = {
  registered:      { label: "Registered",   cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25"          },
  checked_in:      { label: "Checked In",   cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" },
  pending_payment: { label: "Pmt. Pending", cls: "bg-amber-500/15 text-amber-300 border-amber-500/25"       },
  disqualified:    { label: "Disqualified", cls: "bg-red-500/15 text-red-300 border-red-500/25"             },
  withdrawn:       { label: "Withdrawn",    cls: "bg-slate-700/50 text-slate-400 border-slate-600/25"       },
};

export function RegistrationCard({
  registration,
  canWithdraw,
  isWithdrawing,
  onRequestWithdraw,
  onOpenDetails,
}: RegistrationCardProps) {
  const tourMeta = TOUR_STATUS_META[registration.tournamentStatus] ?? {
    label: registration.tournamentStatus.replace(/_/g, " "),
    dot: "bg-slate-500",
    text: "text-slate-300",
  };

  const regMeta = REG_STATUS_META[registration.status] ?? {
    label: registration.status.replace(/_/g, " "),
    cls: "bg-slate-700/50 text-slate-400 border-slate-600/25",
  };

  const imageUrl =
    registration.tournamentThumbnailUrl ??
    registration.tournamentBannerUrl ??
    null;

  const hasImage = !!imageUrl;

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-black/40 transition-all cursor-pointer"
      onClick={() => onOpenDetails(registration.tournamentId)}
    >
      {/* ── Cover image / styled header ─────────────────────── */}
      <div className="relative aspect-4/3 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-slate-900" />

        {hasImage ? (
          <>
            <FadeImage
              src={imageUrl}
              alt={registration.tournamentTitle}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-linear-to-br from-orange-500/25 via-transparent to-violet-600/25" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-linear-to-br from-orange-950 via-slate-900 to-violet-950" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[32px_32px]" />
            <div className="absolute inset-0 flex items-center justify-center">
              {registration.tournamentGameLogoUrl ? (
                <img
                  src={registration.tournamentGameLogoUrl}
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
          <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-sm border border-white/10 ${tourMeta.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tourMeta.dot}`} />
            {tourMeta.label}
          </span>
        </div>

        {/* Registration status chip — bottom left */}
        <div className="absolute bottom-2.5 left-3">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border backdrop-blur-sm ${regMeta.cls}`}>
            {regMeta.label}
          </span>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4 flex flex-col flex-1 gap-3">
        <div>
          <h4 className="font-display text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-orange-300 transition-colors">
            {registration.tournamentTitle}
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            {registration.tournamentGameName ?? "Unknown Game"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Starts</p>
            <p className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
              <CalendarDays className="w-3 h-3 text-slate-500 shrink-0" />
              {formatDate(registration.tournamentStart)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Joined</p>
            <p className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
              <CalendarDays className="w-3 h-3 text-slate-500 shrink-0" />
              {formatDate(registration.registeredAt)}
            </p>
          </div>
          {registration.inGameId && (
            <div className="col-span-2">
              <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">In-Game ID</p>
              <p className="text-[11px] font-medium text-orange-300 truncate">{registration.inGameId}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDetails(registration.tournamentId); }}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Details
          </button>
          {canWithdraw && (
            <button
              onClick={(e) => { e.stopPropagation(); onRequestWithdraw(registration); }}
              disabled={isWithdrawing}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              {isWithdrawing ? "Withdrawing…" : "Withdraw"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
