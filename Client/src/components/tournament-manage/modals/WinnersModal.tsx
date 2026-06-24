import type { Dispatch, SetStateAction } from "react";
import { Trophy, X, CheckCircle2, AlertCircle, ChevronDown, Loader2 } from "lucide-react";
import type {
  EscrowStatusSummary,
  TournamentRegistrant,
  WinnerSubmissionInput,
} from "../../../services/organizer.service";
import PlayerAvatar from "../PlayerAvatar";

interface WinnersModalProps {
  escrowSummary: EscrowStatusSummary | null;
  winnerRows: WinnerSubmissionInput[];
  registrants: TournamentRegistrant[];
  emptyWinnerIndices: Set<number>;
  setEmptyWinnerIndices: Dispatch<SetStateAction<Set<number>>>;
  openWinnerDropdown: number | null;
  setOpenWinnerDropdown: Dispatch<SetStateAction<number | null>>;
  winnerDropdownSearch: string;
  setWinnerDropdownSearch: Dispatch<SetStateAction<string>>;
  handleWinnerRowChange: (index: number, key: "inGameId" | "prizePercentage", value: string) => void;
  handleSubmitWinners: () => void;
  isSubmittingWinners: boolean;
  canSubmitWinners: boolean;
  onClose: () => void;
}

export default function WinnersModal({
  escrowSummary,
  winnerRows,
  registrants,
  emptyWinnerIndices,
  setEmptyWinnerIndices,
  openWinnerDropdown,
  setOpenWinnerDropdown,
  winnerDropdownSearch,
  setWinnerDropdownSearch,
  handleWinnerRowChange,
  handleSubmitWinners,
  isSubmittingWinners,
  canSubmitWinners,
  onClose,
}: WinnersModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-white">
                Submit Winners
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                In-game IDs + prize split per position
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
          {escrowSummary?.status === "verifying_winners" ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-2.5 flex gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-300">
                <span className="font-semibold">Winners verified.</span> Prizes will be distributed automatically within 5 minutes. No further action needed.
              </p>
            </div>
          ) : escrowSummary?.status === "disputed" && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 flex gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                Escrow is <span className="font-semibold">disputed</span> — previous winner IDs could not be matched. Select the correct players below and re-submit to resolve.
              </p>
            </div>
          )}
          {winnerRows.map((row, index) => (
            <div
              key={`${row.position}-${index}`}
              className={`rounded-xl border p-3.5 space-y-3 transition-colors ${emptyWinnerIndices.has(index) ? "border-red-500/50 bg-red-500/5" : "border-slate-800 bg-slate-800/30"}`}
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-[11px] font-bold text-indigo-400">
                  {row.position}
                </span>
                <span className="text-xs font-bold text-slate-300">
                  Position #{row.position}
                </span>
              </div>
              <div className="space-y-2">
                {/* Player picker */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Player
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (openWinnerDropdown === index) {
                        setOpenWinnerDropdown(null);
                      } else {
                        setOpenWinnerDropdown(index);
                        setWinnerDropdownSearch("");
                      }
                    }}
                    className={`w-full bg-slate-800/60 border rounded-xl px-3 py-2 text-sm text-left flex items-center justify-between gap-2 transition-colors ${openWinnerDropdown === index ? "border-indigo-500/60" : "border-slate-700 hover:border-indigo-500/40"}`}
                  >
                    {row.inGameId ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <PlayerAvatar
                          src={registrants.find(r => r.inGameId === row.inGameId)?.avatarUrl}
                          name={registrants.find(r => r.inGameId === row.inGameId)?.displayName}
                          size="xs"
                          ringClass=""
                        />
                        <span className="text-white text-sm font-semibold truncate">
                          {registrants.find(r => r.inGameId === row.inGameId)?.displayName ?? row.inGameId}
                        </span>
                        <span className="text-slate-500 text-xs shrink-0">{row.inGameId}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-sm">Select player…</span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-150 ${openWinnerDropdown === index ? "rotate-180" : ""}`} />
                  </button>
                  {openWinnerDropdown === index && (
                    <div className="border border-slate-700 rounded-xl bg-slate-950 overflow-hidden shadow-xl">
                      <div className="p-2 border-b border-slate-800">
                        <input
                          type="text"
                          value={winnerDropdownSearch}
                          onChange={(e) => setWinnerDropdownSearch(e.target.value)}
                          placeholder="Search players…"
                          autoFocus
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {(() => {
                          const alreadySelected = winnerRows
                            .filter((_, i) => i !== index)
                            .map(r => r.inGameId.toLowerCase())
                            .filter(Boolean);
                          const eligible = registrants
                            .filter(r => r.inGameId)
                            .filter(r => {
                              if (!winnerDropdownSearch) return true;
                              const q = winnerDropdownSearch.toLowerCase();
                              return (
                                r.displayName.toLowerCase().includes(q) ||
                                r.inGameId.toLowerCase().includes(q)
                              );
                            });
                          if (eligible.length === 0) {
                            return (
                              <div className="px-3 py-4 text-center text-xs text-slate-500">
                                No players found
                              </div>
                            );
                          }
                          return eligible.map(player => {
                            const isUsed = alreadySelected.includes(player.inGameId.toLowerCase());
                            const isSelected = row.inGameId === player.inGameId;
                            return (
                              <button
                                key={player.userId}
                                type="button"
                                disabled={isUsed}
                                onClick={() => {
                                  handleWinnerRowChange(index, "inGameId", player.inGameId);
                                  setEmptyWinnerIndices(prev => { const s = new Set(prev); s.delete(index); return s; });
                                  setOpenWinnerDropdown(null);
                                  setWinnerDropdownSearch("");
                                }}
                                className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left transition-colors ${isUsed ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-800/80"} ${isSelected ? "bg-indigo-500/10" : ""}`}
                              >
                                <PlayerAvatar
                                  src={player.avatarUrl}
                                  name={player.displayName}
                                  size="xs"
                                  ringClass=""
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-white truncate leading-tight">
                                    {player.displayName}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {player.inGameId}
                                  </p>
                                </div>
                                {isSelected && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                )}
                                {isUsed && !isSelected && (
                                  <span className="text-[10px] text-slate-600 shrink-0">taken</span>
                                )}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                {/* Prize % */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Prize %
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.prizePercentage}
                    onChange={(e) =>
                      handleWinnerRowChange(
                        index,
                        "prizePercentage",
                        e.target.value,
                      )
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60 transition-colors"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-800/40 border border-slate-800 px-4 py-2.5">
            <span className="text-xs font-semibold text-slate-500">
              Total
            </span>
            <span
              className={`text-sm font-bold tabular-nums ${Math.abs(winnerRows.reduce((s, r) => s + r.prizePercentage, 0) - 100) < 0.01 ? "text-emerald-400" : "text-white"}`}
            >
              {winnerRows
                .reduce((sum, row) => sum + row.prizePercentage, 0)
                .toFixed(2)}
              %
            </span>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitWinners}
              disabled={isSubmittingWinners || !canSubmitWinners}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-400 disabled:opacity-60 transition-colors"
            >
              {isSubmittingWinners ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trophy className="w-4 h-4" />
              )}
              {canSubmitWinners ? "Submit Winners" : "Locked"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
