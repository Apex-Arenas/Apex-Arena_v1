import { Crown } from 'lucide-react';

export function PlayerCard({
  name, isWinner, isLoser, dimmed, highlight, selected, onClick,
}: {
  name: string; isWinner?: boolean; isLoser?: boolean; dimmed?: boolean;
  highlight?: boolean; selected?: boolean; onClick?: () => void;
}) {
  const initial = name.charAt(0).toUpperCase() || '?';

  const containerCls = (() => {
    if (selected)  return 'border-orange-500/70 bg-orange-500/8 shadow-[0_0_20px_rgba(249,115,22,0.12)]';
    if (isWinner)  return 'border-amber-500/50 bg-amber-500/6 shadow-[0_0_20px_rgba(251,191,36,0.10)]';
    if (isLoser)   return 'border-slate-700/30 opacity-40';
    if (dimmed)    return 'border-slate-700/30 opacity-40';
    return onClick ? 'border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60' : 'border-slate-700 bg-slate-800/40';
  })();

  const avatarCls = (() => {
    if (selected)  return 'bg-linear-to-br from-orange-500 to-amber-400 text-slate-950 border-orange-400/50';
    if (isWinner)  return 'bg-linear-to-br from-amber-500 to-orange-500 text-slate-950 border-amber-400/50';
    return 'bg-linear-to-br from-slate-700 to-slate-800 text-white border-slate-600';
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`relative flex-1 flex flex-col items-center gap-2.5 py-5 px-3 rounded-xl border-2 transition-all duration-200 ${containerCls} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 rounded-xl bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[20px_20px] pointer-events-none" />

      {/* Avatar */}
      <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${avatarCls}`}>
        {initial}
        {isWinner && (
          <div className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
            <Crown className="w-3 h-3 text-slate-950" />
          </div>
        )}
      </div>

      <span className={`text-xs font-bold text-center truncate w-full ${
        selected ? 'text-orange-300' : isWinner ? 'text-amber-200' : 'text-slate-200'
      }`}>
        {name}
      </span>

      {highlight && <span className="text-[10px] text-orange-400 font-semibold uppercase tracking-wide">You</span>}
      {isWinner && <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wide">Winner</span>}
      {selected && <span className="text-[10px] text-orange-400 font-semibold uppercase tracking-wide">Selected</span>}
    </button>
  );
}
