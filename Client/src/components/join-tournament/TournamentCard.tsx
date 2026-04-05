import {
  CalendarDays,
  DollarSign,
  Gamepad2,
  Lock,
  Trophy,
  Users,
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

export function TournamentCard({
  tournament,
  registrationStatus,
  isLoadingRegistrations,
  onRegister,
  onOpenDetails,
}: TournamentCardProps) {
  const statusColor =
    STATUS_COLORS[tournament.status] ?? "bg-slate-700 text-slate-300";
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
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3 hover:border-slate-600 transition-colors cursor-pointer"
      onClick={() => onOpenDetails(tournament.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {tournament.game?.logoUrl ? (
              <img
                src={tournament.game.logoUrl}
                alt=""
                className="w-5 h-5 rounded object-cover"
              />
            ) : (
              <Gamepad2 className="w-4 h-4 text-slate-500" />
            )}
            <span className="text-xs text-slate-400 truncate">
              {tournament.game?.name ?? "Unknown Game"}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
            {tournament.title}
          </h3>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize whitespace-nowrap shrink-0 ${statusColor}`}
        >
          {tournament.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
          {formatDate(tournament.schedule.tournamentStart)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 shrink-0" />
          {tournament.currentCount}/{tournament.maxParticipants}
        </span>
        <span className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 shrink-0" />
          {formatFee(
            tournament.isFree,
            tournament.entryFee,
            tournament.currency,
          )}
        </span>
        {tournament.prizePool !== undefined && tournament.prizePool > 0 && (
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            Prize Pool: {tournament.currency}{" "}
            {(tournament.prizePool / 100).toFixed(2)}
          </span>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (canRegister) onRegister(tournament);
          else onOpenDetails(tournament.id);
        }}
        disabled={isLoadingRegistrations}
        className="mt-auto w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50
          bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/30 hover:border-cyan-500
          disabled:hover:bg-cyan-500/10 disabled:hover:text-cyan-300 disabled:hover:border-cyan-500/30
          flex items-center justify-center gap-2"
      >
        {isLoadingRegistrations ? (
          "Checking..."
        ) : isAlreadyRegistered ? (
          `View (${(normalizedStatus || "registered").replace("_", " ")})`
        ) : isFull ? (
          <>
            <Lock className="w-4 h-4" />
            Full - View Details
          </>
        ) : canRegister ? (
          "Join Tournament"
        ) : (
          "View Details"
        )}
      </button>
    </div>
  );
}
