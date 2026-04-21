import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { LeagueTableRow } from '../../services/tournament.service';
import { FadeImage } from '../ui/FadeImage';

interface LeagueTableProps {
  table: LeagueTableRow[];
  highlightUserId?: string;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ avatarUrl, displayName, size = 'md' }: {
  avatarUrl?: string; displayName: string; size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'md' ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-xs';
  if (avatarUrl) {
    return (
      <div className={`${dim} rounded-full overflow-hidden border border-slate-700 shrink-0 relative bg-slate-800`}>
        <FadeImage src={avatarUrl} alt={displayName} className="absolute inset-0 w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-full bg-linear-to-br from-orange-800 to-violet-800 flex items-center justify-center font-bold text-white border border-slate-700 shrink-0`}>
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Form badge ────────────────────────────────────────────────────────────────
function FormBadge({ result }: { result: string }) {
  if (result === 'W') return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">W</span>
  );
  if (result === 'D') return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">D</span>
  );
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">L</span>
  );
}

// ── Trend ─────────────────────────────────────────────────────────────────────
function Trend({ change }: { change: number }) {
  if (change > 0) return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (change < 0) return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-slate-700" />;
}

// ── Podium ────────────────────────────────────────────────────────────────────
function Podium({ top3, highlightUserId }: { top3: LeagueTableRow[]; highlightUserId?: string }) {
  const [second, first, third] = [top3[1], top3[0], top3[2]];
  const slots = [
    { row: second, medal: '🥈', pedHeight: 'h-14', bg: 'from-slate-500/20 to-slate-500/5 border-slate-500/30', pts: 'text-slate-300', pad: 'pt-6' },
    { row: first,  medal: '🥇', pedHeight: 'h-20', bg: 'from-amber-500/25 to-amber-500/5 border-amber-500/35', pts: 'text-amber-300',  pad: 'pt-0' },
    { row: third,  medal: '🥉', pedHeight: 'h-10', bg: 'from-orange-800/20 to-orange-800/5 border-orange-700/30', pts: 'text-orange-300', pad: 'pt-10' },
  ];

  return (
    <div className="flex items-end justify-center gap-2 px-4 pb-0">
      {slots.map(({ row, medal, pedHeight, bg, pts, pad }, i) => {
        if (!row) return <div key={i} className="flex-1 max-w-[120px]" />;
        const isMe = !!highlightUserId && (row.userId === highlightUserId || row.teamId === highlightUserId);
        return (
          <div key={row.position} className={`flex flex-col items-center gap-2 flex-1 max-w-[120px] ${pad}`}>
            {/* Avatar */}
            <div className="relative">
              <Avatar avatarUrl={row.avatarUrl} displayName={row.displayName} size={i === 1 ? 'lg' : 'md'} />
              <span className="absolute -bottom-1 -right-1 text-sm leading-none">{medal}</span>
            </div>
            {/* Name */}
            <p className={`text-xs font-bold truncate max-w-[96px] text-center ${isMe ? 'text-orange-300' : i === 1 ? 'text-white' : 'text-slate-300'}`}>
              {row.displayName}
              {isMe && <span className="ml-1 text-[10px] text-orange-500"> (you)</span>}
            </p>
            {/* Pedestal */}
            <div className={`w-full ${pedHeight} rounded-t-xl bg-linear-to-b ${bg} border border-b-0 flex flex-col items-center justify-center gap-0.5`}>
              <span className={`text-xl font-display font-bold tabular-nums ${pts}`}>{row.points}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">pts</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Row accent ────────────────────────────────────────────────────────────────
function rowAccent(pos: number, total: number) {
  if (pos === 1) return 'border-l-2 border-l-amber-400';
  if (pos <= 3)  return 'border-l-2 border-l-emerald-500';
  if (pos >= total - 2) return 'border-l-2 border-l-red-500/60';
  return 'border-l-2 border-l-transparent';
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function LeagueTable({ table, highlightUserId }: LeagueTableProps) {
  if (table.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border border-dashed border-slate-700 text-slate-500 text-sm">
        No standings yet. Fixtures need to be generated first.
      </div>
    );
  }

  const top3 = table.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Podium */}
      {top3.length >= 2 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 pt-5 overflow-hidden">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-center mb-4">Top Players</p>
          <Podium top3={top3} highlightUserId={highlightUserId} />
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-widest">
                <th className="pl-4 pr-2 py-3 text-left w-12">#</th>
                <th className="px-2 py-3 text-left">Player</th>
                <th className="px-2 py-3 text-center w-8" title="Played">P</th>
                <th className="px-2 py-3 text-center w-8 text-emerald-500/80" title="Won">W</th>
                <th className="px-2 py-3 text-center w-8 text-amber-500/80" title="Drawn">D</th>
                <th className="px-2 py-3 text-center w-8 text-red-500/80" title="Lost">L</th>
                <th className="px-2 py-3 text-center w-10 hidden sm:table-cell" title="Goals For">GF</th>
                <th className="px-2 py-3 text-center w-10 hidden sm:table-cell" title="Goals Against">GA</th>
                <th className="px-2 py-3 text-center w-10" title="Goal Difference">GD</th>
                <th className="px-4 py-3 text-center w-14 text-white font-bold" title="Points">Pts</th>
                <th className="px-2 py-3 text-center hidden md:table-cell">Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {table.map((row) => {
                const isMe = !!highlightUserId && (row.userId === highlightUserId || row.teamId === highlightUserId);
                return (
                  <tr
                    key={row.position}
                    className={`transition-colors ${
                      isMe
                        ? 'bg-orange-950/30 hover:bg-orange-950/50'
                        : 'bg-slate-900/20 hover:bg-slate-800/30'
                    } ${rowAccent(row.position, table.length)}`}
                  >
                    {/* Position */}
                    <td className="pl-4 pr-2 py-3">
                      <div className="flex items-center gap-1.5">
                        <Trend change={row.positionChange} />
                        {row.position <= 3 ? (
                          <span className="text-base leading-none">
                            {row.position === 1 ? '🥇' : row.position === 2 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold text-xs w-4 text-center tabular-nums">
                            {row.position}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Player */}
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar avatarUrl={row.avatarUrl} displayName={row.displayName} size="sm" />
                        <div className="min-w-0">
                          <span className={`font-semibold text-sm block truncate max-w-[120px] sm:max-w-none ${isMe ? 'text-orange-300' : 'text-slate-200'}`}>
                            {row.displayName}
                            {isMe && <span className="ml-1.5 text-[10px] text-orange-500 font-bold">(you)</span>}
                          </span>
                          {row.inGameId && (
                            <span className="text-[10px] text-slate-500 block">{row.inGameId}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-2 py-3 text-center text-slate-400 text-xs tabular-nums">{row.played}</td>
                    <td className="px-2 py-3 text-center text-emerald-400 font-bold text-xs tabular-nums">{row.won}</td>
                    <td className="px-2 py-3 text-center text-amber-400 font-semibold text-xs tabular-nums">{row.drawn}</td>
                    <td className="px-2 py-3 text-center text-red-400 font-semibold text-xs tabular-nums">{row.lost}</td>
                    <td className="px-2 py-3 text-center text-slate-400 text-xs tabular-nums hidden sm:table-cell">{row.goalsFor}</td>
                    <td className="px-2 py-3 text-center text-slate-400 text-xs tabular-nums hidden sm:table-cell">{row.goalsAgainst}</td>
                    <td className="px-2 py-3 text-center text-xs tabular-nums">
                      <span className={row.goalDifference > 0 ? 'text-emerald-400 font-semibold' : row.goalDifference < 0 ? 'text-red-400' : 'text-slate-500'}>
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </span>
                    </td>

                    {/* Points */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-9 h-7 rounded-lg text-sm font-bold tabular-nums ${
                        row.position === 1
                          ? 'bg-amber-500/20 text-amber-300'
                          : isMe
                            ? 'bg-orange-500/20 text-orange-300'
                            : 'bg-slate-800/60 text-slate-300'
                      }`}>
                        {row.points}
                      </span>
                    </td>

                    {/* Form */}
                    <td className="px-2 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-0.5 justify-center">
                        {row.form.length > 0
                          ? row.form.slice(-5).map((r, i) => <FormBadge key={i} result={r} />)
                          : <span className="text-[10px] text-slate-600">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-3 bg-slate-900/80 border-t border-slate-800 text-[10px] text-slate-500 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2 h-3.5 rounded-sm bg-amber-400 inline-block" /> 1st place</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-3.5 rounded-sm bg-emerald-500 inline-block" /> Top 3</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-3.5 rounded-sm bg-red-500/60 inline-block" /> Bottom 3</span>
          <span className="ml-auto hidden sm:flex items-center gap-3">
            <span>P = Played</span>
            <span>W / D / L</span>
            <span>GD = Goal Diff</span>
            <span>Pts = Points</span>
          </span>
        </div>
      </div>
    </div>
  );
}
