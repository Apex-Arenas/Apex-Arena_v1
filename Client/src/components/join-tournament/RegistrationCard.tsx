import { type MyTournamentRegistration } from "../../services/tournament.service";
import { REGISTRATION_STATUS_COLORS, STATUS_COLORS, formatDate } from "./utils";

interface RegistrationCardProps {
  registration: MyTournamentRegistration;
  canWithdraw: boolean;
  isWithdrawing: boolean;
  onRequestWithdraw: (registration: MyTournamentRegistration) => void;
  onOpenDetails: (tournamentId: string) => void;
}

export function RegistrationCard({
  registration,
  canWithdraw,
  isWithdrawing,
  onRequestWithdraw,
  onOpenDetails,
}: RegistrationCardProps) {
  const tournamentStatusColor =
    STATUS_COLORS[registration.tournamentStatus] ??
    "bg-slate-700 text-slate-300";
  const registrationStatusColor =
    REGISTRATION_STATUS_COLORS[registration.status] ??
    "bg-slate-700 text-slate-300";

  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3 cursor-pointer hover:border-slate-600 transition-colors"
      onClick={() => onOpenDetails(registration.tournamentId)}
    >
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold text-white line-clamp-2">
          {registration.tournamentTitle}
        </h3>
        <p className="text-xs text-slate-400">
          {registration.tournamentGameName ?? "Game"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize ${tournamentStatusColor}`}
        >
          Tournament: {registration.tournamentStatus.replace("_", " ")}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize ${registrationStatusColor}`}
        >
          {registration.status.replace("_", " ")}
        </span>
      </div>

      <div className="text-xs text-slate-400 space-y-1">
        <p>Start: {formatDate(registration.tournamentStart)}</p>
        <p>Joined: {formatDate(registration.registeredAt)}</p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRequestWithdraw(registration);
        }}
        disabled={!canWithdraw || isWithdrawing}
        className="mt-auto w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white"
      >
        {isWithdrawing
          ? "Withdrawing..."
          : canWithdraw
            ? "Withdraw"
            : "Not Withdrawable"}
      </button>
    </div>
  );
}
