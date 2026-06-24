import { Crown, Medal, Trophy } from "lucide-react";
import type { EscrowStatusSummary, TournamentRegistrant } from "../../services/organizer.service";
import { getParticipantLabel, type BracketRound } from "../tournament-detail";

interface OrganizerResultsSidebarCardProps {
  escrowSummary: EscrowStatusSummary | null;
  registrants: TournamentRegistrant[];
  bracketRounds: BracketRound[];
}

export default function OrganizerResultsSidebarCard({
  escrowSummary,
  registrants,
  bracketRounds,
}: OrganizerResultsSidebarCardProps) {
  const submittedWinners = escrowSummary?.winnerSubmissions?.winners ?? [];
  const RESULT_SLOTS = [
    {
      pos: 1,
      icon: <Crown className="w-4 h-4 text-amber-400" />,
      label: "Champion",
      nameClass: "text-amber-300 font-bold",
      bg: "bg-amber-500/8 border-amber-500/20",
    },
    {
      pos: 2,
      icon: <Medal className="w-4 h-4 text-slate-300" />,
      label: "2nd Place",
      nameClass: "text-slate-200 font-semibold",
      bg: "bg-slate-800/40 border-slate-700/40",
    },
    {
      pos: 3,
      icon: <Medal className="w-4 h-4 text-orange-600" />,
      label: "3rd Place",
      nameClass: "text-slate-300 font-semibold",
      bg: "bg-slate-800/40 border-slate-700/40",
    },
  ];

  if (submittedWinners.length > 0) {
    const top3 = [...submittedWinners]
      .sort((a, b) => a.position - b.position)
      .slice(0, 3);
    if (top3.length === 0) return null;
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800/60 bg-slate-950/20">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <h2 className="font-display text-sm font-bold text-white">
            Results
          </h2>
        </div>
        <div className="p-4 space-y-2">
          {RESULT_SLOTS.map(({ pos, icon, label, nameClass, bg }) => {
            const winner = top3.find((w) => w.position === pos);
            if (!winner) return null;
            const reg = registrants.find((r) => r.inGameId === winner.inGameId);
            const displayName = reg?.displayName ?? winner.inGameId;
            return (
              <div
                key={label}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border ${bg}`}
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-400 shrink-0">
                  {icon} {label}
                </span>
                <div className="min-w-0 text-right">
                  <p className={`text-sm truncate ${nameClass}`}>
                    {displayName}
                  </p>
                  {displayName !== winner.inGameId && (
                    <p className="text-[10px] text-slate-500 truncate">
                      {winner.inGameId}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback: derive top 3 from bracket match outcomes
  const gfRound =
    bracketRounds.find((r) => r.bracket === "grand_final") ??
    bracketRounds[bracketRounds.length - 1];
  const gfMatch = gfRound?.matches?.find((m) => m.status === "completed");
  const champion = gfMatch?.participants?.find((p) => p.result === "win");
  if (!champion) return null;
  const runnerUp = gfMatch?.participants?.find((p) => p.result === "loss");
  const wbRoundsData = bracketRounds.filter(
    (r) => r !== gfRound && r.bracket !== "grand_final",
  );
  const sfRound = wbRoundsData[wbRoundsData.length - 1];
  const sfLosers =
    sfRound?.matches
      ?.filter((m) => m.status === "completed")
      ?.flatMap((m) => m.participants?.filter((p) => p.result === "loss") ?? []) ?? [];
  const bracketPlacements = [
    {
      icon: <Crown className="w-4 h-4 text-amber-400" />,
      label: "Champion",
      player: champion,
      nameClass: "text-amber-300 font-bold",
      bg: "bg-amber-500/8 border-amber-500/20",
    },
    {
      icon: <Medal className="w-4 h-4 text-slate-300" />,
      label: "2nd Place",
      player: runnerUp,
      nameClass: "text-slate-200 font-semibold",
      bg: "bg-slate-800/40 border-slate-700/40",
    },
    {
      icon: <Medal className="w-4 h-4 text-orange-600" />,
      label: "3rd Place",
      player: sfLosers[0] ?? null,
      nameClass: "text-slate-300 font-semibold",
      bg: "bg-slate-800/40 border-slate-700/40",
    },
  ];
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800/60 bg-slate-950/20">
        <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
          <Trophy className="w-4 h-4 text-amber-400" />
        </div>
        <h2 className="font-display text-sm font-bold text-white">
          Results
        </h2>
      </div>
      <div className="p-4 space-y-2">
        {bracketPlacements.map(({ icon, label, player, nameClass, bg }) => (
          <div
            key={label}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border ${bg}`}
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-400 shrink-0">
              {icon} {label}
            </span>
            <span className={`text-sm truncate text-right ${nameClass}`}>
              {player ? getParticipantLabel(player) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
