import { Trophy, Loader2, Wallet } from "lucide-react";
import type { Tournament } from "../../services/tournament.service";
import type {
  EscrowStatusSummary,
  TournamentRegistrant,
} from "../../services/organizer.service";
import { getParticipantLabel, type BracketRound } from "../tournament-detail";

interface TournamentResultsCardProps {
  tournament: Tournament;
  escrowSummary: EscrowStatusSummary | null;
  registrants: TournamentRegistrant[];
  bracketRounds: BracketRound[];
  tournamentResults: Array<Record<string, unknown>> | null;
  isLoadingResults: boolean;
  isAllocatingWinnings: boolean;
  onAllocateWinnings: () => void;
  isAllocatingEarnings: boolean;
  onAllocateEarnings: () => void;
}

export default function TournamentResultsCard({
  tournament,
  escrowSummary,
  registrants,
  bracketRounds,
  tournamentResults,
  isLoadingResults,
  isAllocatingWinnings,
  onAllocateWinnings,
  isAllocatingEarnings,
  onAllocateEarnings,
}: TournamentResultsCardProps) {
  if (tournament.status !== "completed") return null;

  const submittedWinners = escrowSummary?.winnerSubmissions?.winners ?? [];
  type StandingEntry = {
    position: number;
    inGameId: string;
    displayName: string;
    prize: string | null;
  };
  let effectiveStandings: StandingEntry[] = [];

  if (submittedWinners.length > 0) {
    // Priority 1: submitted winners from escrow
    effectiveStandings = [...submittedWinners]
      .sort((a, b) => a.position - b.position)
      .map((w) => {
        const reg = registrants.find((r) => r.inGameId === w.inGameId);
        return {
          position: w.position,
          inGameId: w.inGameId,
          displayName: reg?.displayName ?? w.inGameId,
          prize: w.prizeAmountLabel ?? null,
        };
      });
  } else {
    // Priority 2: bracket match outcomes — same source as the Results sidebar
    const gfRound =
      bracketRounds.find((r) => r.bracket === "grand_final") ??
      bracketRounds[bracketRounds.length - 1];
    const gfMatch = gfRound?.matches?.find((m) => m.status === "completed");
    const bracketChampion = gfMatch?.participants?.find(
      (p) => p.result === "win",
    );
    if (bracketChampion) {
      const bracketRunnerUp = gfMatch?.participants?.find(
        (p) => p.result === "loss",
      );
      const wbRoundsData = bracketRounds.filter(
        (r) => r !== gfRound && r.bracket !== "grand_final",
      );
      const sfLosers = (wbRoundsData[wbRoundsData.length - 1]?.matches ?? [])
        .filter((m) => m.status === "completed")
        .flatMap((m) => m.participants?.filter((p) => p.result === "loss") ?? []);
      const addBracketEntry = (
        pos: number,
        p: typeof bracketChampion | undefined,
      ) => {
        if (!p) return;
        const inGameId = getParticipantLabel(p);
        const reg = registrants.find((r) => r.inGameId === inGameId);
        effectiveStandings.push({
          position: pos,
          inGameId,
          displayName: reg?.displayName ?? inGameId,
          prize: null,
        });
      };
      addBracketEntry(1, bracketChampion);
      addBracketEntry(2, bracketRunnerUp);
      addBracketEntry(3, sfLosers[0]);
    }
    // Priority 3: tournament results API (last resort)
    if (effectiveStandings.length === 0) {
      effectiveStandings = (tournamentResults ?? []).map((e, idx) => ({
        position: Number(e.position ?? e.final_placement ?? idx + 1),
        inGameId: String(e.in_game_id ?? e.inGameId ?? ""),
        displayName: String(e.username ?? e.in_game_id ?? e.inGameId ?? "—"),
        prize: e.prize_amount_ghs
          ? `GHS ${String(e.prize_amount_ghs)}`
          : e.prize_percentage
            ? `${String(e.prize_percentage)}%`
            : null,
      }));
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-800/80 bg-slate-950/30 space-y-2">
        {/* Title + badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-white">
                Final Standings
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tournament completed · Prize distribution
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            Completed
          </span>
        </div>
        {/* Action buttons — own row */}
        {tournament.entryFee > 0 && (
          <div className="flex items-center gap-2">
            {escrowSummary?.processingSchedule?.prizesDistributed && (
              <button
                onClick={onAllocateWinnings}
                disabled={isAllocatingWinnings}
                title="Send winnings to players' Prizes page"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 disabled:opacity-50 transition-colors"
              >
                {isAllocatingWinnings ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trophy className="w-3 h-3" />
                )}
                {isAllocatingWinnings ? "Sending…" : "Send to Players"}
              </button>
            )}
            {escrowSummary && (
              <button
                onClick={onAllocateEarnings}
                disabled={isAllocatingEarnings}
                title="Send entry fee earnings to your Finance page"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/25 disabled:opacity-50 transition-colors"
              >
                {isAllocatingEarnings ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wallet className="w-3 h-3" />
                )}
                {isAllocatingEarnings ? "Sending…" : "Send to Finance"}
              </button>
            )}
          </div>
        )}
      </div>

      {isLoadingResults && effectiveStandings.length === 0 ? (
        <div className="flex items-center justify-center py-12 gap-3">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          <span className="text-sm text-slate-500">Loading results…</span>
        </div>
      ) : effectiveStandings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-400">
            No results recorded yet
          </p>
        </div>
      ) : (
        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          {/* Podium — top 3 */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {[
              {
                pos: 1,
                color: "from-amber-500/20 to-amber-500/5",
                border: "border-amber-500/30",
                badge: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                medal: "🥇",
              },
              {
                pos: 2,
                color: "from-slate-400/15 to-slate-400/5",
                border: "border-slate-500/30",
                badge: "text-slate-300 bg-slate-500/15 border-slate-500/30",
                medal: "🥈",
              },
              {
                pos: 3,
                color: "from-orange-600/15 to-orange-600/5",
                border: "border-orange-500/25",
                badge: "text-orange-300 bg-orange-500/10 border-orange-500/25",
                medal: "🥉",
              },
            ].map(({ pos, color, border, badge, medal }) => {
              const entry = effectiveStandings.find((e) => e.position === pos);
              if (!entry) return null;
              return (
                <div
                  key={pos}
                  className={`rounded-xl border bg-linear-to-b ${color} ${border} p-2 sm:p-3 text-center`}
                >
                  <div className="text-xl sm:text-2xl mb-1">{medal}</div>
                  <p className="text-[10px] sm:text-xs font-bold text-white truncate">
                    {entry.displayName}
                  </p>
                  {entry.displayName !== entry.inGameId && entry.inGameId && (
                    <p className="text-[9px] text-slate-500 truncate mt-0.5">
                      {entry.inGameId}
                    </p>
                  )}
                  <p
                    className={`text-[10px] font-semibold mt-1.5 px-1.5 py-0.5 rounded-full border inline-block ${badge}`}
                  >
                    {entry.prize ?? "—"}
                  </p>
                </div>
              );
            })}
          </div>
          {/* 4th place and beyond */}
          {effectiveStandings.length > 3 && (
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60 bg-slate-950/20">
                    {["#", "Player", "Prize"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {effectiveStandings.slice(3).map((entry) => (
                    <tr
                      key={entry.position}
                      className="border-b border-slate-800/40 last:border-b-0 hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-sm font-bold text-slate-400">
                        #{entry.position}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-sm font-medium text-white">
                          {entry.displayName}
                        </p>
                        {entry.displayName !== entry.inGameId &&
                          entry.inGameId && (
                            <p className="text-xs text-slate-500">
                              {entry.inGameId}
                            </p>
                          )}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-400">
                        {entry.prize ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
