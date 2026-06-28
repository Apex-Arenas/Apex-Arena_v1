import { CalendarDays, Swords } from 'lucide-react';
import type { MyTournamentRegistration } from '../../services/tournament.service';

const ACTIVE_META: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  started:   { label: 'Live',      dot: 'bg-orange-400 animate-pulse', text: 'text-orange-300', bg: 'from-orange-950 via-slate-900 to-violet-950' },
  ongoing:   { label: 'Live',      dot: 'bg-orange-400 animate-pulse', text: 'text-orange-300', bg: 'from-orange-950 via-slate-900 to-violet-950' },
  completed: { label: 'Completed', dot: 'bg-slate-400',                text: 'text-slate-400',  bg: 'from-slate-800 via-slate-900 to-slate-900'   },
};

export function ActiveTournamentCard({
  registration,
  onView,
}: {
  registration: MyTournamentRegistration;
  onView: (id: string) => void;
}) {
  const meta = ACTIVE_META[registration.tournamentStatus] ?? {
    label: registration.tournamentStatus.replace(/_/g, ' '),
    dot: 'bg-slate-500',
    text: 'text-slate-300',
    bg: 'from-slate-800 via-slate-900 to-slate-900',
  };
  const isLive = registration.tournamentStatus === 'started' || registration.tournamentStatus === 'ongoing';
  const imageUrl = registration.tournamentThumbnailUrl ?? registration.tournamentBannerUrl ?? null;

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-black/40 transition-all cursor-pointer"
      onClick={() => onView(registration.tournamentId)}
    >
      {/* Cover image */}
      <div className="relative aspect-4/3 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-slate-900" />

        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={registration.tournamentTitle}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-linear-to-br from-orange-600/40 via-transparent to-violet-700/40" />
          </>
        ) : (
          <>
            <div className={`absolute inset-0 bg-linear-to-br ${meta.bg}`} />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[32px_32px]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Swords className="w-12 h-12 text-white/5" />
            </div>
            <div className="absolute inset-0 bg-linear-to-br from-orange-600/40 via-transparent to-violet-700/40" />
          </>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/40 to-transparent" />

        {/* Status chip */}
        <div className="absolute top-2.5 right-2.5">
          <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-sm border border-white/10 ${meta.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
            {meta.label}
          </span>
        </div>

        {/* Game logo */}
        {registration.tournamentGameLogoUrl && (
          <div className="absolute bottom-2.5 left-2.5">
            <img
              src={registration.tournamentGameLogoUrl}
              alt={registration.tournamentGameName ?? ''}
              className="w-7 h-7 rounded-md object-cover border border-white/15 shadow-md"
            />
          </div>
        )}

        {/* Registration status */}
        <div className={`absolute bottom-2.5 ${registration.tournamentGameLogoUrl ? 'left-11' : 'left-3'}`}>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border backdrop-blur-sm bg-slate-800/80 text-slate-300 border-slate-600/40 capitalize">
            {registration.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-3 flex-1">
        <div>
          <h4 className="font-display text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-orange-300 transition-colors">
            {registration.tournamentTitle}
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            {registration.tournamentGameName ?? 'Unknown Game'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {registration.tournamentStart && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                <CalendarDays className="w-2.5 h-2.5" /> Started
              </p>
              <p className="text-[11px] font-medium text-slate-300">
                {new Date(registration.tournamentStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5 flex items-center gap-1">
              <Swords className="w-2.5 h-2.5" /> Status
            </p>
            <p className="text-[11px] font-medium text-slate-300 capitalize">
              {registration.tournamentStatus.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onView(registration.tournamentId); }}
          className={`mt-auto w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            isLive
              ? 'bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 hover:shadow-lg hover:shadow-orange-500/25'
              : 'border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <Swords className="w-3.5 h-3.5" />
          {isLive ? 'View Live' : 'View Results'}
        </button>
      </div>
    </div>
  );
}
