import { CheckCircle2, ChevronDown, Swords, Trophy } from 'lucide-react';

interface Props {
  tournamentCount: number;
  upcomingCount: number;
  activeCount: number;
  isLoading: boolean;
  isLoadingRegistrations: boolean;
  statsOpen: boolean;
  onToggleStats: () => void;
}

export function JoinTournamentHero({
  tournamentCount, upcomingCount, activeCount,
  isLoading, isLoadingRegistrations,
  statsOpen, onToggleStats,
}: Props) {
  const statItems = [
    { icon: Trophy,       iconColor: 'text-orange-400',  bg: 'from-orange-500/15 to-amber-500/15',  label: 'Available',        value: isLoading ? '—' : String(tournamentCount) },
    { icon: Swords,       iconColor: 'text-cyan-400',    bg: 'from-cyan-500/15 to-indigo-500/15',   label: 'My Registrations', value: isLoadingRegistrations ? '—' : String(upcomingCount) },
    { icon: CheckCircle2, iconColor: 'text-emerald-400', bg: 'from-emerald-500/15 to-teal-500/15',  label: 'Active',           value: isLoadingRegistrations ? '—' : String(activeCount) },
  ];

  return (
    <div className="relative bg-slate-900 border-b border-slate-800/60 overflow-hidden">
      <div className="absolute -top-40 right-0 w-175 h-100 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-125 h-50 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 pt-10 pb-7">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">Find Your Arena</h1>
          <p className="text-base text-slate-400 mt-3">Browse open tournaments, track your registrations, and compete.</p>
        </div>

        {/* Mobile dropdown */}
        <div className="sm:hidden mt-4">
          <button
            onClick={onToggleStats}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs font-semibold text-slate-400 uppercase tracking-widest"
          >
            <span>Stats</span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${statsOpen ? 'rotate-180' : ''}`} />
          </button>
          {statsOpen && (
            <div className="mt-1 grid grid-cols-3 gap-2">
              {statItems.map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1 bg-slate-800/50 border border-slate-700/60 rounded-xl px-2 py-3">
                  <div className={`w-7 h-7 rounded-lg bg-linear-to-br ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
                  </div>
                  <p className="font-display text-base font-bold tabular-nums text-white leading-none">{s.value}</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest text-center leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* sm+: grid */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-3 mt-6">
          {statItems.map((s) => (
            <div key={s.label} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3">
              <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="font-display text-xl font-bold tabular-nums text-white leading-none">{s.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
