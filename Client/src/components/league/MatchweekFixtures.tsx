import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Swords, AlertCircle, CalendarClock } from 'lucide-react';
import type { LeagueMatchweek, LeagueMatch } from '../../services/tournament.service';
import { FadeImage } from '../ui/FadeImage';

interface MatchweekFixturesProps {
  matchweeks: LeagueMatchweek[];
  currentWeek: number;
  onWeekChange: (week: number) => void;
  highlightUserId?: string;
  onMatchClick?: (matchId: string) => void;
}

// ── Status badge ──────────────────────────────────────────────────────────────
function MatchStatusBadge({ status }: { status: string }) {
  if (status === 'completed') return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
      <CheckCircle2 className="w-3 h-3" /> Final
    </span>
  );
  if (status === 'disputed') return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
      <AlertCircle className="w-3 h-3" /> Disputed
    </span>
  );
  if (status === 'ongoing' || status === 'ready_check') return (
    <span className="flex items-center gap-1 text-[11px] font-bold text-orange-400 animate-pulse">
      <Swords className="w-3 h-3" /> Live
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[11px] text-slate-500">
      <Clock className="w-3 h-3" /> Scheduled
    </span>
  );
}

// ── Deadline ──────────────────────────────────────────────────────────────────
function formatDeadline(iso: string) {
  const date = new Date(iso);
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return 'Deadline passed';
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 24) return `${diffH}h left`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d · ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function needsAction(match: LeagueMatch, userId?: string) {
  if (!userId) return false;
  return (match.player1Id === userId || match.player2Id === userId) &&
    (match.status === 'ongoing' || match.status === 'ready_check');
}

// ── Player cell ───────────────────────────────────────────────────────────────
function PlayerCell({ name, avatar, isMe, isWinner, isLoser, align }: {
  name: string; avatar?: string; isMe: boolean; isWinner: boolean; isLoser: boolean; align: 'left' | 'right';
}) {
  const initials = name.charAt(0).toUpperCase();
  const nameEl = (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <span className={`text-sm font-semibold block truncate ${
        isMe ? 'text-orange-300' : isWinner ? 'text-white' : 'text-slate-300'
      }`}>
        {name}
      </span>
      {isMe && <span className="text-[10px] text-orange-500 font-bold">(you)</span>}
    </div>
  );
  const avatarEl = avatar ? (
    <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-700 shrink-0 relative bg-slate-800">
      <FadeImage src={avatar} alt={name} className="absolute inset-0 w-full h-full object-cover" />
    </div>
  ) : (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold border border-slate-700 shrink-0 ${
      align === 'left'
        ? 'bg-linear-to-br from-orange-800 to-amber-800'
        : 'bg-linear-to-br from-violet-800 to-indigo-800'
    }`}>
      {initials}
    </div>
  );

  return (
    <div className={`flex items-center gap-2.5 flex-1 ${isLoser ? 'opacity-40' : ''} ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      {avatarEl}
      {nameEl}
    </div>
  );
}

// ── Match card ────────────────────────────────────────────────────────────────
function MatchCard({ match, highlightUserId, onClick }: {
  match: LeagueMatch; highlightUserId?: string; onClick?: () => void;
}) {
  const isCompleted = match.status === 'completed';
  const isP1Winner = isCompleted && match.winnerId === match.player1Id;
  const isP2Winner = isCompleted && match.winnerId === match.player2Id;
  const involvesMeP1 = !!highlightUserId && match.player1Id === highlightUserId;
  const involvesMeP2 = !!highlightUserId && match.player2Id === highlightUserId;
  const involvesMe = involvesMeP1 || involvesMeP2;
  const actionNeeded = needsAction(match, highlightUserId);

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl border transition-all ${onClick ? 'cursor-pointer' : ''} ${
        involvesMe
          ? 'bg-orange-950/25 border-orange-500/25 hover:border-orange-500/50 hover:bg-orange-950/40'
          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
      } ${actionNeeded ? 'ring-1 ring-orange-500/40' : ''}`}
    >
      {/* Action needed pulse */}
      {actionNeeded && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
        </span>
      )}

      <div className="px-4 pt-4 pb-3">
        {/* Players row */}
        <div className="flex items-center gap-3">
          <PlayerCell
            name={match.player1Name} avatar={match.player1Avatar}
            isMe={involvesMeP1} isWinner={isP1Winner} isLoser={isP2Winner}
            align="left"
          />

          {/* Score / VS */}
          <div className="shrink-0 flex items-center gap-2">
            {isCompleted && match.score1 !== undefined ? (
              <div className="flex items-center gap-1.5">
                <span className={`text-2xl font-display font-bold w-8 text-center tabular-nums ${isP1Winner ? 'text-white' : 'text-slate-500'}`}>
                  {match.score1}
                </span>
                <span className="text-slate-600 text-sm font-bold">–</span>
                <span className={`text-2xl font-display font-bold w-8 text-center tabular-nums ${isP2Winner ? 'text-white' : 'text-slate-500'}`}>
                  {match.score2}
                </span>
              </div>
            ) : (
              <div className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="text-xs font-bold text-slate-400 tracking-widest">VS</span>
              </div>
            )}
          </div>

          <PlayerCell
            name={match.player2Name} avatar={match.player2Avatar}
            isMe={involvesMeP2} isWinner={isP2Winner} isLoser={isP1Winner}
            align="right"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/60">
          <MatchStatusBadge status={match.status} />
          {match.playDeadline && match.status !== 'completed' && match.status !== 'cancelled' && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <CalendarClock className="w-3 h-3" />
              <span>{formatDeadline(match.playDeadline)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function MatchweekFixtures({ matchweeks, currentWeek, onWeekChange, highlightUserId, onMatchClick }: MatchweekFixturesProps) {
  const activeMatchweek = matchweeks.find((mw) => mw.week === currentWeek);
  const totalWeeks = matchweeks.length;

  if (matchweeks.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border border-dashed border-slate-700 text-slate-500 text-sm">
        No fixtures generated yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onWeekChange(Math.max(1, currentWeek - 1))}
          disabled={currentWeek <= 1}
          className="p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 text-center">
          <p className="text-base font-display font-bold text-white">Matchweek {currentWeek}</p>
          <p className="text-[11px] text-slate-500">{totalWeeks} weeks total</p>
        </div>

        <button
          onClick={() => onWeekChange(Math.min(totalWeeks, currentWeek + 1))}
          disabled={currentWeek >= totalWeeks}
          className="p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Week quick-jump pills */}
      {totalWeeks > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {matchweeks.map((mw) => (
            <button
              key={mw.week}
              onClick={() => onWeekChange(mw.week)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mw.week === currentWeek
                  ? 'bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 shadow shadow-orange-500/20'
                  : 'bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              W{mw.week}
            </button>
          ))}
        </div>
      )}

      {/* Fixtures */}
      {activeMatchweek && activeMatchweek.matches.length > 0 ? (
        <div className="space-y-3">
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
        <div className="text-center py-10 rounded-2xl border border-dashed border-slate-700 text-slate-500 text-sm">
          No matches for this matchweek.
        </div>
      )}
    </div>
  );
}
