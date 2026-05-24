import { useState, useEffect } from 'react';
import {
  X, Loader2, AlertTriangle, Shield, Trophy, CheckCircle2,
  ExternalLink, Gavel, Clock, Swords, Play, UserX, XCircle, ChevronDown, Edit3, Gamepad2,
} from 'lucide-react';
import { tournamentService } from '../../services/tournament.service';
import type { FullMatch } from '../../services/tournament.service';
import { organizerService } from '../../services/organizer.service';
import { MatchActionModal } from './MatchActionModal';

interface Props {
  matchId: string;
  currentUserId?: string;
  currentMatchweek?: number;
  onClose: () => void;
  onActionComplete: () => void;
}

function PlayerCard({
  name, isWinner, isLoser, selected, onClick,
}: {
  name: string; isWinner?: boolean; isLoser?: boolean;
  selected?: boolean; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${selected ? 'border-cyan-500 bg-cyan-950/40'
          : isWinner ? 'border-emerald-500/60 bg-emerald-950/20'
          : isLoser ? 'border-slate-700/40 bg-slate-900/20 opacity-40'
          : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'}
      `}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border
        ${selected ? 'bg-cyan-500 text-slate-950 border-cyan-400'
          : isWinner ? 'bg-emerald-800 text-white border-emerald-600'
          : 'bg-linear-to-br from-cyan-800 to-indigo-800 text-white border-slate-600'}`}>
        {name.charAt(0).toUpperCase()}
      </div>
      <span className={`text-xs font-semibold truncate w-full text-center
        ${selected ? 'text-cyan-300' : isWinner ? 'text-emerald-300' : 'text-slate-300'}`}>
        {name}
      </span>
      {isWinner && <span className="text-[10px] text-emerald-400 font-bold">Winner</span>}
      {selected && <span className="text-[10px] text-cyan-400 font-bold">Select</span>}
    </button>
  );
}

export function OrganizerMatchModal({ matchId, currentUserId, currentMatchweek, onClose, onActionComplete }: Props) {
  const [match, setMatch] = useState<FullMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  // Resolve form state
  const [resolveWinnerId, setResolveWinnerId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');

  // Organizer action state
  const [forfeitPlayerId, setForfeitPlayerId] = useState<string | null>(null);
  const [showForfeit, setShowForfeit] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showSetScore, setShowSetScore] = useState(false);
  const [setScoreVal1, setSetScoreVal1] = useState('');
  const [setScoreVal2, setSetScoreVal2] = useState('');
  const [setScoreReason, setSetScoreReason] = useState('');

  useEffect(() => {
    tournamentService.getMatch(matchId).then(data => {
      if (!data) setError('Could not load match details.');
      setMatch(data);
      setLoading(false);
    });
  }, [matchId]);

  async function handleResolve() {
    if (!resolveWinnerId || !resolution.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await tournamentService.resolveMatchDispute(matchId, resolveWinnerId, resolution);
      onActionComplete();
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to resolve dispute.');
      setSubmitting(false);
    }
  }

  async function handleStart() {
    setSubmitting(true);
    setError(null);
    try {
      await organizerService.startMatch(matchId);
      onActionComplete();
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to start match.');
      setSubmitting(false);
    }
  }

  async function handleForfeit() {
    if (!forfeitPlayerId) return;
    setSubmitting(true);
    setError(null);
    try {
      await organizerService.forfeitMatch(matchId, forfeitPlayerId);
      onActionComplete();
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to forfeit match.');
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    setSubmitting(true);
    setError(null);
    try {
      await organizerService.cancelMatchById(matchId);
      onActionComplete();
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to cancel match.');
      setSubmitting(false);
    }
  }

  async function handleSetScore() {
    const s1 = parseInt(setScoreVal1, 10);
    const s2 = parseInt(setScoreVal2, 10);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await organizerService.setMatchScore(matchId, s1, s2, setScoreReason);
      onActionComplete();
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to set score.');
      setSubmitting(false);
    }
  }

  function renderContent() {
    if (!match) return null;

    const p1Won = match.winnerId === match.player1Id;
    const p2Won = match.winnerId === match.player2Id;

    // ── DISPUTED ──────────────────────────────────────────────────────────
    if (match.status === 'disputed') {
      return (
        <div className="space-y-4">
          {/* Dispute banner */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-900/20 border border-amber-700/40">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Match Disputed</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                A player has raised a dispute. Review and pick the winner.
              </p>
            </div>
          </div>

          {/* Players */}
          <div className="flex gap-3">
            <PlayerCard
              name={match.player1Name}
              selected={resolveWinnerId === match.player1Id}
              onClick={() => setResolveWinnerId(match.player1Id)}
            />
            <div className="flex items-center justify-center shrink-0">
              <span className="text-slate-600 font-bold text-sm">VS</span>
            </div>
            <PlayerCard
              name={match.player2Name}
              selected={resolveWinnerId === match.player2Id}
              onClick={() => setResolveWinnerId(match.player2Id)}
            />
          </div>

          {/* Scores reported */}
          {(match.player1Score > 0 || match.player2Score > 0) && (
            <div className="flex items-center justify-center gap-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <span className="text-sm text-slate-400">{match.player1Name}</span>
              <span className="text-lg font-bold text-white tabular-nums">
                {match.player1Score} – {match.player2Score}
              </span>
              <span className="text-sm text-slate-400">{match.player2Name}</span>
            </div>
          )}

          {/* Proof link */}
          {match.screenshotUrl && (
            <a
              href={match.screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View submitted screenshot
            </a>
          )}

          {/* Resolution text */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">
              Resolution explanation <span className="text-red-400">*</span>
            </label>
            <textarea
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              placeholder="Explain your decision (players will be notified)..."
              rows={3}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleResolve}
            disabled={submitting || !resolveWinnerId || !resolution.trim()}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
            Resolve Dispute
          </button>
        </div>
      );
    }

    // ── COMPLETED ─────────────────────────────────────────────────────────
    if (match.status === 'completed') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 py-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Match Finalised</span>
          </div>

          <div className="flex gap-3">
            <PlayerCard name={match.player1Name} isWinner={p1Won} isLoser={p2Won} />
            <div className="flex flex-col items-center justify-center gap-1 shrink-0">
              <span className="text-2xl font-bold text-white tabular-nums">{match.player1Score}</span>
              <span className="text-slate-600 text-xs">–</span>
              <span className="text-2xl font-bold text-white tabular-nums">{match.player2Score}</span>
            </div>
            <PlayerCard name={match.player2Name} isWinner={p2Won} isLoser={p1Won} />
          </div>

          {match.screenshotUrl && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Proof</p>
              <a
                href={match.screenshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-lg overflow-hidden border border-slate-700 hover:border-cyan-700 transition-colors"
              >
                <img
                  src={match.screenshotUrl}
                  alt="Match proof"
                  className="w-full h-32 object-cover group-hover:opacity-90 transition-opacity"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
                <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 text-xs text-cyan-400">
                  <ExternalLink className="w-3 h-3" />
                  View full screenshot
                </div>
              </a>
            </div>
          )}

          {/* Override score on completed match */}
          <div className="border-t border-slate-800 pt-3">
            <button
              onClick={() => setShowSetScore((v) => !v)}
              className="w-full flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-sm font-semibold hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all"
            >
              <span className="flex items-center gap-2.5">
                <Edit3 className="w-4 h-4" />
                Override Score
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSetScore ? 'rotate-180' : ''}`} />
            </button>
            {showSetScore && (
              <div className="mt-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-3">
                <p className="text-xs text-slate-400">Overwrite the recorded score for this match.</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] text-slate-500 font-medium truncate">{match.player1Name}</p>
                    <input
                      type="number"
                      min={0}
                      value={setScoreVal1}
                      onChange={e => setSetScoreVal1(e.target.value)}
                      placeholder={String(match.player1Score)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <span className="text-slate-600 font-bold text-sm mt-4">–</span>
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] text-slate-500 font-medium truncate">{match.player2Name}</p>
                    <input
                      type="number"
                      min={0}
                      value={setScoreVal2}
                      onChange={e => setSetScoreVal2(e.target.value)}
                      placeholder={String(match.player2Score)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={setScoreReason}
                  onChange={e => setSetScoreReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button
                  onClick={handleSetScore}
                  disabled={submitting || setScoreVal1 === '' || setScoreVal2 === ''}
                  className="w-full py-2 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-400 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
                  Confirm Override
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── DEFAULT (pending / scheduled / ongoing) ──────────────────────────
    const isOngoing = match.status === 'ongoing' || match.status === 'ready_check';
    const StatusIcon = isOngoing ? Swords : Clock;
    const statusColor = isOngoing ? 'text-cyan-400' : 'text-slate-400';

    return (
      <div className="space-y-4">
        {/* Status + players */}
        <div className="flex flex-col items-center gap-1.5 py-1">
          <StatusIcon className={`w-7 h-7 ${statusColor}`} />
          <p className="text-sm font-semibold text-white capitalize">{match.status.replace('_', ' ')}</p>
          {match.scheduledAt && (
            <p className="text-xs text-slate-500">
              {new Date(match.scheduledAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <PlayerCard name={match.player1Name} />
          <div className="flex items-center justify-center shrink-0">
            <span className="text-slate-500 text-xs font-semibold px-2">VS</span>
          </div>
          <PlayerCard name={match.player2Name} />
        </div>

        {/* ── Player actions (when organizer is also a participant) ── */}
        {currentUserId && (match.player1Id === currentUserId || match.player2Id === currentUserId) && (
          <div className="border-t border-slate-800 pt-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Your Match</p>
            <button
              onClick={() => setShowPlayerModal(true)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all"
            >
              <Gamepad2 className="w-4 h-4" />
              Submit / View as Player
            </button>
          </div>
        )}

        {/* ── Organizer actions ── */}
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Organizer Actions</p>

          {/* Start match */}
          {!isOngoing && (
            <button
              onClick={handleStart}
              disabled={submitting}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-sm font-semibold hover:bg-cyan-500/25 hover:border-cyan-500/50 disabled:opacity-50 transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Match Now
            </button>
          )}

          {/* Set Score */}
          <div>
            <button
              onClick={() => setShowSetScore((v) => !v)}
              className="w-full flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-sm font-semibold hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all"
            >
              <span className="flex items-center gap-2.5">
                <Edit3 className="w-4 h-4" />
                Set Score Manually
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSetScore ? 'rotate-180' : ''}`} />
            </button>
            {showSetScore && (
              <div className="mt-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-3">
                <p className="text-xs text-slate-400">Enter the final score for each player.</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] text-slate-500 font-medium truncate">{match?.player1Name}</p>
                    <input
                      type="number"
                      min={0}
                      value={setScoreVal1}
                      onChange={e => setSetScoreVal1(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <span className="text-slate-600 font-bold text-sm mt-4">–</span>
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] text-slate-500 font-medium truncate">{match?.player2Name}</p>
                    <input
                      type="number"
                      min={0}
                      value={setScoreVal2}
                      onChange={e => setSetScoreVal2(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={setScoreReason}
                  onChange={e => setSetScoreReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleSetScore}
                  disabled={submitting || setScoreVal1 === '' || setScoreVal2 === ''}
                  className="w-full py-2 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-400 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
                  Confirm Score
                </button>
              </div>
            )}
          </div>

          {/* Forfeit (no-show) */}
          <div>
            <button
              onClick={() => setShowForfeit((v) => !v)}
              className="w-full flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm font-semibold hover:bg-amber-500/20 hover:border-amber-500/40 transition-all"
            >
              <span className="flex items-center gap-2.5">
                <UserX className="w-4 h-4" />
                Forfeit — No Show
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showForfeit ? 'rotate-180' : ''}`} />
            </button>
            {showForfeit && (
              <div className="mt-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2">
                <p className="text-xs text-slate-400">Which player failed to show up?</p>
                <div className="flex gap-2">
                  {[
                    { id: match.player1Id, name: match.player1Name },
                    { id: match.player2Id, name: match.player2Name },
                  ].map(({ id, name }) => (
                    <button
                      key={id}
                      onClick={() => setForfeitPlayerId(id)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        forfeitPlayerId === id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleForfeit}
                  disabled={submitting || !forfeitPlayerId}
                  className="w-full py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                  Confirm Forfeit
                </button>
              </div>
            )}
          </div>

          {/* Cancel match */}
          <div>
            <button
              onClick={() => setShowCancel((v) => !v)}
              className="w-full flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/15 hover:border-red-500/35 transition-all"
            >
              <span className="flex items-center gap-2.5">
                <XCircle className="w-4 h-4" />
                Cancel Match
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showCancel ? 'rotate-180' : ''}`} />
            </button>
            {showCancel && (
              <div className="mt-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2">
                <p className="text-xs text-slate-400">This will void the match result. Are you sure?</p>
                <button
                  onClick={handleCancel}
                  disabled={submitting}
                  className="w-full py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Yes, Cancel Match
                </button>
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-400 pt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            {match?.status === 'disputed'
              ? <Shield className="w-4 h-4 text-amber-400" />
              : match?.status === 'completed'
                ? <Trophy className="w-4 h-4 text-amber-400" />
                : <Swords className="w-4 h-4 text-cyan-400" />
            }
            <span className="text-sm font-semibold text-white">
              {match?.matchweek !== undefined ? `Matchweek ${match.matchweek}` : 'Match'}
              {match?.status === 'disputed' && <span className="ml-2 text-[10px] text-amber-400 font-bold uppercase">Disputed</span>}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading match…</span>
            </div>
          ) : error && !match ? (
            <div className="text-center py-6">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : renderContent()}
        </div>
      </div>

      {/* Nested player modal — rendered on top when organizer acts as player */}
      {showPlayerModal && currentUserId && (
        <MatchActionModal
          matchId={matchId}
          currentUserId={currentUserId}
          currentMatchweek={currentMatchweek}
          onClose={() => setShowPlayerModal(false)}
          onActionComplete={() => {
            setShowPlayerModal(false);
            onActionComplete();
          }}
        />
      )}
    </div>
  );
}
