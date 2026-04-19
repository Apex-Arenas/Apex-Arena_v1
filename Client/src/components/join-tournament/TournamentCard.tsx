import {
  CalendarDays,
  DollarSign,
  Gamepad2,
  Lock,
  Trophy,
} from "lucide-react";
import { type Tournament } from "../../services/tournament.service";
import {
  STATUS_COLORS,
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

// Accent strip colours by status for top border
const STATUS_ACCENT: Record<string, string> = {
  open: "from-green-500 to-emerald-600",
  published: "from-cyan-500 to-blue-600",
  started: "from-blue-500 to-indigo-600",
  ongoing: "from-blue-500 to-indigo-600",
  locked: "from-amber-500 to-orange-600",
  awaiting_deposit: "from-amber-500 to-orange-600",
  completed: "from-slate-500 to-slate-600",
  cancelled: "from-red-500 to-red-600",
  draft: "from-slate-600 to-slate-700",
};

const STATUS_LABELS: Record<string, string> = {
  awaiting_deposit: "Awaiting Deposit",
  open: "Open",
  published: "Published",
  locked: "Locked",
  started: "Live",
  ongoing: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
  draft: "Draft",
};

export function TournamentCard({
  tournament,
  registrationStatus,
  isLoadingRegistrations,
  onRegister,
  onOpenDetails,
}: TournamentCardProps) {
  const statusColor =
    STATUS_COLORS[tournament.status] ?? "bg-slate-700/60 text-slate-300";
  const accentGradient =
    STATUS_ACCENT[tournament.status] ?? "from-slate-500 to-slate-600";
  const statusLabel =
    STATUS_LABELS[tournament.status] ?? tournament.status.replace(/_/g, " ");

  const normalizedStatus = normalizeRegistrationStatus(registrationStatus);
  const isAlreadyRegistered =
    tournament.isRegistered === true ||
    isActiveRegistrationStatus(normalizedStatus);
  const canRegister =
    !isLoadingRegistrations &&
    tournament.status === "open" &&
    !isAlreadyRegistered;
  const isFull = tournament.currentCount >= tournament.maxParticipants;

  return (
    <div
      className="group rounded-xl border border-slate-800 bg-slate-900/70 flex flex-col overflow-hidden hover:border-slate-600 hover:shadow-lg hover:shadow-black/40 transition-all cursor-pointer"
      onClick={() => onOpenDetails(tournament.id)}
    >
      {/* Accent strip */}
      <div className={`h-1 w-full bg-linear-to-r ${accentGradient}`} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Game + Status row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {tournament.game?.logoUrl ? (
              <img
                src={tournament.game.logoUrl}
                alt=""
                className="w-5 h-5 rounded object-cover shrink-0"
              />
            ) : (
              <Gamepad2 className="w-4 h-4 text-slate-500 shrink-0" />
            )}
            <span className="text-xs text-slate-400 truncate">
              {tournament.game?.name ?? "Unknown Game"}
            </span>
          </div>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize whitespace-nowrap shrink-0 ${statusColor}`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-cyan-100 transition-colors">
          {tournament.title}
        </h3>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            {formatDate(tournament.schedule.tournamentStart)}
          </span>
          <span className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            {formatFee(tournament.isFree, tournament.entryFee, tournament.currency)}
          </span>
          {tournament.prizePool !== undefined && tournament.prizePool > 0 && (
            <span className="flex items-center gap-1.5 text-amber-400 col-span-2">
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              Prize: {tournament.currency}{" "}
              {(tournament.prizePool / 100).toFixed(2)}
            </span>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (canRegister) onRegister(tournament);
            else onOpenDetails(tournament.id);
          }}
          disabled={isLoadingRegistrations}
          className={`mt-auto w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2
            ${
              isAlreadyRegistered
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                : canRegister
                  ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-sm"
                  : "bg-slate-800/60 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white"
            }`}
        >
          {isLoadingRegistrations ? (
            "Checking..."
          ) : isAlreadyRegistered ? (
            `Registered · View`
          ) : isFull ? (
            <>
              <Lock className="w-3.5 h-3.5" />
              Full · View Details
            </>
          ) : canRegister ? (
            "Join Tournament"
          ) : (
            "View Details"
          )}
        </button>
      </div>
    </div>
  );
}
