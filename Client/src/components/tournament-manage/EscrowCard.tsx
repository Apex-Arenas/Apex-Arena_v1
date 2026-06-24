import type { Dispatch, SetStateAction } from "react";
import { Wallet, CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";
import type {
  EscrowStatusSummary,
  TournamentRegistrant,
  EscrowWinnerSummary,
} from "../../services/organizer.service";
import {
  ESCROW_STATUS_COLORS,
  formatGhsFromPesewas,
  normalizeEscrowStatusLabel,
  formatDate,
  getEscrowStageVisual,
  type EscrowStageItem,
} from "./tournament-manage.utils";

interface EscrowCardProps {
  escrowSummary: EscrowStatusSummary;
  escrowCompletionPercent: number;
  escrowStageCounts: { completed: number; active: number; pending: number };
  escrowStages: EscrowStageItem[];
  focusedEscrowStage: EscrowStageItem | undefined;
  visibleEscrowStages: EscrowStageItem[];
  escrowFlowView: "single" | "all";
  setEscrowFlowView: Dispatch<SetStateAction<"single" | "all">>;
  escrowNeedsAttention: boolean;
  disputedWinners: EscrowWinnerSummary[];
  registrants: TournamentRegistrant[];
}

export default function EscrowCard({
  escrowSummary,
  escrowCompletionPercent,
  escrowStageCounts,
  escrowStages,
  focusedEscrowStage,
  visibleEscrowStages,
  escrowFlowView,
  setEscrowFlowView,
  escrowNeedsAttention,
  disputedWinners,
  registrants,
}: EscrowCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-white">
              Escrow
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Auto-refreshes every 10s
            </p>
          </div>
        </div>
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize ${ESCROW_STATUS_COLORS[escrowSummary.status] ?? "bg-slate-700/50 text-slate-300 border-slate-700"}`}
        >
          {normalizeEscrowStatusLabel(escrowSummary.status)}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Money stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-800/40 border border-slate-800 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
              Players
            </p>
            <p className="font-display text-lg font-bold text-white tabular-nums">
              {escrowSummary.playerEntries?.totalPlayers ?? 0}
            </p>
          </div>
          <div className="rounded-xl bg-slate-800/40 border border-slate-800 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
              Pool
            </p>
            <p className="font-display text-lg font-bold text-white tabular-nums">
              {formatGhsFromPesewas(
                escrowSummary.playerEntries?.totalCollected ?? 0,
              )}
            </p>
          </div>
          <div className="rounded-xl bg-slate-800/40 border border-slate-800 px-3 py-2.5 col-span-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
              Organizer Deposit
            </p>
            <p className="font-display text-lg font-bold text-white tabular-nums">
              {formatGhsFromPesewas(
                escrowSummary.organizerDeposit?.grossAmount ?? 0,
              )}
            </p>
          </div>
        </div>

        {/* Milestone pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            {
              label: "Winners Submitted",
              done: Boolean(escrowSummary.processingSchedule?.winnersSubmitted),
            },
            {
              label: "Prizes Distributed",
              done: Boolean(escrowSummary.processingSchedule?.prizesDistributed),
            },
          ].map(({ label, done }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${done ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-slate-800/60 border-slate-700/50 text-slate-500"}`}
            >
              {done && <CheckCircle2 className="w-3 h-3" />}
              {label}
            </span>
          ))}
        </div>

        {/* Completion */}
        <div className="rounded-xl bg-slate-800/40 border border-slate-800 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Settlement
            </p>
            <p
              className={`text-sm font-bold tabular-nums ${escrowCompletionPercent === 100 ? "text-emerald-400" : "text-white"}`}
            >
              {escrowCompletionPercent}%
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-linear-to-r from-cyan-400 via-emerald-400 to-emerald-300 transition-all duration-500"
              style={{ width: `${escrowCompletionPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[11px] font-semibold text-center">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-emerald-300">
              {escrowStageCounts.completed} done
            </div>
            <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 text-cyan-300">
              {escrowStageCounts.active} live
            </div>
            <div className="rounded-lg bg-slate-800 border border-slate-700/50 px-2 py-1 text-slate-400">
              {escrowStageCounts.pending} waiting
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-800/40 border border-slate-800 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Settlement Flow
            </p>
            <select
              value={escrowFlowView}
              onChange={(event) =>
                setEscrowFlowView(event.target.value as "single" | "all")
              }
              className="text-[11px] rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="single">Current Step</option>
              <option value="all">All Steps</option>
            </select>
          </div>

          <p className="text-[11px] text-slate-600 mb-3">
            {escrowFlowView === "all"
              ? `All ${escrowStages.length} steps`
              : focusedEscrowStage
                ? `Step ${escrowStages.findIndex((stage) => stage.key === focusedEscrowStage.key) + 1} of ${escrowStages.length}`
                : "No steps available"}
          </p>

          <div className="space-y-2">
            {visibleEscrowStages.map((stage, index) => {
              const originalIndex = escrowStages.findIndex(
                (item) => item.key === stage.key,
              );
              const visual = getEscrowStageVisual(stage.state);
              const connectorClass =
                stage.state === "completed"
                  ? "bg-emerald-400/60"
                  : stage.state === "active"
                    ? "bg-cyan-400/60"
                    : "bg-slate-700";

              return (
                <div key={stage.key} className="relative pl-8">
                  {index < visibleEscrowStages.length - 1 && (
                    <span
                      className={`absolute left-2.25 top-5 -bottom-3 w-px ${connectorClass}`}
                    />
                  )}

                  <span
                    className={`absolute left-0 top-1 w-5 h-5 rounded-full border flex items-center justify-center ${visual.badgeClass}`}
                  >
                    {stage.state === "completed" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : stage.state === "active" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Circle className="w-3 h-3" />
                    )}
                  </span>

                  <div
                    className={`rounded-lg border px-3 py-2 transition-colors ${visual.cardClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-white/95">
                        {originalIndex + 1}. {stage.label}
                      </p>
                      <span className="text-[10px] uppercase tracking-wide opacity-80">
                        {visual.label}
                      </span>
                    </div>
                    <p className="text-[11px] mt-1 opacity-85">{stage.hint}</p>
                    {stage.timestamp && (
                      <p className="text-[11px] mt-1 opacity-80">
                        {formatDate(stage.timestamp)}
                      </p>
                    )}
                    {!stage.timestamp && stage.detail && (
                      <p className="text-[11px] mt-1 opacity-80">
                        {stage.detail}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {escrowNeedsAttention && (
          <div className="space-y-2">
            <div className="rounded-xl border border-red-500/25 bg-red-500/8 px-3 py-2.5 flex gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs text-red-300">
                  <span className="font-semibold">Needs attention · </span>
                  {disputedWinners.length > 0
                    ? "Submitted winner IDs could not be matched to registered players. The escrow is locked — contact support with the correct IDs shown below."
                    : `Status: ${normalizeEscrowStatusLabel(escrowSummary.status)}. Check payment flow.`}
                </p>
              </div>
            </div>

            {disputedWinners.length > 0 && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
                <div className="px-3 py-2 text-[11px] font-bold text-red-400 border-b border-red-500/15 uppercase tracking-widest">
                  Unmatched Winners ({disputedWinners.length})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-red-500/10">
                        <th className="px-3 py-2 text-left font-semibold">
                          #
                        </th>
                        <th className="px-3 py-2 text-left font-semibold">
                          Submitted ID
                        </th>
                        <th className="px-3 py-2 text-left font-semibold">
                          Correct ID (registered)
                        </th>
                        <th className="px-3 py-2 text-left font-semibold">
                          Prize
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {disputedWinners.map((winner) => {
                        const match = registrants.find(
                          (r) =>
                            r.displayName.toLowerCase() ===
                              winner.inGameId.toLowerCase() ||
                            r.inGameId.toLowerCase() ===
                              winner.inGameId.toLowerCase() ||
                            r.username.toLowerCase() ===
                              winner.inGameId.toLowerCase(),
                        );
                        return (
                          <tr
                            key={`${winner.position}-${winner.inGameId}`}
                            className="border-b border-red-500/8 last:border-b-0"
                          >
                            <td className="px-3 py-2 font-bold text-white">
                              #{winner.position}
                            </td>
                            <td className="px-3 py-2 text-red-300 line-through opacity-70">
                              {winner.inGameId}
                            </td>
                            <td className="px-3 py-2">
                              {match ? (
                                <div>
                                  <p className="text-emerald-300 font-semibold">
                                    {match.inGameId}
                                  </p>
                                  <p className="text-slate-500 text-[10px]">
                                    {match.displayName}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">
                                  not found in registrants
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-400">
                              {winner.prizeAmountLabel ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
