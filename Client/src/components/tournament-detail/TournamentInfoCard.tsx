import type { Tournament } from "../../services/tournament.service";

interface TournamentInfoCardProps {
  tournament: Tournament;
}

export default function TournamentInfoCard({ tournament }: TournamentInfoCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-800">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Tournament Info
        </p>
      </div>
      <div className="divide-y divide-slate-800/60">
        {[
          { label: "Format", value: tournament.format ?? "Solo" },
          {
            label: "Type",
            value: tournament.tournamentType ?? "Standard",
          },
          ...(tournament.region
            ? [
                {
                  label: "Region",
                  value:
                    tournament.region === "GLOBAL"
                      ? "Global"
                      : tournament.region,
                },
              ]
            : []),
          ...(tournament.minParticipants > 0
            ? [{ label: "Min Players", value: String(tournament.minParticipants) }]
            : []),
          ...(tournament.visibility
            ? [{ label: "Visibility", value: tournament.visibility.charAt(0).toUpperCase() + tournament.visibility.slice(1) }]
            : []),
        ].map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between px-5 py-3"
          >
            <span className="text-xs text-slate-500">{r.label}</span>
            <span className="text-xs font-bold text-white capitalize">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
