import { Trophy } from "lucide-react";
import type { Tournament } from "../../services/tournament.service";
import { formatPrize } from "./tournament-detail.utils";

interface PrizeDistributionCardProps {
  tournament: Tournament;
}

export default function PrizeDistributionCard({ tournament }: PrizeDistributionCardProps) {
  if (
    tournament.isFree ||
    !tournament.prizeDistribution ||
    tournament.prizeDistribution.length === 0
  ) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="font-display text-base font-bold text-white mb-4 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        Prize Distribution
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {tournament.prizeDistribution.slice(0, 3).map((d) => (
          <div
            key={d.position}
            className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-center"
          >
            <p className="text-sm mb-1">
              {d.position === 1
                ? "🥇"
                : d.position === 2
                  ? "🥈"
                  : "🥉"}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">
              {d.position === 1
                ? "1st"
                : d.position === 2
                  ? "2nd"
                  : "3rd"}
            </p>
            <p className="text-lg font-display font-bold text-amber-300">
              {d.percentage}%
            </p>
            {tournament.prizePool && (
              <p className="text-xs text-slate-400 mt-1">
                {formatPrize(
                  Math.floor(
                    (tournament.prizePool * d.percentage) / 100,
                  ),
                  tournament.currency,
                )}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
