import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Swords, AlertCircle } from 'lucide-react';
import type { LeagueMatchweek, LeagueMatch } from '../../services/tournament.service';

interface MatchweekFixturesProps {
  matchweeks: LeagueMatchweek[];
  currentWeek: number;
  onWeekChange: (week: number) => void;
  highlightUserId?: string;
  onMatchClick?: (matchId: string) => void;
}

function MatchStatusBadge({ status }: { status: string }) {
  if (status === 'completed')
    return (
      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
        <CheckCircle2 className="w-3 h-3" /> Final
      </span>
    );
  if (status === 'disputed')
    return (
      <span className="flex items-center gap-1 text-[11px] text-amber-400">
        <AlertCircle className="w-3 h-3" /> Disputed
      </span>
    );
  if (status === 'ongoing' || status === 'ready_check')
    return (
      <span className="flex items-center gap-1 text-[11px] text-cyan-400 animate-pulse">
        <Swords className="w-3 h-3" /> Live
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-[11px] text-slate-500">
      <Clock className="w-3 h-3" /> Scheduled
    </span>
  );
}

function needsAction(match: LeagueMatch, userId?: string): boolean {
  if (!userId) return false;
  const involved = match.player1Id === userId || match.player2Id === userId;
  if (!involved) return false;
  return match.status === 'ready_check' || match.status === 'ongoing';
}

function MatchCard({
  match, highlightUserId, onClick,
}: {
  match: LeagueMatch;
  highlightUserId?: string;
  onClick?: () => void;
}) {
  const isCompleted = match.status === 'completed';
  const isP1Winner = isCompleted && match.winnerId === match.player1Id;
  const isP2Winner = isCompleted && match.winnerId === match.player2Id;
  const involvesMeP1 = !!highlightUserId && match.player1Id === highlightUserId;
  const involvesMeP2 = !!highlightUserId && match.player2Id === highlightUserId;
  const actionNeeded = needsAction(match, highlightUserId);

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 transition-colors relative
        ${onClick ? 'cursor-pointer' : ''}
        ${involvesMeP1 || involvesMeP2
          ? 'bg-cyan-950/30 border-cyan-800/50 hover:border-cyan-700'
          : 'bg-slate-900/50 border-slate-800/60 hover:border-slate-700'
        }
        ${actionNeeded ? 'ring-1 ring-cyan-500/30' : ''}
      `}
    >
      {/* Action needed pulse dot */}
      {actionNeeded && (
        <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
        </span>
      )}

      <div className="flex items-center gap-3">
        {/* Player 1 */}
        <div className={`flex-1 flex items-center gap-2 ${isP2Winner ? 'opacity-40' : ''}`}>
          {match.player1Avatar ? (
            <img src={match.player1Avatar} alt={match.player1Name}
              className="w-8 h-8 rounded-full object-cover border border-slate-700" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-cyan-800 to-indigo-800 flex items-center justify-center text-white text-xs font-bold border border-slate-700 shrink-0">
              {match.player1Name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <span className={`text-sm font-medium block truncate
              ${involvesMeP1 ? 'text-cyan-300' : isP1Winner ? 'text-white' : 'text-slate-300'}`}>
              {match.player1Name}
            </span>
            {involvesMeP1 && <span className="text-[10px] text-cyan-500 font-semibold">(you)</span>}
          </div>
        </div>

        {/* Score / VS */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isCompleted && match.score1 !== undefined ? (
            <>
              <span className={`text-lg font-bold w-6 text-center tabular-nums ${isP1Winner ? 'text-white' : 'text-slate-400'}`}>
                {match.score1}
              </span>
              <span className="text-slate-600 text-xs">–</span>
              <span className={`text-lg font-bold w-6 text-center tabular-nums ${isP2Winner ? 'text-white' : 'text-slate-400'}`}>
                {match.score2}
              </span>
            </>
          ) : (
            <span className="text-slate-500 text-xs font-semibold px-2">VS</span>
          )}
        </div>

        {/* Player 2 */}
        <div className={`flex-1 flex items-center gap-2 justify-end ${isP1Winner ? 'opacity-40' : ''}`}>
          <div className="min-w-0 text-right">
            <span className={`text-sm font-medium block truncate
              ${involvesMeP2 ? 'text-cyan-300' : isP2Winner ? 'text-white' : 'text-slate-300'}`}>
              {match.player2Name}
            </span>
            {involvesMeP2 && <span className="text-[10px] text-cyan-500 font-semibold">(you)</span>}
          </div>
          {match.player2Avatar ? (
            <img src={match.player2Avatar} alt={match.player2Name}
              className="w-8 h-8 rounded-full object-cover border border-slate-700" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-800 to-violet-800 flex items-center justify-center text-white text-xs font-bold border border-slate-700 shrink-0">
              {match.player2Name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-center">
        <MatchStatusBadge status={match.status} />
      </div>
    </div>
  );
}

export function MatchweekFixtures({
  matchweeks, currentWeek, onWeekChange, highlightUserId, onMatchClick,
}: MatchweekFixturesProps) {
  const activeMatchweek = matchweeks.find((mw) => mw.week === currentWeek);
  const totalWeeks = matchweeks.length;

  if (matchweeks.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No fixtures generated yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onWeekChange(Math.max(1, currentWeek - 1))}
          disabled={currentWeek <= 1}
          className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold text-white">Matchweek {currentWeek}</div>
          <div className="text-[11px] text-slate-500">of {totalWeeks} weeks</div>
        </div>
        <button
          onClick={() => onWeekChange(Math.min(totalWeeks, currentWeek + 1))}
          disabled={currentWeek >= totalWeeks}
          className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Week quick-jump pills */}
      <div className="flex gap-1.5 flex-wrap">
        {matchweeks.map((mw) => (
          <button
            key={mw.week}
            onClick={() => onWeekChange(mw.week)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
              mw.week === currentWeek
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {mw.week}
          </button>
        ))}
      </div>

      {/* Fixtures list */}
      {activeMatchweek && activeMatchweek.matches.length > 0 ? (
        <div className="space-y-2.5">
          {activeMatchweek.matches.map((match) => (
            <MatchCard
              key={match.matchId}
              match={match}
              highlightUserId={highlightUserId}
              onClick={onMatchClick ? () => onMatchClick(match.matchId) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 text-sm">
          No matches for this matchweek.
        </div>
      )}
    </div>
  );
}
