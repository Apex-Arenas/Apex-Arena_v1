import { useState, useEffect, useRef } from 'react';
import {
  X, Loader2, CheckCircle2, AlertTriangle, Swords, Clock,
  Shield, Trophy, CheckCheck, Flag, Timer,
} from 'lucide-react';
import { tournamentService } from '../../services/tournament.service';
import type { FullMatch } from '../../services/tournament.service';
import ImageUploadDropzone from '../ImageUploadDropzone';

interface Props {
  matchId: string;
  currentUserId: string;
  currentMatchweek?: number; // if provided, used to block submission for inactive matchweeks
  onClose: () => void;
  onActionComplete: () => void;
}

// ─── Countdown hook ──────────────────────────────────────────────────────────

function useCountdown(deadline: string | undefined) {
  const remaining = () => {
    if (!deadline) return null;
    const ms = new Date(deadline).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  };

  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    // Update immediately when deadline changes
    setSeconds(remaining());
    if (!deadline) return;
    const id = setInterval(() => {
      const rem = remaining();
      setSeconds(rem);
      if (rem === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  return seconds;
}

function CountdownBadge({ seconds, label }: { seconds: number | null; label: string }) {
  if (seconds === null) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isUrgent = seconds <= 60;
  return (
    <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
      ${isUrgent ? 'bg-red-900/40 border border-red-700/50 text-red-300' : 'bg-slate-800/60 border border-slate-700 text-slate-300'}`}>
      <Timer className={`w-3.5 h-3.5 ${isUrgent ? 'text-red-400' : 'text-cyan-400'}`} />
      {label} {mins}:{String(secs).padStart(2, '0')}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PlayerCard({
  name, isWinner, isLoser, dimmed, highlight, selected, onClick,
}: {
  name: string; isWinner?: boolean; isLoser?: boolean; dimmed?: boolean;
  highlight?: boolean; selected?: boolean; onClick?: () => void;
}) {
  const initial = name.charAt(0).toUpperCase() || '?';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${selected
          ? 'border-cyan-500 bg-cyan-950/40'
          : isWinner
            ? 'border-emerald-500/60 bg-emerald-950/20'
            : isLoser
              ? 'border-red-500/30 bg-red-950/10 opacity-40'
              : dimmed
                ? 'border-slate-700/40 opacity-40'
                : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
        }
        ${highlight ? 'ring-1 ring-cyan-500/40' : ''}
      `}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold border
        ${selected ? 'bg-cyan-500 text-slate-950 border-cyan-400'
          : isWinner ? 'bg-emerald-800 text-white border-emerald-600'
          : 'bg-gradient-to-br from-cyan-800 to-indigo-800 text-white border-slate-600'}
      `}>
        {initial}
      </div>
      <span className={`text-xs font-semibold text-center truncate w-full
        ${selected ? 'text-cyan-300' : isWinner ? 'text-emerald-300' : 'text-slate-300'}`}>
        {name}
      </span>
      {highlight && <span className="text-[10px] text-cyan-500 font-semibold">(you)</span>}
      {isWinner && <span className="text-[10px] text-emerald-400 font-semibold">Winner</span>}
      {selected && <span className="text-[10px] text-cyan-400 font-semibold">Selected</span>}
    </button>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

export function MatchActionModal({ matchId, currentUserId, currentMatchweek, onClose, onActionComplete }: Props) {
  const [match, setMatch] = useState<FullMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoConfirmedRef = useRef(false);

  // Submit result state
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');

  // Dispute state
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const scoresEqual = score1 !== '' && score2 !== '' && Number(score1) === Number(score2);

  const countdown = useCountdown(match?.resultConfirmationDeadline);

  async function load() {
    setLoading(true);
    setError(null);
    const data = await tournamentService.getMatch(matchId);
    if (!data) setError('Could not load match details.');
    setMatch(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [matchId]);

  // Poll every 15s while a result is pending confirmation (so submitter sees when opponent confirms)
  useEffect(() => {
    if (!match?.resultReportedBy) return;
    if (match.status === 'completed' || match.status === 'disputed') return;
    const id = setInterval(() => { load(); }, 15_000);
    return () => clearInterval(id);
  }, [match?.resultReportedBy, match?.status]);

  // Auto-clear draw selection if scores change to be unequal
  useEffect(() => {
    if (isDraw && !scoresEqual) setIsDraw(false);
  }, [score1, score2]);

  // Auto-confirm when countdown hits exactly 0
  useEffect(() => {
    if (countdown !== 0 || autoConfirmedRef.current) return;
    if (!match?.resultReportedBy) return;
    if (match.status === 'completed' || match.status === 'disputed') return;
    autoConfirmedRef.current = true;
    tournamentService.autoConfirmMatch(matchId)
      .then(() => { onActionComplete(); onClose(); })
      .catch(() => { load(); }); // refresh state if it fails (e.g. already confirmed)
  }, [countdown]);

  async function doAction(action: () => Promise<void>) {
    setSubmitting(true);
    setError(null);
    try {
      await action();
      onActionComplete();
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
      setSubmitting(false);
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const isP1 = match?.player1Id === currentUserId;
  const isP2 = match?.player2Id === currentUserId;
  const iParticipant = isP1 || isP2;
  const myName = isP1 ? match?.player1Name : match?.player2Name;
  const opponentName = isP1 ? match?.player2Name : match?.player1Name;
  const myIsReady = isP1 ? match?.player1IsReady : match?.player2IsReady;
  const opponentIsReady = isP1 ? match?.player2IsReady : match?.player1IsReady;
  const iSubmitted = match?.resultReportedBy === currentUserId;
  const opponentSubmitted = !!match?.resultReportedBy && !iSubmitted;
  const reportedWinner = match?.winnerId;
  const reportedWinnerName =
    reportedWinner === match?.player1Id ? match?.player1Name :
    reportedWinner === match?.player2Id ? match?.player2Name : 'Unknown';

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderContent() {
    if (!match) return null;

    // ── COMPLETED ─────────────────────────────────────────────────────────
    if (match.status === 'completed') {
      const p1Won = match.winnerId === match.player1Id;
      const p2Won = match.winnerId === match.player2Id;
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 py-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-semibold text-white">Final Result</span>
          </div>
          <div className="flex gap-3">
            <PlayerCard name={match.player1Name} isWinner={p1Won} isLoser={p2Won}
              highlight={isP1} />
            <div className="flex flex-col items-center justify-center gap-1 shrink-0">
              <span className="text-2xl font-bold text-white tabular-nums">
                {match.player1Score}
              </span>
              <span className="text-slate-600 text-xs">–</span>
              <span className="text-2xl font-bold text-white tabular-nums">
                {match.player2Score}
              </span>
            </div>
            <PlayerCard name={match.player2Name} isWinner={p2Won} isLoser={p1Won}
              highlight={isP2} />
          </div>
          <p className="text-center text-xs text-slate-500 pt-1">Match finalised.</p>
        </div>
      );
    }

    // ── DISPUTED ──────────────────────────────────────────────────────────
    if (match.status === 'disputed') {
      return (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Shield className="w-10 h-10 text-amber-400" />
          <p className="text-sm font-semibold text-white">Dispute Under Review</p>
          <p className="text-xs text-slate-400 max-w-xs">
            The organizer has been notified and will review the evidence to determine the winner.
          </p>
        </div>
      );
    }

    // ── CANCELLED ─────────────────────────────────────────────────────────
    if (match.status === 'cancelled') {
      return (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <X className="w-10 h-10 text-slate-500" />
          <p className="text-sm text-slate-400">This match was cancelled.</p>
        </div>
      );
    }

    // ── READY CHECK ───────────────────────────────────────────────────────
    if (match.status === 'ready_check') {
      if (!iParticipant) {
        return (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Clock className="w-8 h-8 text-slate-500" />
            <p className="text-sm text-slate-400">Players are checking in for this match.</p>
          </div>
        );
      }
      return (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className={`flex-1 flex items-center gap-2 p-3 rounded-xl border
              ${myIsReady ? 'border-emerald-600/50 bg-emerald-950/20' : 'border-slate-700 bg-slate-900/40'}`}>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${myIsReady ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className="text-xs text-slate-300 font-medium truncate">{myName} (you)</span>
              <span className={`ml-auto text-[10px] font-bold ${myIsReady ? 'text-emerald-400' : 'text-slate-500'}`}>
                {myIsReady ? 'READY' : 'NOT READY'}
              </span>
            </div>
            <div className={`flex-1 flex items-center gap-2 p-3 rounded-xl border
              ${opponentIsReady ? 'border-emerald-600/50 bg-emerald-950/20' : 'border-slate-700 bg-slate-900/40'}`}>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opponentIsReady ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className="text-xs text-slate-300 font-medium truncate">{opponentName}</span>
              <span className={`ml-auto text-[10px] font-bold ${opponentIsReady ? 'text-emerald-400' : 'text-slate-500'}`}>
                {opponentIsReady ? 'READY' : 'WAITING'}
              </span>
            </div>
          </div>
          {!myIsReady ? (
            <button
              onClick={() => doAction(() => tournamentService.markReady(matchId))}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Mark as Ready
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>You're ready! Waiting for opponent…</span>
            </div>
          )}
        </div>
      );
    }

    // ── ONGOING / SCHEDULED / PENDING ─────────────────────────────────────
    if (match.status === 'ongoing' || match.status === 'scheduled' || match.status === 'pending') {
      // Non-participant view
      if (!iParticipant) {
        return (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Swords className="w-8 h-8 text-cyan-500" />
            <p className="text-sm text-slate-400">Match is currently in progress.</p>
          </div>
        );
      }

      // ── Opponent submitted — confirm or dispute ────────────────────────
      if (opponentSubmitted && !showDisputeForm) {
        const isReportedDraw = !reportedWinner;
        const opponentSaysIWon = reportedWinner === currentUserId;
        return (
          <div className="space-y-4">
            {/* Result summary */}
            <div className={`rounded-xl p-3 border text-center text-sm
              ${isReportedDraw
                ? 'border-slate-600/40 bg-slate-800/40 text-slate-300'
                : opponentSaysIWon
                  ? 'border-emerald-600/40 bg-emerald-950/20 text-emerald-300'
                  : 'border-amber-600/40 bg-amber-950/20 text-amber-300'}`}>
              {opponentName} reported:{' '}
              <span className="font-bold">{isReportedDraw ? 'Draw' : `${reportedWinnerName} won`}</span>
            </div>

            {/* Submitted scores */}
            {(match.player1Score > 0 || match.player2Score > 0) && (
              <div className="flex items-center justify-center gap-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <span className="text-xs text-slate-400">{match.player1Name}</span>
                <span className="text-xl font-bold text-white tabular-nums">
                  {match.player1Score} – {match.player2Score}
                </span>
                <span className="text-xs text-slate-400">{match.player2Name}</span>
              </div>
            )}

            {/* Countdown */}
            <div className="flex justify-center">
              {countdown !== null && countdown > 0 ? (
                <CountdownBadge seconds={countdown} label="Auto-confirms in" />
              ) : countdown === 0 ? (
                <div className="text-xs text-slate-400 text-center">Auto-confirming…</div>
              ) : null}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => doAction(() => tournamentService.confirmMatchResult(matchId))}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                Confirm
              </button>
              <button
                onClick={() => setShowDisputeForm(true)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-red-800/60 hover:bg-red-700/60 border border-red-700/50 text-red-300 font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Flag className="w-4 h-4" />
                Dispute
              </button>
            </div>
          </div>
        );
      }

      // ── Dispute form ──────────────────────────────────────────────────
      if (showDisputeForm) {
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-400 text-sm font-semibold">
              <Flag className="w-4 h-4" />
              Dispute Result
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Reason <span className="text-red-400">*</span></label>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder="Explain why you're disputing this result..."
                rows={3}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">
                Evidence screenshot <span className="text-slate-600 text-[10px]">optional</span>
              </label>
              <ImageUploadDropzone
                value={evidenceUrl}
                onChange={setEvidenceUrl}
                folder={`match-dispute/${matchId}`}
                disabled={submitting}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowDisputeForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => doAction(() =>
                  tournamentService.disputeMatchResult(
                    matchId,
                    disputeReason,
                    evidenceUrl ? [evidenceUrl] : undefined,
                  )
                )}
                disabled={submitting || !disputeReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                Submit Dispute
              </button>
            </div>
          </div>
        );
      }

      // ── I submitted — waiting for opponent ────────────────────────────
      if (iSubmitted) {
        const submittedAsDraw = !match.winnerId && !!match.resultReportedBy;
        return (
          <div className="space-y-4">
            {/* Submitted scores / result */}
            <div className="flex items-center justify-center gap-3 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              {submittedAsDraw ? (
                <span className="text-sm font-bold text-slate-300">⚖️ Draw</span>
              ) : (
                <>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 mb-1">{match.player1Name}</p>
                    <span className="text-2xl font-bold text-white tabular-nums">{match.player1Score}</span>
                  </div>
                  <span className="text-slate-600 font-bold">–</span>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 mb-1">{match.player2Name}</p>
                    <span className="text-2xl font-bold text-white tabular-nums">{match.player2Score}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm font-semibold text-white">Result Submitted</p>
              <p className="text-xs text-slate-400">
                Waiting for <span className="text-slate-200">{opponentName}</span> to confirm or dispute.
              </p>
              {countdown !== null && countdown > 0 ? (
                <CountdownBadge seconds={countdown} label="Auto-confirms in" />
              ) : countdown === 0 ? (
                <div className="text-xs text-cyan-400">Auto-confirming…</div>
              ) : null}
            </div>
          </div>
        );
      }

      // ── TBD participant — opponent not yet assigned ───────────────────
      const hasTbd = !match.player1Id || !match.player2Id ||
        match.player1Name === 'TBD' || match.player2Name === 'TBD';

      if (hasTbd) {
        return (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Clock className="w-10 h-10 text-slate-500" />
            <p className="text-sm font-semibold text-white">Waiting for Opponent</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Your opponent hasn't been assigned yet. Results can only be submitted once both players are confirmed.
            </p>
          </div>
        );
      }

      // ── Matchweek not yet activated ───────────────────────────────────
      const matchweekNotActive =
        currentMatchweek !== undefined &&
        match.matchweek !== undefined &&
        match.matchweek > currentMatchweek;

      if (matchweekNotActive) {
        return (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Clock className="w-10 h-10 text-slate-500" />
            <p className="text-sm font-semibold text-white">Matchweek Not Active</p>
            <p className="text-xs text-slate-400 max-w-xs">
              The organizer hasn't advanced to Week {match.matchweek} yet. Results can only be
              submitted once the organizer activates this matchweek.
            </p>
          </div>
        );
      }

      // ── Submit result form ────────────────────────────────────────────
      return (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 text-center">Select the winner — or mark as a draw</p>
          <div className="flex gap-3">
            <PlayerCard
              name={match.player1Name}
              highlight={isP1}
              selected={!isDraw && selectedWinnerId === match.player1Id}
              dimmed={isDraw}
              onClick={() => { setIsDraw(false); setSelectedWinnerId(match.player1Id); }}
            />
            <div className="flex items-center justify-center shrink-0">
              <span className="text-slate-600 font-bold text-sm">VS</span>
            </div>
            <PlayerCard
              name={match.player2Name}
              highlight={isP2}
              selected={!isDraw && selectedWinnerId === match.player2Id}
              dimmed={isDraw}
              onClick={() => { setIsDraw(false); setSelectedWinnerId(match.player2Id); }}
            />
          </div>

          {/* Draw button */}
          <button
            type="button"
            onClick={() => { setIsDraw(true); setSelectedWinnerId(null); }}
            disabled={!scoresEqual}
            title={!scoresEqual ? 'Enter equal scores to mark as a draw (e.g. 1–1, 2–2)' : undefined}
            className={`w-full py-2 rounded-xl border text-sm font-semibold transition-all ${
              isDraw
                ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                : scoresEqual
                  ? 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                  : 'border-slate-800 text-slate-700 cursor-not-allowed opacity-50'
            }`}
          >
            {isDraw ? '⚖️ Draw Selected' : 'It was a Draw'}
            {!scoresEqual && score1 !== '' && score2 !== '' && (
              <span className="ml-2 text-[10px] font-normal">(scores must be equal)</span>
            )}
          </button>

          {/* Scores */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">
              Score <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-500 truncate w-full text-center">{match.player1Name}</span>
                <input
                  type="number"
                  min="0"
                  value={score1}
                  onChange={e => setScore1(e.target.value)}
                  placeholder="0"
                  className="w-full text-center bg-slate-800/60 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <span className="text-slate-600 font-bold text-sm shrink-0 mt-4">–</span>
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-500 truncate w-full text-center">{match.player2Name}</span>
                <input
                  type="number"
                  min="0"
                  value={score2}
                  onChange={e => setScore2(e.target.value)}
                  placeholder="0"
                  className="w-full text-center bg-slate-800/60 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">
              Screenshot proof <span className="text-red-400">*</span>
            </label>
            <ImageUploadDropzone
              value={screenshotUrl}
              onChange={setScreenshotUrl}
              folder={`match-proof/${matchId}`}
              disabled={submitting}
            />
          </div>

          <button
            onClick={() =>
              doAction(() =>
                tournamentService.submitMatchResult(
                  matchId,
                  isDraw ? null : selectedWinnerId!,
                  { screenshots: [screenshotUrl] },
                  { player1: Number(score1), player2: Number(score2) },
                )
              )
            }
            disabled={submitting || (!isDraw && !selectedWinnerId) || !screenshotUrl || score1 === '' || score2 === ''}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
            Submit Result
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <Clock className="w-8 h-8 text-slate-600" />
        <p className="text-sm text-slate-500">Match status: {match.status}</p>
      </div>
    );
  }

  // ── Modal wrapper ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">
              {match?.matchweek !== undefined ? `Matchweek ${match.matchweek}` : 'Match'}
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
          ) : error ? (
            <div className="text-center py-6 space-y-2">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : (
            renderContent()
          )}

          {/* Inline error (after actions) */}
          {!loading && error && match && (
            <p className="mt-3 text-xs text-red-400 text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
