interface OrganizerPortfolioProps {
  organizerLiveCount: number;
  organizerDraftsCount: number;
  organizerCompletedCount: number;
}

export default function OrganizerPortfolio({
  organizerLiveCount,
  organizerDraftsCount,
  organizerCompletedCount,
}: OrganizerPortfolioProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800/60">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Portfolio
        </p>
      </div>
      <div className="divide-y divide-slate-800/60">
        {[
          {
            label: "Open / Live",
            value: organizerLiveCount,
            accent: "text-emerald-400",
            dot: "bg-emerald-400",
          },
          {
            label: "Draft / Pending",
            value: organizerDraftsCount,
            accent: "text-amber-400",
            dot: "bg-amber-400",
          },
          {
            label: "Completed",
            value: organizerCompletedCount,
            accent: "text-cyan-300",
            dot: "bg-cyan-400",
          },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.dot}`}
              />
              <span className="text-xs text-slate-400">
                {row.label}
              </span>
            </div>
            <span
              className={`font-display text-2xl font-bold tabular-nums ${row.accent}`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
