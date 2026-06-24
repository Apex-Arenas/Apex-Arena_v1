import { CheckCircle2, XCircle, Loader2, Wallet, Circle, Trash2 } from "lucide-react";
import type { TournamentRegistrant } from "../../services/organizer.service";
import PlayerAvatar from "./PlayerAvatar";
import { STATUS_COLORS } from "./tournament-manage.utils";

export default function RegistrantRow({
  registrant,
  onCheckIn,
  onUndoCheckIn,
  onRemove,
  isActionLoading,
}: {
  registrant: TournamentRegistrant;
  onCheckIn: (userId: string) => void;
  onUndoCheckIn: (userId: string) => void;
  onRemove: (userId: string, displayName: string) => void;
  isActionLoading: boolean;
}) {
  const statusColor = STATUS_COLORS[registrant.status] ?? "bg-slate-700/50 text-slate-400";

  const statusIcon =
    registrant.status === "checked_in" ? <CheckCircle2 className="w-3 h-3" /> :
    registrant.status === "pending_payment" ? <Wallet className="w-3 h-3" /> :
    registrant.status === "waitlist" ? <Circle className="w-3 h-3" /> :
    (registrant.status === "disqualified" || registrant.status === "withdrawn") ? <XCircle className="w-3 h-3" /> :
    null;

  return (
    <tr className="border-b border-slate-800/50 hover:bg-slate-800/25 transition-colors group">
      {/* Player */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <PlayerAvatar
              src={registrant.avatarUrl}
              name={registrant.displayName}
              size="md"
              ringClass="ring-2 ring-slate-700/60 group-hover:ring-slate-600 transition-all"
            />
            {registrant.checkedIn && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                <CheckCircle2 className="w-2 h-2 text-slate-900" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {registrant.displayName}
            </p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              @{registrant.username}
            </p>
            {registrant.inGameId && (
              <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-mono text-cyan-400/80 bg-cyan-500/8 px-2 py-0.5 rounded-md border border-cyan-500/15 max-w-full">
                <span className="text-cyan-600/60 font-sans not-italic">#</span>
                <span className="truncate">{registrant.inGameId}</span>
              </span>
            )}
          </div>
        </div>
      </td>
      {/* Status */}
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full capitalize ${statusColor}`}>
          {statusIcon}
          {registrant.status.replace(/_/g, " ")}
        </span>
      </td>
      {/* Registered */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <p className="text-xs text-slate-300">
          {registrant.registeredAt
            ? new Date(registrant.registeredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "—"}
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">
          {registrant.registeredAt
            ? new Date(registrant.registeredAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
            : ""}
        </p>
      </td>
      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          {registrant.checkedIn ? (
            <button
              onClick={() => onUndoCheckIn(registrant.userId)}
              disabled={isActionLoading}
              title="Undo check-in"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/20 disabled:opacity-50 transition-colors"
            >
              {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Undo
            </button>
          ) : (
            <button
              onClick={() => onCheckIn(registrant.userId)}
              disabled={isActionLoading || registrant.status === "disqualified" || registrant.status === "withdrawn"}
              title="Check in player"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 disabled:opacity-40 transition-colors"
            >
              {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Check In
            </button>
          )}
          {registrant.status !== "disqualified" && registrant.status !== "withdrawn" && (
            <button
              onClick={() => onRemove(registrant.userId, registrant.displayName)}
              disabled={isActionLoading}
              title="Remove player"
              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 disabled:opacity-40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
