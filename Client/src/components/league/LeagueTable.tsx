import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LeagueTableRow } from '../../services/tournament.service';

interface LeagueTableProps {
  table: LeagueTableRow[];
  highlightUserId?: string;
}

function FormBadge({ result }: { result: string }) {
  if (result === 'W')
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
        W
      </span>
    );
  if (result === 'D')
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
        D
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
      L
    </span>
  );
}

function PositionIndicator({ change }: { change: number }) {
  if (change > 0)
    return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (change < 0)
    return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

function positionRowStyle(position: number, total: number): string {
  if (position === 1) return 'border-l-2 border-l-amber-400';
  if (position <= 3) return 'border-l-2 border-l-emerald-500';
  if (position >= total - 2) return 'border-l-2 border-l-red-500';
  return 'border-l-2 border-l-transparent';
}

export function LeagueTable({ table, highlightUserId }: LeagueTableProps) {
  if (table.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No standings yet. Fixtures need to be generated first.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm min-w-160">
        <thead>
          <tr className="bg-slate-900/80 text-slate-400 uppercase text-[11px] tracking-wider">
            <th className="pl-4 pr-2 py-3 text-left w-8">#</th>
            <th className="px-2 py-3 text-left">Player</th>
            <th className="px-2 py-3 text-center w-8">P</th>
            <th className="px-2 py-3 text-center w-8">W</th>
            <th className="px-2 py-3 text-center w-8">D</th>
            <th className="px-2 py-3 text-center w-8">L</th>
            <th className="px-2 py-3 text-center w-10 hidden sm:table-cell">GF</th>
            <th className="px-2 py-3 text-center w-10 hidden sm:table-cell">GA</th>
            <th className="px-2 py-3 text-center w-10">GD</th>
            <th className="px-2 py-3 text-center w-10 font-bold text-white">Pts</th>
            <th className="px-2 py-3 text-center hidden md:table-cell">Form</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {table.map((row) => {
            const isMe = highlightUserId && (row.userId === highlightUserId || row.teamId === highlightUserId);
            return (
              <tr
                key={row.position}
                className={`transition-colors ${
                  isMe
                    ? 'bg-cyan-950/40 hover:bg-cyan-950/60'
                    : 'bg-slate-900/40 hover:bg-slate-800/40'
                } ${positionRowStyle(row.position, table.length)}`}
              >
                <td className="pl-4 pr-2 py-3">
                  <div className="flex items-center gap-1">
                    <PositionIndicator change={row.positionChange} />
                    <span className={`font-semibold ${row.position === 1 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {row.position}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2.5">
                    {row.avatarUrl ? (
                      <img
                        src={row.avatarUrl}
                        alt={row.displayName}
                        className="w-7 h-7 rounded-full object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-linear-to-br from-cyan-800 to-indigo-800 flex items-center justify-center text-white text-xs font-bold border border-slate-700">
                        {row.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className={`font-medium ${isMe ? 'text-cyan-300' : 'text-slate-200'}`}>
                        {row.displayName}
                      </span>
                      {isMe && (
                        <span className="ml-1.5 text-[10px] text-cyan-500 font-semibold">(you)</span>
                      )}
                      {row.inGameId && (
                        <div className="text-[11px] text-slate-500">{row.inGameId}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 text-center text-slate-300">{row.played}</td>
                <td className="px-2 py-3 text-center text-emerald-400 font-medium">{row.won}</td>
                <td className="px-2 py-3 text-center text-amber-400 font-medium">{row.drawn}</td>
                <td className="px-2 py-3 text-center text-red-400 font-medium">{row.lost}</td>
                <td className="px-2 py-3 text-center text-slate-400 hidden sm:table-cell">{row.goalsFor}</td>
                <td className="px-2 py-3 text-center text-slate-400 hidden sm:table-cell">{row.goalsAgainst}</td>
                <td className="px-2 py-3 text-center text-slate-300">
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </td>
                <td className="px-2 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-7 rounded-md bg-cyan-500/10 text-cyan-300 font-bold text-sm">
                    {row.points}
                  </span>
                </td>
                <td className="px-2 py-3 hidden md:table-cell">
                  <div className="flex items-center gap-0.5 justify-center">
                    {row.form.slice(-5).map((r, i) => (
                      <FormBadge key={i} result={r} />
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Legend */}
      <div className="flex items-center gap-5 px-4 py-2.5 bg-slate-900/60 border-t border-slate-800 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Top position
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Top 3
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Bottom 3
        </span>
      </div>
    </div>
  );
}
