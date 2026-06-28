import { parsePenaltyReason } from './match-action-modal.utils';

export function ScoreDisplay({ s1, s2, n1, n2, p1Won, p2Won, reason }: {
  s1: number; s2: number; n1: string; n2: string;
  p1Won?: boolean; p2Won?: boolean; reason?: string;
}) {
  const penalty = parsePenaltyReason(reason);

  // For penalty matches show regular time scores; otherwise show stored scores as-is
  const rt1 = penalty ? penalty.rt1 : s1;
  const rt2 = penalty ? penalty.rt2 : s2;
  // Highlight the higher-scoring side — winner badge on PlayerCard already conveys who won.
  // When scores are equal the winner (decided on penalties) gets the highlight instead.
  const h1 = rt1 !== rt2 ? rt1 > rt2 : (p1Won ?? false);
  const h2 = rt1 !== rt2 ? rt2 > rt1 : (p2Won ?? false);

  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/60 overflow-hidden">
      {/* Regular time scores */}
      <div className="grid grid-cols-[1fr_auto_1fr]">
        <div className={`flex flex-col items-center py-4 px-3 gap-1 ${h1 ? 'bg-amber-500/6' : ''}`}>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate w-full text-center">{n1}</p>
          <span className={`font-display text-5xl font-bold tabular-nums leading-none ${h1 ? 'text-amber-300' : 'text-slate-500'}`}>{rt1}</span>
        </div>
        <div className="flex flex-col items-center justify-center px-3 border-x border-slate-700/60">
          <span className="text-slate-600 font-bold text-sm">—</span>
        </div>
        <div className={`flex flex-col items-center py-4 px-3 gap-1 ${h2 ? 'bg-amber-500/6' : ''}`}>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate w-full text-center">{n2}</p>
          <span className={`font-display text-5xl font-bold tabular-nums leading-none ${h2 ? 'text-amber-300' : 'text-slate-500'}`}>{rt2}</span>
        </div>
      </div>

      {/* Penalty scores — full breakdown when data exists */}
      {penalty ? (
        <div className="grid grid-cols-[1fr_auto_1fr] border-t border-amber-500/20 bg-amber-500/5">
          <div className="flex flex-col items-center py-2.5 px-3 gap-0.5">
            <p className="text-[9px] text-amber-500/70 uppercase tracking-widest">Penalties</p>
            <span className={`font-display text-2xl font-bold tabular-nums ${penalty.pen1 > penalty.pen2 ? 'text-amber-300' : 'text-slate-500'}`}>{penalty.pen1}</span>
          </div>
          <div className="flex items-center justify-center px-3 border-x border-amber-500/20">
            <span className="text-amber-700 font-bold text-xs">—</span>
          </div>
          <div className="flex flex-col items-center py-2.5 px-3 gap-0.5">
            <p className="text-[9px] text-amber-500/70 uppercase tracking-widest">Penalties</p>
            <span className={`font-display text-2xl font-bold tabular-nums ${penalty.pen2 > penalty.pen1 ? 'text-amber-300' : 'text-slate-500'}`}>{penalty.pen2}</span>
          </div>
        </div>
      ) : rt1 === rt2 && (p1Won || p2Won) ? (
        /* Equal scores but a winner exists — decided on penalties, exact scores not recorded */
        <div className="flex items-center justify-center gap-2 border-t border-amber-500/20 bg-amber-500/5 py-2">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">
            {p1Won ? n1 : n2} won on penalties
          </span>
        </div>
      ) : null}
    </div>
  );
}
