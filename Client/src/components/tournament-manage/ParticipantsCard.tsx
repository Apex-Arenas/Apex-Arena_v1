import type { Dispatch, SetStateAction } from "react";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { TournamentRegistrant } from "../../services/organizer.service";
import PlayerAvatar from "./PlayerAvatar";
import RegistrantRow from "./RegistrantRow";
import { STATUS_COLORS } from "./tournament-manage.utils";

interface ParticipantsCardProps {
  activeRegistrants: TournamentRegistrant[];
  checkedInCount: number;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  filteredRegistrants: TournamentRegistrant[];
  pagedRegistrants: TournamentRegistrant[];
  registrantsPage: number;
  setRegistrantsPage: Dispatch<SetStateAction<number>>;
  registrantsTotalPages: number;
  registrantsPageSize: number;
  actionLoading: string | null;
  onCheckIn: (userId: string) => void;
  onUndoCheckIn: (userId: string) => void;
  onRequestRemove: (userId: string, displayName: string) => void;
}

export default function ParticipantsCard({
  activeRegistrants,
  checkedInCount,
  search,
  setSearch,
  filteredRegistrants,
  pagedRegistrants,
  registrantsPage,
  setRegistrantsPage,
  registrantsTotalPages,
  registrantsPageSize,
  actionLoading,
  onCheckIn,
  onUndoCheckIn,
  onRequestRemove,
}: ParticipantsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="flex flex-col gap-3 px-4 py-3 border-b border-slate-800/60 bg-slate-950/20 md:flex-row md:items-center md:justify-between md:px-5 md:py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-white leading-tight">
              Participants
              <span className="ml-2 text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">
                {activeRegistrants.length}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {checkedInCount} checked in
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setRegistrantsPage(1);
              }}
              placeholder="Search players..."
              className="w-full md:w-44 bg-slate-800/60 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
            />
          </div>
        </div>
      </div>
      {filteredRegistrants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-400">
            {search
              ? "No players match your search"
              : "No players registered yet"}
          </p>
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setRegistrantsPage(1);
              }}
              className="mt-2 text-xs text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile card list — visible below md */}
          <div className="md:hidden p-3 space-y-2">
            {pagedRegistrants.map((r) => (
              <div
                key={r.registrationId}
                className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3.5 flex items-start gap-3"
              >
                <div className="relative shrink-0">
                  <PlayerAvatar
                    src={r.avatarUrl}
                    name={r.displayName}
                    size="md"
                  />
                  {r.checkedIn && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                      <CheckCircle2 className="w-2 h-2 text-slate-900" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {/* Name + status badge in one row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate leading-tight">
                        {r.displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        @{r.username}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[r.status] ?? "bg-slate-700/30 text-slate-400 border-slate-700"}`}
                    >
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  {/* In-game ID chip */}
                  {r.inGameId && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-mono text-cyan-400/80 bg-cyan-500/8 px-2 py-0.5 rounded-md border border-cyan-500/15">
                      <span className="text-cyan-600/60 font-sans not-italic">
                        #
                      </span>
                      <span className="truncate max-w-[120px]">
                        {r.inGameId}
                      </span>
                    </span>
                  )}
                  {/* Divider + actions */}
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-700/40">
                    {r.checkedIn ? (
                      <button
                        onClick={() => onUndoCheckIn(r.userId)}
                        disabled={actionLoading === r.userId}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === r.userId ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        Undo check-in
                      </button>
                    ) : (
                      <button
                        onClick={() => onCheckIn(r.userId)}
                        disabled={
                          actionLoading === r.userId ||
                          r.status === "disqualified" ||
                          r.status === "withdrawn"
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 disabled:opacity-40 transition-colors"
                      >
                        {actionLoading === r.userId ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Check In
                      </button>
                    )}
                    {r.status !== "disqualified" &&
                      r.status !== "withdrawn" && (
                        <button
                          onClick={() =>
                            onRequestRemove(r.userId, r.displayName)
                          }
                          className="ml-auto p-1.5 rounded-lg text-slate-600 border border-transparent hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table — visible from md up */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-160">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-950/20">
                  {["Player", "Status", "Registered", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRegistrants.map((r) => (
                  <RegistrantRow
                    key={r.registrationId}
                    registrant={r}
                    onCheckIn={onCheckIn}
                    onUndoCheckIn={onUndoCheckIn}
                    onRemove={onRequestRemove}
                    isActionLoading={actionLoading === r.userId}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {registrantsTotalPages > 1 && (
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-800/60 bg-slate-950/10">
              <p className="text-[11px] text-slate-500">
                {(registrantsPage - 1) * registrantsPageSize + 1}–
                {Math.min(
                  registrantsPage * registrantsPageSize,
                  filteredRegistrants.length,
                )}{" "}
                of {filteredRegistrants.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRegistrantsPage((p) => Math.max(1, p - 1))}
                  disabled={registrantsPage === 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from(
                  { length: registrantsTotalPages },
                  (_, i) => i + 1,
                )
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === registrantsTotalPages ||
                      Math.abs(p - registrantsPage) <= 1,
                  )
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                      acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "…" ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-1 text-xs text-slate-600"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setRegistrantsPage(item as number)}
                        className={`min-w-[28px] h-7 rounded-lg text-xs font-semibold transition-colors ${
                          registrantsPage === item
                            ? "bg-cyan-500 text-slate-950"
                            : "text-slate-400 hover:text-white hover:bg-white/8"
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                <button
                  onClick={() =>
                    setRegistrantsPage((p) =>
                      Math.min(registrantsTotalPages, p + 1),
                    )
                  }
                  disabled={registrantsPage === registrantsTotalPages}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
