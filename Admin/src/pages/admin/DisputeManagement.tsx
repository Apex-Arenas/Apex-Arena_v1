import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Gavel,
  User,
  Clock,
  FileText,
  Link,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchPlayer {
  id: string;
  name: string;
}

interface DisputeInfo {
  isDisputed: boolean;
  disputedBy: string;
  disputedAt: string;
  reason: string;
  evidenceUrl?: string;
}

interface PlayerResult {
  playerId: string;
  playerName: string;
  reportedWinnerId: string;
  reportedWinnerName: string;
}

interface MatchDetail {
  id: string;
  status: string;
  tournamentId: string;
  tournamentTitle: string;
  player1: MatchPlayer;
  player2: MatchPlayer;
  dispute: DisputeInfo | null;
  player1Result: PlayerResult | null;
  player2Result: PlayerResult | null;
  winnerName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractPlayerFromParticipants(raw: Record<string, unknown>): { p1: MatchPlayer; p2: MatchPlayer } {
  const participants = (raw.participants ?? []) as Record<string, unknown>[];

  const fromParticipant = (p: Record<string, unknown>): MatchPlayer => {
    const userObj = (p.user_id ?? p.user ?? {}) as Record<string, unknown>;
    const profile = (userObj.profile ?? {}) as Record<string, unknown>;
    return {
      id: String(userObj._id ?? userObj.id ?? p.user_id ?? ''),
      name: String(userObj.username ?? profile.first_name ?? p.in_game_id ?? userObj.id ?? 'Unknown'),
    };
  };

  if (participants.length >= 2) {
    return { p1: fromParticipant(participants[0]), p2: fromParticipant(participants[1]) };
  }

  // Fallback: named fields
  const fallback = (key1: string, key2?: string): MatchPlayer => {
    const p = (raw[key1] ?? (key2 ? raw[key2] : undefined) ?? {}) as Record<string, unknown>;
    return {
      id: String(p._id ?? p.id ?? raw[key1 + '_id'] ?? ''),
      name: String(p.username ?? p.first_name ?? p.name ?? p.in_game_id ?? p.id ?? 'Unknown'),
    };
  };

  return { p1: fallback('player1_id', 'player1'), p2: fallback('player2_id', 'player2') };
}

function mapMatchDetail(raw: Record<string, unknown>): MatchDetail {
  const tournamentRaw = (raw.tournament_id ?? raw.tournament ?? {}) as Record<string, unknown>;
  const disputeRaw = (raw.dispute ?? {}) as Record<string, unknown>;
  const { p1, p2 } = extractPlayerFromParticipants(raw);

  const results = (raw.results ?? []) as Record<string, unknown>[];
  const mapResult = (r: Record<string, unknown>): PlayerResult => ({
    playerId: String(r.submitted_by ?? r.submittedBy ?? ''),
    playerName: String((r.submitted_by_user as Record<string, unknown> | undefined)?.username ?? r.submitted_by ?? ''),
    reportedWinnerId: String(r.winner_id ?? r.winnerId ?? ''),
    reportedWinnerName: String((r.winner as Record<string, unknown> | undefined)?.username ?? r.winner_id ?? ''),
  });

  const winner = (raw.winner_id ?? raw.winner ?? {}) as Record<string, unknown>;

  return {
    id: String(raw._id ?? raw.id ?? ''),
    status: String(raw.status ?? 'unknown'),
    tournamentId: String(tournamentRaw._id ?? tournamentRaw.id ?? raw.tournament_id ?? ''),
    tournamentTitle: String(tournamentRaw.title ?? raw.tournament_title ?? 'Tournament'),
    player1: p1,
    player2: p2,
    dispute: disputeRaw.is_disputed || raw.is_disputed || raw.status === 'disputed'
      ? {
          isDisputed: true,
          disputedBy: String(
            (disputeRaw.disputed_by_user as Record<string, unknown> | undefined)?.username
            ?? disputeRaw.disputed_by
            ?? raw.disputed_by
            ?? '',
          ),
          disputedAt: String(disputeRaw.disputed_at ?? raw.disputed_at ?? ''),
          reason: String(disputeRaw.reason ?? raw.dispute_reason ?? ''),
          evidenceUrl: (disputeRaw.evidence_url ?? raw.evidence_url) as string | undefined,
        }
      : null,
    player1Result: results[0] ? mapResult(results[0]) : null,
    player2Result: results[1] ? mapResult(results[1]) : null,
    winnerName: typeof winner === 'object' ? String((winner as Record<string, unknown>).username ?? '') : undefined,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    disputed:  'bg-red-500/15 text-red-300 border-red-500/30',
    completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    ongoing:   'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    cancelled: 'bg-slate-700 text-slate-300 border-slate-600/30',
    pending:   'bg-amber-500/15 text-amber-300 border-amber-500/30',
  };
  const cls = map[status] ?? 'bg-slate-700 text-slate-300 border-slate-600/30';
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
      <span className="text-slate-400 shrink-0">{label}:</span>
      <span className="text-slate-200 break-all">{value}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DisputeManagement() {
  // ── Recent disputes list ──
  const [recentDisputes, setRecentDisputes] = useState<MatchDetail[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState('');

  // ── Lookup / active match ──
  const [matchIdInput, setMatchIdInput] = useState('');
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // ── Override ──
  const [overrideWinnerId, setOverrideWinnerId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideSuccess, setOverrideSuccess] = useState('');
  const [overrideError, setOverrideError] = useState('');

  const loadRecentDisputes = useCallback(async () => {
    setRecentLoading(true);
    setRecentError('');
    const raw = await adminService.fetchDisputedMatches(20);
    if (!raw.length && recentDisputes.length === 0) {
      setRecentError(''); // No disputes is fine
    }
    setRecentDisputes(raw.map(mapMatchDetail));
    setRecentLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void loadRecentDisputes(); }, [loadRecentDisputes]);

  const openMatch = (detail: MatchDetail) => {
    setMatch(detail);
    setMatchIdInput(detail.id);
    setOverrideSuccess('');
    setOverrideError('');
    setOverrideWinnerId('');
    setOverrideReason('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLookup = async () => {
    const id = matchIdInput.trim();
    if (!id) return;
    setLoading(true);
    setLookupError('');
    setMatch(null);
    setOverrideSuccess('');
    setOverrideError('');
    setOverrideWinnerId('');
    setOverrideReason('');

    const raw = await adminService.fetchMatchForAdmin(id);
    setLoading(false);
    if (!raw) { setLookupError('Match not found or you do not have access.'); return; }
    setMatch(mapMatchDetail(raw));
  };

  const handleOverride = async () => {
    if (!match || !overrideWinnerId) return;
    if (!overrideReason.trim()) { setOverrideError('Please provide a reason for the override.'); return; }

    setIsOverriding(true);
    setOverrideError('');
    const ok = await adminService.adminOverrideMatch(match.id, overrideWinnerId, overrideReason.trim());
    setIsOverriding(false);

    if (ok) {
      setOverrideSuccess('Match result overridden successfully.');
      setOverrideWinnerId('');
      setOverrideReason('');
      // Refresh the list so the resolved dispute disappears
      void loadRecentDisputes();
    } else {
      setOverrideError('Failed to override match result. Check the match ID and try again.');
    }
  };

  const players = match ? [match.player1, match.player2].filter((p) => p.id) : [];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Full-bleed Hero */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/8 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-display font-bold text-white">Dispute Management</h1>
                  {!recentLoading && recentDisputes.length > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">
                      {recentDisputes.length} open
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-0.5">Review open disputes and override match results.</p>
              </div>
            </div>
            <button
              onClick={() => void loadRecentDisputes()}
              disabled={recentLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${recentLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Two-column layout on large screens ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 items-start">

          {/* LEFT: recent disputes list */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Open Disputes
                {!recentLoading && recentDisputes.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-semibold">
                    {recentDisputes.length}
                  </span>
                )}
              </h2>
            </div>

            {recentLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : recentError ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" /> {recentError}
              </div>
            ) : recentDisputes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mb-2" />
                <p className="text-sm text-slate-400 font-medium">No open disputes</p>
                <p className="text-xs text-slate-500 mt-1">All matches are resolved.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {recentDisputes.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => openMatch(d)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-3 ${
                      match?.id === d.id ? 'bg-amber-500/8 border-l-2 border-l-amber-500' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 truncate mb-0.5">{d.tournamentTitle}</p>
                      <p className="text-sm text-white font-medium truncate">
                        {d.player1.name} <span className="text-slate-500 font-normal">vs</span> {d.player2.name}
                      </p>
                      {d.dispute?.disputedAt && (
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(d.dispute.disputedAt).toLocaleString()}
                        </p>
                      )}
                      {d.dispute?.reason && (
                        <p className="text-xs text-slate-400 mt-1 truncate italic">"{d.dispute.reason}"</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            )}

            {/* Manual lookup at the bottom of the list */}
            <div className="px-4 py-3.5 border-t border-slate-800 space-y-2">
              <p className="text-xs text-slate-500">Or look up by Match ID</p>
              <div className="flex items-center gap-2">
                <input
                  value={matchIdInput}
                  onChange={(e) => setMatchIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleLookup()}
                  placeholder="Paste match ID…"
                  className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors min-w-0"
                />
                <button
                  onClick={() => void handleLookup()}
                  disabled={loading || !matchIdInput.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors shrink-0"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  {loading ? '…' : 'Find'}
                </button>
              </div>
              {lookupError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {lookupError}
                </p>
              )}
            </div>
          </div>

          {/* RIGHT: match detail + override */}
          <div className="space-y-4">
            {!match ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-4">
                  <Gavel className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-sm text-slate-400 font-medium">Select a dispute to review</p>
                <p className="text-xs text-slate-500 mt-1">Click a match from the list or look up by ID.</p>
              </div>
            ) : (
              <>
                {/* Overview */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">{match.tournamentTitle}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-white font-semibold">
                          {match.player1.name} <span className="text-slate-500 font-normal">vs</span> {match.player2.name}
                        </h2>
                        <StatusBadge status={match.status} />
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-1">{match.id}</p>
                    </div>
                    {match.winnerName && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400">Winner</p>
                        <p className="text-sm font-semibold text-emerald-300">{match.winnerName}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dispute details */}
                {match.dispute ? (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Dispute Details
                    </h3>
                    <InfoRow icon={User}     label="Disputed by" value={match.dispute.disputedBy} />
                    <InfoRow icon={Clock}    label="Disputed at" value={match.dispute.disputedAt ? new Date(match.dispute.disputedAt).toLocaleString() : ''} />
                    <InfoRow icon={FileText} label="Reason"      value={match.dispute.reason} />
                    {match.dispute.evidenceUrl && (
                      <InfoRow icon={Link} label="Evidence" value={match.dispute.evidenceUrl} />
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-sm text-slate-400">This match has no active dispute flag.</p>
                  </div>
                )}

                {/* Submitted results */}
                {(match.player1Result ?? match.player2Result) && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-white">Submitted Results</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[match.player1Result, match.player2Result].map((result, i) =>
                        result ? (
                          <div key={i} className="rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2.5 text-sm">
                            <p className="text-xs text-slate-400 mb-1">
                              Submitted by: <span className="text-slate-200">{result.playerName || result.playerId}</span>
                            </p>
                            <p className="text-slate-300">
                              Reported winner: <span className="text-white font-medium">{result.reportedWinnerName || result.reportedWinnerId}</span>
                            </p>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                )}

                {/* Admin override */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                    <Gavel className="w-4 h-4" /> Admin Override
                  </h3>

                  {overrideSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 shrink-0" /> {overrideSuccess}
                    </div>
                  )}
                  {overrideError && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {overrideError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">Select Winner</label>
                      <div className="flex flex-wrap gap-2">
                        {players.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => setOverrideWinnerId(player.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                              overrideWinnerId === player.id
                                ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-amber-500/50'
                            }`}
                          >
                            {player.name}
                          </button>
                        ))}
                        {players.length === 0 && (
                          <p className="text-xs text-slate-500">Player data not available. Use the match ID lookup to load full details.</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">Override Reason (required)</label>
                      <textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        rows={2}
                        placeholder="Explain the basis for this override…"
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                      />
                    </div>

                    <button
                      onClick={() => void handleOverride()}
                      disabled={isOverriding || !overrideWinnerId || !overrideReason.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
                    >
                      {isOverriding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
                      {isOverriding ? 'Overriding…' : 'Override Result'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
