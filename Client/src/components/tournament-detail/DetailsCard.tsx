import type { Tournament } from "../../services/tournament.service";

interface DetailsCardProps {
  tournament: Tournament;
}

export default function DetailsCard({ tournament }: DetailsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-800">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Details
        </p>
      </div>
      <div className="divide-y divide-slate-800/60">
        {[
          { label: "Game", value: tournament.game?.name },
          { label: "Platform", value: tournament.platform },
          { label: "Mode", value: tournament.gameMode },
          { label: "Max Players", value: tournament.maxParticipants > 0 ? String(tournament.maxParticipants) : null },
        ]
          .filter((r) => Boolean(r.value))
          .map((r) => (
            <div key={r.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-xs text-slate-500">{r.label}</span>
              <span className="text-xs font-bold text-white capitalize">{r.value}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
