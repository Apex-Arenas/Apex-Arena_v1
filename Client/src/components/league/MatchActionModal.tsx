import { useState, useEffect, useRef } from 'react';
import {
  X, Loader2, AlertTriangle, Swords, Clock,
  Shield, Trophy, CheckCheck, Flag, Timer, Crown, Edit3, ChevronDown,
} from 'lucide-react';
import { tournamentService } from '../../services/tournament.service';
import type { FullMatch } from '../../services/tournament.service';
import ImageUploadDropzone from '../ImageUploadDropzone';
import { organizerService } from '../../services/organizer.service';

interface Props {
  matchId: string;
  currentUserId: string;
  currentMatchweek?: number;
  isOrganizer?: boolean;
  onClose: () => void;
  onActionComplete: () => void;
}

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(deadline: string | undefined) {
  const remaining = () => {
    if (!deadline) return null;
    const ms = new Date(deadline).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  };
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
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
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
      isUrgent
        ? 'bg-red-500/10 border-red-500/30 text-red-300'
        : 'bg-slate-800/60 border-slate-700 text-slate-300'
    }`}>
      <Timer className={`w-3.5 h-3.5 ${isUrgent ? 'text-red-400' : 'text-orange-400'}`} />
      {label} {mins}:{String(secs).padStart(2, '0')}
    </div>
  );
}

// ─── Player Card ──────────────────────────────────────────────────────────────

function PlayerCard({
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

// ─── Score Display ────────────────────────────────────────────────────────────

function parsePenaltyReason(reason?: string) {
  if (!reason) return null;
  const m = reason.match(/Regular time:\s*(\d+)[-\u2013](\d+).*?Penalties:\s*(\d+)[-\u2013](\d+)/i);
  if (!m) return null;
  return { rt1: Number(m[1]), rt2: Number(m[2]), pen1: Number(m[3]), pen2: Number(m[4]) };
}

function ScoreDisplay({ s1, s2, n1, n2, p1Won, p2Won, reason }: {
  s1: number; s2: number; n1: string; n2: string;
  p1Won?: boolean; p2Won?: boolean; reason?: string;
}) {
  const penalty = parsePenaltyReason(reason);

  // For penalty matches show regular time scores; otherwise show stored scores as-is
  const rt1 = penalty ? penalty.rt1 : s1;
  const rt2 = penalty ? penalty.rt2 : s2;
  const h1 = p1Won !== undefined ? p1Won : rt1 > rt2;
  const h2 = p2Won !== undefined ? p2Won : rt2 > rt1;

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

      {/* Penalty scores — separate row */}
      {penalty && (
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
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function MatchActionModal({ matchId, currentUserId, currentMatchweek, isOrganizer, onClose, onActionComplete }: Props) {
  const [match, setMatch] = useState<FullMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoConfirmedRef = useRef(false);

  // Organizer score override
  const [showScoreOverride, setShowScoreOverride] = useState(false);
  const [overrideS1, setOverrideS1] = useState('');
  const [overrideS2, setOverrideS2] = useState('');
  const [overridePenalty1, setOverridePenalty1] = useState('');
  const [overridePenalty2, setOverridePenalty2] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  async function handleScoreOverride() {
    const s1 = parseInt(overrideS1, 10);
    const s2 = parseInt(overrideS2, 10);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return;
    const isDrawScore = s1 === s2;
    const p1 = parseInt(overridePenalty1, 10);
    const p2 = parseInt(overridePenalty2, 10);
    if (isDrawScore && (isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0 || p1 === p2)) return;
    const finalS1 = isDrawScore ? p1 : s1;
    const finalS2 = isDrawScore ? p2 : s2;
    const penaltyNote = isDrawScore ? `Regular time: ${s1}–${s2} · Penalties: ${p1}–${p2}` : '';
    const reason = [penaltyNote, overrideReason].filter(Boolean).join(' · ') || undefined;
    setOverriding(true);
    setOverrideError(null);
    try {
      await organizerService.setMatchScore(matchId, finalS1, finalS2, reason);
      onActionComplete();
      onClose();
    } catch (e: any) {
      setOverrideError(e.message ?? 'Failed to set score.');
      setOverriding(false);
    }
  }

  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [penaltyScore1, setPenaltyScore1] = useState('');
  const [penaltyScore2, setPenaltyScore2] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const scoresEqual = score1 !== '' && score2 !== '' && Number(score1) === Number(score2);
  const countdown = useCountdown(match?.resultConfirmationDeadline);
  const playDeadlineCountdown = useCountdown(match?.playDeadline);

  async function load() {
    setLoading(true);
    setError(null);
    const data = await tournamentService.getMatch(matchId);
    if (!data) setError('Could not load match details.');
    setMatch(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [matchId]);

  useEffect(() => {
    if (!match?.resultReportedBy) return;
    if (match.status === 'completed' || match.status === 'disputed') return;
    const id = setInterval(() => { load(); }, 15_000);
    return () => clearInterval(id);
  }, [match?.resultReportedBy, match?.status]);

  useEffect(() => {
    if (!scoresEqual) {
      if (isDraw) setIsDraw(false);
      setPenaltyScore1('');
      setPenaltyScore2('');
    }
  }, [score1, score2]);

  useEffect(() => {
    if (countdown !== 0 || autoConfirmedRef.current) return;
    if (!match?.resultReportedBy) return;
    if (match.status === 'completed' || match.status === 'disputed') return;
    autoConfirmedRef.current = true;
    tournamentService.autoConfirmMatch(matchId)
      .then(() => { onActionComplete(); onClose(); })
      .catch(() => { load(); });
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

  const isP1 = match?.player1Id === currentUserId;
  const isP2 = match?.player2Id === currentUserId;
  const iParticipant = isP1 || isP2;
  const opponentName = isP1 ? match?.player2Name : match?.player1Name;
  const iSubmitted = match?.resultReportedBy === currentUserId;
  const opponentSubmitted = !!match?.resultReportedBy && !iSubmitted;
  const reportedWinner = match?.winnerId;
  const reportedWinnerName =
    reportedWinner === match?.player1Id ? match?.player1Name :
    reportedWinner === match?.player2Id ? match?.player2Name : 'Unknown';

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const leg1 = match?.legs?.find(l => l.game_number === 1);
  const leg2 = match?.legs?.find(l => l.game_number === 2);
  const penalties = match?.legs?.find(l => l.game_number === 3);
  const leg1P1 = leg1?.scores?.[0]?.score ?? null;
  const leg1P2 = leg1?.scores?.[1]?.score ?? null;
  const leg2P1 = leg2?.scores?.[0]?.score ?? null;
  const leg2P2 = leg2?.scores?.[1]?.score ?? null;
  const penP1 = penalties?.scores?.[0]?.score ?? null;
  const penP2 = penalties?.scores?.[1]?.score ?? null;
  const aggP1 = leg1P1 !== null && leg2P1 !== null ? leg1P1 + leg2P1 : null;
  const aggP2 = leg1P2 !== null && leg2P2 !== null ? leg1P2 + leg2P2 : null;
  const currentLeg = match?.currentLeg ?? 1;
  const isTwoLeg = match?.isTwoLeg ?? false;
  const legLabel = currentLeg === 3 ? 'Penalties' : `Leg ${currentLeg}`;

  function renderScoreInputForm(label: string, accentColor: string) {
    const canDraw = currentLeg !== 3; // penalties must have a winner
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500 text-center">{label}</p>

        <div className="flex gap-3">
          <PlayerCard name={match!.player1Name} highlight={isP1} selected={!isDraw && selectedWinnerId === match!.player1Id} dimmed={isDraw}
            onClick={() => { setIsDraw(false); setSelectedWinnerId(match!.player1Id); }} />
          <div className="flex items-center justify-center shrink-0">
            <span className="text-slate-600 font-bold text-xs uppercase tracking-widest">VS</span>
          </div>
          <PlayerCard name={match!.player2Name} highlight={isP2} selected={!isDraw && selectedWinnerId === match!.player2Id} dimmed={isDraw}
            onClick={() => { setIsDraw(false); setSelectedWinnerId(match!.player2Id); }} />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
            {currentLeg === 3 ? 'Penalty Score' : `${label} Score`} <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <p className="text-[10px] text-slate-500 text-center truncate">{match!.player1Name}</p>
              <input type="number" min="0" value={score1} onChange={e => setScore1(e.target.value)} placeholder="0"
                className={`w-full text-center bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-${accentColor}-500/70 transition-colors`} />
            </div>
            <span className="text-slate-600 font-bold text-sm shrink-0 mt-5">—</span>
            <div className="flex-1 space-y-1">
              <p className="text-[10px] text-slate-500 text-center truncate">{match!.player2Name}</p>
              <input type="number" min="0" value={score2} onChange={e => setScore2(e.target.value)} placeholder="0"
                className={`w-full text-center bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-${accentColor}-500/70 transition-colors`} />
            </div>
          </div>
        </div>

        {canDraw && (
          <button type="button" onClick={() => { setIsDraw(true); setSelectedWinnerId(null); }}
            disabled={!scoresEqual}
            title={!scoresEqual ? 'Enter equal scores to mark as a draw' : undefined}
            className={`w-full py-2 rounded-xl border text-sm font-semibold transition-all ${
              isDraw ? 'border-orange-500/50 bg-orange-500/10 text-orange-300'
                : scoresEqual ? 'border-slate-700 text-slate-400 hover:border-slate-500'
                : 'border-slate-800 text-slate-700 cursor-not-allowed opacity-40'
            }`}>
            {isDraw ? '⚖️ Draw Selected' : 'It was a Draw'}
            {!scoresEqual && score1 !== '' && score2 !== '' && (
              <span className="ml-2 text-[10px] font-normal">(scores must be equal)</span>
            )}
          </button>
        )}

        {/* Penalty shootout — appears when scores are equal */}
        {scoresEqual && (() => {
          const p1 = parseInt(penaltyScore1, 10);
          const p2 = parseInt(penaltyScore2, 10);
          const penaltiesEntered = penaltyScore1 !== '' && penaltyScore2 !== '' && !isNaN(p1) && !isNaN(p2);
          return (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2.5">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Penalty Shootout</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <p className="text-[10px] text-slate-500 text-center truncate">{match!.player1Name}</p>
                  <input
                    type="number" min="0" value={penaltyScore1}
                    onChange={e => {
                      setPenaltyScore1(e.target.value);
                      setIsDraw(false);
                    }}
                    placeholder="0"
                    className="w-full text-center bg-slate-800/60 border border-amber-500/30 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/60 transition-colors"
                  />
                </div>
                <span className="text-slate-600 font-bold text-sm shrink-0 mt-5">—</span>
                <div className="flex-1 space-y-1">
                  <p className="text-[10px] text-slate-500 text-center truncate">{match!.player2Name}</p>
                  <input
                    type="number" min="0" value={penaltyScore2}
                    onChange={e => {
                      setPenaltyScore2(e.target.value);
                      setIsDraw(false);
                    }}
                    placeholder="0"
                    className="w-full text-center bg-slate-800/60 border border-amber-500/30 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/60 transition-colors"
                  />
                </div>
              </div>
              {penaltiesEntered && p1 === p2 && (
                <p className="text-[11px] text-rose-400">Penalty scores must not be equal — a winner is required.</p>
              )}
              {penaltiesEntered && p1 !== p2 && (
                <p className="text-[11px] text-amber-300 font-semibold">
                  {p1 > p2 ? match!.player1Name : match!.player2Name} wins on penalties
                </p>
              )}
            </div>
          );
        })()}

        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
            Screenshot proof <span className="text-red-400">*</span>
          </label>
          <ImageUploadDropzone value={screenshotUrl} onChange={setScreenshotUrl} folder={`match-proof/${matchId}`} disabled={submitting} />
        </div>

        <button
          onClick={() => {
            const p1 = parseInt(penaltyScore1, 10);
            const p2 = parseInt(penaltyScore2, 10);
            const hasPenalties = scoresEqual && penaltyScore1 !== '' && penaltyScore2 !== '' && !isNaN(p1) && !isNaN(p2) && p1 !== p2;
            const winnerId = hasPenalties
              ? (p1 > p2 ? match!.player1Id : match!.player2Id)
              : (isDraw ? null : selectedWinnerId!);
            doAction(() => tournamentService.submitMatchResult(
              matchId,
              winnerId,
              { screenshots: [screenshotUrl] },
              { player1: Number(score1), player2: Number(score2) }
            ));
          }}
          disabled={(() => {
            if (submitting || !screenshotUrl || score1 === '' || score2 === '') return true;
            if (scoresEqual) {
              const p1 = parseInt(penaltyScore1, 10);
              const p2 = parseInt(penaltyScore2, 10);
              const hasPenalties = penaltyScore1 !== '' && penaltyScore2 !== '' && !isNaN(p1) && !isNaN(p2) && p1 !== p2;
              // equal scores require either draw selection or valid penalties
              return !isDraw && !hasPenalties;
            }
            return !selectedWinnerId;
          })()}
          className="w-full py-3 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 font-bold text-sm transition-all hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
          Submit {isTwoLeg ? legLabel : 'Result'}
        </button>
      </div>
    );
  }

  function renderConfirmForm() {
    if (!match) return null;
    const isReportedDraw = !reportedWinner;
    const opponentSaysIWon = reportedWinner === currentUserId;
    return (
      <div className="space-y-4">
        <div className={`rounded-xl px-4 py-3 border text-sm text-center font-medium ${
          isReportedDraw ? 'border-slate-600/40 bg-slate-800/40 text-slate-300'
            : opponentSaysIWon ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300'
            : 'border-amber-500/30 bg-amber-500/8 text-amber-300'
        }`}>
          <span className="text-slate-400">{opponentName} reported{isTwoLeg ? ` (${legLabel})` : ''}: </span>
          <span className="font-bold">{isReportedDraw ? 'Draw' : `${reportedWinnerName} won`}</span>
        </div>

        {(match.player1Score > 0 || match.player2Score > 0) && (
          <ScoreDisplay s1={match.player1Score} s2={match.player2Score} n1={match.player1Name} n2={match.player2Name} reason={match.reason} />
        )}

        {countdown !== null && (
          <div className="flex justify-center">
            {countdown > 0
              ? <CountdownBadge seconds={countdown} label="Auto-confirms in" />
              : <p className="text-xs text-slate-500">Auto-confirming…</p>}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => doAction(() => tournamentService.confirmMatchResult(matchId))}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-linear-to-r from-emerald-600 to-emerald-500 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            Confirm {isTwoLeg ? legLabel : ''}
          </button>
          <button onClick={() => setShowDisputeForm(true)} disabled={submitting}
            className="flex-1 py-3 rounded-xl border border-red-500/30 bg-red-500/8 text-red-400 font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            <Flag className="w-4 h-4" />
            Dispute
          </button>
        </div>
      </div>
    );
  }

  function renderContent() {
    if (!match) return null;

    // ── COMPLETED ──────────────────────────────────────────────────────────
    if (match.status === 'completed') {
      const p1Won = match.winnerId === match.player1Id;
      const p2Won = match.winnerId === match.player2Id;
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">Final Result</span>
          </div>
          <div className="flex gap-3">
            <PlayerCard name={match.player1Name} isWinner={p1Won} isLoser={p2Won} highlight={isP1} />
            <PlayerCard name={match.player2Name} isWinner={p2Won} isLoser={p1Won} highlight={isP2} />
          </div>

          {/* Score display — only show for non-two-leg (two-leg breakdown is in the persistent panel) */}
          {!isTwoLeg && (
            <ScoreDisplay s1={match.player1Score} s2={match.player2Score} n1={match.player1Name} n2={match.player2Name} p1Won={p1Won} p2Won={p2Won} reason={match.reason} />
          )}

          <p className="text-center text-[11px] text-slate-600 uppercase tracking-widest">
            {p1Won ? `${match.player1Name} advances` : p2Won ? `${match.player2Name} advances` : 'Match finalised'}
          </p>

          {/* Organizer score override */}
          {isOrganizer && (
            <div className="mt-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 overflow-hidden">
              {/* toggle header */}
              <button
                onClick={() => setShowScoreOverride(v => !v)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-indigo-500/10 hover:bg-indigo-500/15 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Override Score</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform duration-200 ${showScoreOverride ? 'rotate-180' : ''}`} />
              </button>

              {showScoreOverride && (
              <div className="px-4 py-4 space-y-3 border-t border-indigo-500/15">
                {/* score inputs */}
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-400 text-center truncate">{match.player1Name}</p>
                    <input
                      type="number"
                      min={0}
                      value={overrideS1}
                      onChange={e => setOverrideS1(e.target.value)}
                      placeholder={String(match.player1Score ?? 0)}
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-3 text-2xl font-bold text-white text-center focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-colors placeholder:text-slate-700"
                    />
                  </div>
                  <div className="pb-3 text-slate-600 font-bold text-xl select-none">–</div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-400 text-center truncate">{match.player2Name}</p>
                    <input
                      type="number"
                      min={0}
                      value={overrideS2}
                      onChange={e => setOverrideS2(e.target.value)}
                      placeholder={String(match.player2Score ?? 0)}
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-3 text-2xl font-bold text-white text-center focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-colors placeholder:text-slate-700"
                    />
                  </div>
                </div>

                {/* Penalty shootout — shown when scores are equal */}
                {overrideS1 !== '' && overrideS2 !== '' && (() => {
                  const s1 = parseInt(overrideS1, 10);
                  const s2 = parseInt(overrideS2, 10);
                  if (isNaN(s1) || isNaN(s2) || s1 !== s2) return null;
                  const p1 = parseInt(overridePenalty1, 10);
                  const p2 = parseInt(overridePenalty2, 10);
                  const penaltiesEntered = overridePenalty1 !== '' && overridePenalty2 !== '' && !isNaN(p1) && !isNaN(p2);
                  return (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2.5">
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Penalty Shootout</p>
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-1.5">
                          <p className="text-[11px] font-semibold text-slate-400 text-center truncate">{match.player1Name}</p>
                          <input
                            type="number"
                            min={0}
                            value={overridePenalty1}
                            onChange={e => setOverridePenalty1(e.target.value)}
                            placeholder="0"
                            className="w-full bg-slate-900/80 border border-amber-500/30 rounded-xl px-3 py-3 text-2xl font-bold text-white text-center focus:outline-none focus:border-amber-400 transition-colors placeholder:text-slate-700"
                          />
                        </div>
                        <div className="pb-3 text-slate-600 font-bold text-xl select-none">–</div>
                        <div className="flex-1 space-y-1.5">
                          <p className="text-[11px] font-semibold text-slate-400 text-center truncate">{match.player2Name}</p>
                          <input
                            type="number"
                            min={0}
                            value={overridePenalty2}
                            onChange={e => setOverridePenalty2(e.target.value)}
                            placeholder="0"
                            className="w-full bg-slate-900/80 border border-amber-500/30 rounded-xl px-3 py-3 text-2xl font-bold text-white text-center focus:outline-none focus:border-amber-400 transition-colors placeholder:text-slate-700"
                          />
                        </div>
                      </div>
                      {penaltiesEntered && p1 === p2 && (
                        <p className="text-[11px] text-rose-400">Penalty scores must not be equal — a winner is required.</p>
                      )}
                    </div>
                  );
                })()}

                {/* reason */}
                <input
                  type="text"
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="Reason for override (optional)"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
                />

                {overrideError && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{overrideError}</p>
                )}

                <button
                  onClick={handleScoreOverride}
                  disabled={(() => {
                    if (overriding || overrideS1 === '' || overrideS2 === '') return true;
                    const s1 = parseInt(overrideS1, 10);
                    const s2 = parseInt(overrideS2, 10);
                    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return true;
                    if (s1 === s2) {
                      const p1 = parseInt(overridePenalty1, 10);
                      const p2 = parseInt(overridePenalty2, 10);
                      if (overridePenalty1 === '' || overridePenalty2 === '') return true;
                      if (isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0 || p1 === p2) return true;
                    }
                    return false;
                  })()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {overriding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                  Confirm Override
                </button>
              </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // ── DISPUTED ───────────────────────────────────────────────────────────
    if (match.status === 'disputed') {
      return (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Shield className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Dispute Under Review</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              The organizer has been notified and will review the evidence.
            </p>
          </div>
        </div>
      );
    }

    // ── CANCELLED ──────────────────────────────────────────────────────────
    if (match.status === 'cancelled') {
      return (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <X className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400">This match was cancelled.</p>
        </div>
      );
    }

    // ── ACTIVE MATCH (pending / scheduled / ongoing) ────────────────────────
    if (['ongoing', 'scheduled', 'pending'].includes(match.status)) {
      if (!iParticipant) {
        return (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Swords className="w-7 h-7 text-orange-400" />
            </div>
            <p className="text-sm text-slate-400">Match is in progress.</p>
          </div>
        );
      }

      // TBD
      const hasTbd = !match.player1Id || !match.player2Id || match.player1Name === 'TBD' || match.player2Name === 'TBD';
      if (hasTbd) {
        return (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Clock className="w-7 h-7 text-slate-500" />
            </div>
            <p className="text-sm font-bold text-white">Waiting for Opponent</p>
            <p className="text-xs text-slate-400">Your opponent hasn't been assigned yet.</p>
          </div>
        );
      }

      // Matchweek not active (league only)
      const matchweekNotActive = currentMatchweek !== undefined && match.matchweek !== undefined && match.matchweek > currentMatchweek;
      if (matchweekNotActive) {
        return (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Clock className="w-7 h-7 text-slate-500" />
            </div>
            <p className="text-sm font-bold text-white">Matchweek Not Active</p>
            <p className="text-xs text-slate-400 mt-1">The organizer hasn't advanced to Week {match.matchweek} yet.</p>
          </div>
        );
      }

      // Dispute form
      if (showDisputeForm) {
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-400 text-sm font-bold">
              <Flag className="w-4 h-4" />Dispute Result
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Reason <span className="text-red-400">*</span></label>
              <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)}
                placeholder="Explain why you're disputing this result..." rows={3}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/70 resize-none transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Evidence <span className="text-slate-600 text-[10px] normal-case">optional</span></label>
              <ImageUploadDropzone value={evidenceUrl} onChange={setEvidenceUrl} folder={`match-dispute/${matchId}`} disabled={submitting} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowDisputeForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm font-medium transition-colors">Back</button>
              <button
                onClick={() => doAction(() => tournamentService.disputeMatchResult(matchId, disputeReason, evidenceUrl ? [evidenceUrl] : undefined))}
                disabled={submitting || !disputeReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                Submit Dispute
              </button>
            </div>
          </div>
        );
      }

      // Opponent submitted → show confirm form
      if (opponentSubmitted) return renderConfirmForm();

      // I submitted → waiting
      if (iSubmitted) {
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm font-bold text-white">{isTwoLeg ? `${legLabel} Submitted` : 'Result Submitted'}</p>
              <p className="text-xs text-slate-400">Waiting for <span className="text-slate-200">{opponentName}</span> to confirm.</p>
              {countdown !== null && (
                countdown > 0
                  ? <CountdownBadge seconds={countdown} label="Auto-confirms in" />
                  : <p className="text-xs text-orange-400">Auto-confirming…</p>
              )}
            </div>
            {(match.player1Score > 0 || match.player2Score > 0) && (
              <ScoreDisplay s1={match.player1Score} s2={match.player2Score} n1={match.player1Name} n2={match.player2Name} reason={match.reason} />
            )}
          </div>
        );
      }

      // Submit form
      const accentColor = currentLeg === 3 ? 'amber' : currentLeg === 2 ? 'violet' : 'orange';
      const label = currentLeg === 3 ? 'Enter Penalty Scores' : currentLeg === 2 ? 'Enter Leg 2 Scores' : 'Enter Leg 1 Scores';
      return renderScoreInputForm(label, accentColor);
    }

    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Clock className="w-8 h-8 text-slate-600" />
        <p className="text-sm text-slate-500">Match status: {match.status}</p>
      </div>
    );
  }

  // ── Modal wrapper ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950 shadow-2xl shadow-black/80">
        {/* Ambient glows */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-orange-500/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none" />
          <div className="relative flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
              <Swords className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <span className="text-sm font-bold text-white">
              {match?.matchweek !== undefined ? `Matchweek ${match.matchweek}` : 'Match'}
            </span>
          </div>
          <button onClick={onClose} className="relative text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Persistent leg scores panel ─────────────────────────────── */}
        {!loading && match && isTwoLeg && (leg1P1 !== null || leg2P1 !== null || penP1 !== null) && (
          <div className="border-b border-slate-800/80 px-5 py-3 space-y-1.5">
            {leg1P1 !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold w-16 shrink-0">Leg 1</span>
                <div className="flex items-center gap-1.5 font-bold tabular-nums">
                  <span className={leg1P1 > (leg1P2 ?? 0) ? 'text-amber-300' : 'text-slate-400'}>{match.player1Name}</span>
                  <span className={`px-2 py-0.5 rounded-md text-sm font-black ${leg1P1 > (leg1P2 ?? 0) ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>{leg1P1}</span>
                  <span className="text-slate-700">–</span>
                  <span className={`px-2 py-0.5 rounded-md text-sm font-black ${(leg1P2 ?? 0) > leg1P1 ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>{leg1P2 ?? 0}</span>
                  <span className={(leg1P2 ?? 0) > leg1P1 ? 'text-amber-300' : 'text-slate-400'}>{match.player2Name}</span>
                </div>
              </div>
            )}
            {leg2P1 !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold w-16 shrink-0">Leg 2</span>
                <div className="flex items-center gap-1.5 font-bold tabular-nums">
                  <span className={leg2P1 > (leg2P2 ?? 0) ? 'text-amber-300' : 'text-slate-400'}>{match.player1Name}</span>
                  <span className={`px-2 py-0.5 rounded-md text-sm font-black ${leg2P1 > (leg2P2 ?? 0) ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>{leg2P1}</span>
                  <span className="text-slate-700">–</span>
                  <span className={`px-2 py-0.5 rounded-md text-sm font-black ${(leg2P2 ?? 0) > leg2P1 ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>{leg2P2 ?? 0}</span>
                  <span className={(leg2P2 ?? 0) > leg2P1 ? 'text-amber-300' : 'text-slate-400'}>{match.player2Name}</span>
                </div>
              </div>
            )}
            {leg1P1 !== null && leg2P1 !== null && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                <span className="text-slate-500 font-semibold w-16 shrink-0">Aggregate</span>
                <div className="flex items-center gap-1.5 font-bold tabular-nums">
                  <span className={(aggP1 ?? 0) > (aggP2 ?? 0) ? 'text-white' : (aggP2 ?? 0) > (aggP1 ?? 0) ? 'text-slate-500' : 'text-amber-400'}>{match.player1Name}</span>
                  <span className={`px-2 py-0.5 rounded-md text-sm font-black bg-slate-800 ${(aggP1 ?? 0) === (aggP2 ?? 0) ? 'text-amber-400' : 'text-slate-200'}`}>{aggP1 ?? 0}</span>
                  <span className="text-slate-700">–</span>
                  <span className={`px-2 py-0.5 rounded-md text-sm font-black bg-slate-800 ${(aggP1 ?? 0) === (aggP2 ?? 0) ? 'text-amber-400' : 'text-slate-200'}`}>{aggP2 ?? 0}</span>
                  <span className={(aggP2 ?? 0) > (aggP1 ?? 0) ? 'text-white' : (aggP1 ?? 0) > (aggP2 ?? 0) ? 'text-slate-500' : 'text-amber-400'}>{match.player2Name}</span>
                </div>
              </div>
            )}
            {aggP1 !== null && aggP2 !== null && aggP1 === aggP2 && penP1 === null && (
              <p className="text-[11px] text-amber-400 text-center font-semibold pt-1">
                Aggregate level — decide by Penalties
              </p>
            )}
            {penP1 !== null && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-500/20">
                <span className="text-amber-500 font-semibold w-16 shrink-0">Penalties</span>
                <div className="flex items-center gap-1.5 font-bold tabular-nums">
                  <span className={penP1 > (penP2 ?? 0) ? 'text-amber-300' : 'text-slate-400'}>{match.player1Name}</span>
                  <span className={`px-2 py-0.5 rounded-md text-sm font-black ${penP1 > (penP2 ?? 0) ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>{penP1}</span>
                  <span className="text-slate-700">–</span>
                  <span className={`px-2 py-0.5 rounded-md text-sm font-black ${(penP2 ?? 0) > penP1 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>{penP2 ?? 0}</span>
                  <span className={(penP2 ?? 0) > penP1 ? 'text-amber-300' : 'text-slate-400'}>{match.player2Name}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Play deadline banner */}
        {!loading && match?.playDeadline && match.status !== 'completed' && match.status !== 'cancelled' && match.status !== 'disputed' && (
          <div className={`px-5 py-2 flex items-center justify-center gap-1.5 text-xs font-medium border-b ${
            playDeadlineCountdown !== null && playDeadlineCountdown <= 0
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : playDeadlineCountdown !== null && playDeadlineCountdown < 3600
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-slate-800/40 border-slate-800/60 text-slate-400'
          }`}>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {playDeadlineCountdown !== null && playDeadlineCountdown <= 0
              ? 'Play deadline has passed'
              : playDeadlineCountdown !== null
                ? (() => {
                    const h = Math.floor(playDeadlineCountdown / 3600);
                    const m = Math.floor((playDeadlineCountdown % 3600) / 60);
                    return h >= 24
                      ? `Play by ${new Date(match.playDeadline!).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                      : `Play deadline: ${h}h ${m}m remaining`;
                  })()
                : `Play by ${new Date(match.playDeadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
            }
          </div>
        )}

        {/* Body */}
        <div className="relative px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
              <span className="text-sm">Loading match…</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : renderContent()}

          {!loading && error && match && (
            <p className="mt-3 text-xs text-red-400 text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
