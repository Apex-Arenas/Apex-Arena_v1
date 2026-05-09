import { Crown, Swords } from "lucide-react";
import { getParticipantLabel } from "./bracket.utils";
import type { BracketMatch, BracketRound } from "./types";

const BRACKET_CARD_HEIGHT = 96;
const BRACKET_BASE_UNIT   = 116;
const BRACKET_CONNECTOR_OUT = 20;
const BRACKET_CONNECTOR_IN  = 32;
const BRACKET_COLUMN_WIDTH  = 240;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getRoundLayout(roundIndex: number, matchCount: number) {
  const factor    = Math.pow(2, roundIndex);
  const topOffset = ((factor - 1) * BRACKET_BASE_UNIT) / 2;
  const gap       = Math.max(16, factor * BRACKET_BASE_UNIT - BRACKET_CARD_HEIGHT);
  const height    = topOffset + matchCount * BRACKET_CARD_HEIGHT + Math.max(0, matchCount - 1) * gap;
  return { topOffset, gap, height };
}

function toTitleCase(value: string) {
  return value.split(" ").filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatRoundName(raw?: string): string | null {
  if (!raw?.trim()) return null;
  const n = raw.trim().toLowerCase();
  const named: Record<string, string> = {
    final: "Final", grand_final: "Grand Final",
    upper_final: "Upper Final", lower_final: "Lower Final",
    semi_final: "Semifinal", semi_finals: "Semifinals",
    quarter_final: "Quarterfinal", quarter_finals: "Quarterfinals",
  };
  if (named[n]) return named[n];
  const m = n.match(/^round[_\s-]?(\d+)$/);
  if (m) return `Round ${m[1]}`;
  return toTitleCase(n.replace(/[_-]+/g, " "));
}

function getRoundTitle(round: BracketRound, index: number, total: number): string {
  const explicit = formatRoundName(round.name ?? round.round_name);
  if (explicit) return explicit;
  const num = round.round_number ?? round.round ?? index + 1;
  if (total >= 2 && num === total) return "Final";
  if (total >= 3 && num === total - 1) return "Semifinal";
  if (total >= 4 && num === total - 2) return "Quarterfinal";
  return `Round ${num}`;
}

function getRoundStyle(title: string): { pill: string; glow: string; label: string } {
  const t = title.toLowerCase();
  if (t.includes("grand final") || t.includes("final") && !t.includes("semi") && !t.includes("quarter"))
    return {
      pill:  "bg-amber-500/15 text-amber-300 border-amber-500/30",
      glow:  "shadow-[0_0_24px_rgba(251,191,36,0.12)]",
      label: title,
    };
  if (t.includes("semi"))
    return {
      pill:  "bg-violet-500/15 text-violet-300 border-violet-500/30",
      glow:  "",
      label: title,
    };
  if (t.includes("quarter"))
    return {
      pill:  "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      glow:  "",
      label: title,
    };
  return {
    pill:  "bg-slate-700/60 text-slate-400 border-slate-600/40",
    glow:  "",
    label: title,
  };
}

const STATUS_DOT: Record<string, string> = {
  completed: "bg-emerald-400",
  in_progress: "bg-orange-400 animate-pulse",
  live: "bg-orange-400 animate-pulse",
  pending: "bg-slate-500",
  scheduled: "bg-cyan-400",
};

const STATUS_TEXT: Record<string, string> = {
  completed: "text-emerald-400",
  in_progress: "text-orange-400",
  live: "text-orange-400",
  pending: "text-slate-500",
  scheduled: "text-cyan-400",
};

// ─── Two-leg score helpers ────────────────────────────────────────────────────

function getLegScore(match: BracketMatch, participantIndex: number, legNumber: number): number | null {
  const games = match.games ?? [];
  const leg = games.find((g) => g.game_number === legNumber);
  if (!leg) return null;
  const p = match.participants?.[participantIndex];
  if (!p) return null;
  const entry = leg.scores?.find((s) => {
    // match by position order since participant_id may not be populated
    return leg.scores?.indexOf(s) === participantIndex;
  });
  return entry?.score ?? null;
}

function getTotalGoals(match: BracketMatch, participantIndex: number): number | null {
  const games = match.games ?? [];
  if (games.length === 0) return null;
  let total = 0;
  for (const game of games) {
    const entry = game.scores?.[participantIndex];
    if (entry != null) total += entry.score ?? 0;
  }
  return total;
}

// ─── Match Card ───────────────────────────────────────────────────────────────

function MatchCard({
  match,
  isClickable,
  onClick,
  isFinal,
}: {
  match: BracketMatch;
  isClickable: boolean;
  onClick: () => void;
  isFinal: boolean;
}) {
  const p = match.participants ?? [];
  const p1Label = getParticipantLabel(p[0]);
  const p2Label = getParticipantLabel(p[1]);
  const p1Win = p[0]?.result === "win";
  const p2Win = p[1]?.result === "win";
  const statusRaw = (match.status ?? "pending").toLowerCase();
  const SCORED_STATUSES = new Set(["completed", "in_progress", "live", "ongoing", "awaiting_results", "verifying_results"]);
  const isScored = SCORED_STATUSES.has(statusRaw);
  const isTwoLeg = (match.format?.best_of ?? 1) >= 2;
  const scheduledAt = match.scheduled_at ?? match.scheduled_time ?? match.schedule?.scheduled_time;

  // Two-leg: show L1/L2 and aggregate
  const p1Leg1 = isTwoLeg ? getLegScore(match, 0, 1) : null;
  const p1Leg2 = isTwoLeg ? getLegScore(match, 0, 2) : null;
  const p2Leg1 = isTwoLeg ? getLegScore(match, 1, 1) : null;
  const p2Leg2 = isTwoLeg ? getLegScore(match, 1, 2) : null;
  const p1TotalFromGames = isTwoLeg ? getTotalGoals(match, 0) : null;
  const p2TotalFromGames = isTwoLeg ? getTotalGoals(match, 1) : null;
  // Fall back to participant.score when games[] is empty (e.g. legacy completed matches)
  const p1Total = p1TotalFromGames !== null ? p1TotalFromGames : isScored ? (p[0]?.score ?? null) : null;
  const p2Total = p2TotalFromGames !== null ? p2TotalFromGames : isScored ? (p[1]?.score ?? null) : null;
  const hasScores = isScored && (p1Total !== null || p2Total !== null);

  const dotCls  = STATUS_DOT[statusRaw]  ?? STATUS_DOT.pending;
  const txtCls  = STATUS_TEXT[statusRaw] ?? STATUS_TEXT.pending;
  const statusLabel = statusRaw.replace(/_/g, " ");

  const borderAccent = isFinal
    ? "border-amber-500/30 shadow-[0_0_20px_rgba(251,191,36,0.08)]"
    : "border-slate-700/60";

  const renderScore = (total: number | null, l1: number | null, l2: number | null, isWinner: boolean) => {
    if (!hasScores) return <span className="text-slate-700">—</span>;
    if (isTwoLeg && (l1 !== null || l2 !== null)) {
      return (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-slate-600 tabular-nums">{l1 ?? "–"}</span>
          <span className="text-[9px] text-slate-700">/</span>
          <span className="text-[10px] text-slate-600 tabular-nums">{l2 ?? "–"}</span>
          <span className={`text-xs font-bold tabular-nums ml-1 ${isWinner ? "text-orange-300" : "text-slate-600"}`}>
            ({total ?? "–"})
          </span>
        </div>
      );
    }
    return (
      <span className={`text-xs font-bold tabular-nums shrink-0 ${isWinner ? "text-orange-300" : "text-slate-600"}`}>
        {total ?? "—"}
      </span>
    );
  };

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`group relative overflow-hidden rounded-xl border bg-slate-900/90 backdrop-blur-sm transition-all duration-200 ${borderAccent} ${
        isClickable ? "cursor-pointer hover:border-slate-500/70 hover:shadow-lg hover:shadow-black/40 hover:-translate-y-px" : ""
      }`}
      style={{ minHeight: `${BRACKET_CARD_HEIGHT}px` }}
    >
      {isFinal && (
        <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-size-[20px_20px] pointer-events-none" />

      {/* ── Participant 1 ── */}
      <div className={`relative flex items-center justify-between gap-2 px-3 py-2.5 transition-colors ${
        p1Win
          ? "bg-linear-to-r from-orange-500/10 to-transparent border-l-2 border-orange-400"
          : p2Win ? "border-l-2 border-transparent opacity-50" : "border-l-2 border-transparent"
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          {p1Win && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
          <span className={`text-xs font-semibold truncate ${p1Win ? "text-white" : p2Win ? "text-slate-500" : "text-slate-300"}`}>
            {p1Label}
          </span>
        </div>
        {renderScore(p1Total, p1Leg1, p1Leg2, p1Win)}
      </div>

      <div className="h-px bg-slate-800/80 mx-2" />

      {/* ── Participant 2 ── */}
      <div className={`relative flex items-center justify-between gap-2 px-3 py-2.5 transition-colors ${
        p2Win
          ? "bg-linear-to-r from-orange-500/10 to-transparent border-l-2 border-orange-400"
          : p1Win ? "border-l-2 border-transparent opacity-50" : "border-l-2 border-transparent"
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          {p2Win && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
          <span className={`text-xs font-semibold truncate ${p2Win ? "text-white" : p1Win ? "text-slate-500" : "text-slate-300"}`}>
            {p2Label}
          </span>
        </div>
        {renderScore(p2Total, p2Leg1, p2Leg2, p2Win)}
      </div>

      {/* ── Two-leg legend ── */}
      {isTwoLeg && (
        <div className="px-3 pb-1 pt-0">
          <span className="text-[9px] text-slate-700 font-medium">L1 / L2 (Total)</span>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="h-px bg-slate-800/60 mx-2" />
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${txtCls}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
          {statusLabel}
        </span>
        <span className="text-[10px] text-slate-600 tabular-nums">
          {scheduledAt ? formatDateTime(scheduledAt) : "TBD"}
        </span>
      </div>
    </div>
  );
}

// ─── Main BracketView ─────────────────────────────────────────────────────────

function BracketSection({
  rounds,
  onMatchClick,
}: {
  rounds: BracketRound[];
  onMatchClick?: (matchId: string) => void;
}) {
  const layouts    = rounds.map((round, i) => getRoundLayout(i, (round.matches ?? []).length));
  const boardHeight = Math.max(...layouts.map((l) => l.height), 0);

  return (
    <div
      className="relative flex gap-14"
      style={{
        minWidth:  `${rounds.length * (BRACKET_COLUMN_WIDTH + 56)}px`,
        minHeight: `${boardHeight + 48}px`,
      }}
    >
      {rounds.map((round, ri) => {
        const layout  = layouts[ri];
        const matches = round.matches ?? [];
        const title   = getRoundTitle(round, ri, rounds.length);
        const style   = getRoundStyle(title);
        const isFinalRound = title.toLowerCase().includes("final") && !title.toLowerCase().includes("semi") && !title.toLowerCase().includes("quarter");
        const connectorLeft = BRACKET_COLUMN_WIDTH;

        return (
          <div
            key={ri}
            className="relative flex-shrink-0"
            style={{ width: `${BRACKET_COLUMN_WIDTH}px`, minHeight: `${boardHeight}px` }}
          >
            <div className="flex justify-center mb-5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.14em] border ${style.pill} ${style.glow}`}>
                {isFinalRound && <Crown className="w-3 h-3" />}
                {title}
              </span>
            </div>

            <div className="relative" style={{ paddingTop: `${layout.topOffset}px` }}>
              <div className="flex flex-col" style={{ rowGap: `${layout.gap}px` }}>
                {matches.map((match, mi) => {
                  const matchId    = match._id ?? match.id;
                  const isClickable = Boolean(onMatchClick && matchId);
                  return (
                    <MatchCard
                      key={matchId ?? mi}
                      match={match}
                      isClickable={isClickable}
                      onClick={() => isClickable && onMatchClick!(matchId!)}
                      isFinal={isFinalRound}
                    />
                  );
                })}
              </div>

              {ri < rounds.length - 1 && matches.length > 0 && (
                <div className="absolute inset-0 pointer-events-none" style={{ overflow: "visible" }}>
                  {matches.map((_, mi) => {
                    const cy = layout.topOffset + mi * (BRACKET_CARD_HEIGHT + layout.gap) + BRACKET_CARD_HEIGHT / 2;
                    return (
                      <div
                        key={`out-${mi}`}
                        className="absolute bg-slate-600/60"
                        style={{ left: `${connectorLeft}px`, top: `${cy}px`, width: `${BRACKET_CONNECTOR_OUT}px`, height: "1.5px" }}
                      />
                    );
                  })}
                  {Array.from({ length: Math.floor(matches.length / 2) }).map((_, pi) => {
                    const top = pi * 2;
                    const bot = top + 1;
                    const yTop = layout.topOffset + top * (BRACKET_CARD_HEIGHT + layout.gap) + BRACKET_CARD_HEIGHT / 2;
                    const yBot = layout.topOffset + bot * (BRACKET_CARD_HEIGHT + layout.gap) + BRACKET_CARD_HEIGHT / 2;
                    const yMid = (yTop + yBot) / 2;
                    const xVert = connectorLeft + BRACKET_CONNECTOR_OUT;
                    return (
                      <div key={`pair-${pi}`}>
                        <div className="absolute bg-slate-600/60" style={{ left: `${xVert}px`, top: `${yTop}px`, width: "1.5px", height: `${yBot - yTop}px` }} />
                        <div className="absolute bg-slate-600/60" style={{ left: `${xVert}px`, top: `${yMid}px`, width: `${BRACKET_CONNECTOR_IN}px`, height: "1.5px" }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BracketView({
  rounds,
  onMatchClick,
}: {
  rounds: BracketRound[];
  onMatchClick?: (matchId: string) => void;
}) {
  if (rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/40">
        <div className="w-14 h-14 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-4">
          <Swords className="w-7 h-7 text-slate-600" />
        </div>
        <p className="font-display text-base font-bold text-slate-400">Bracket not generated yet</p>
        <p className="text-sm text-slate-600 mt-1">Check back once the tournament begins.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4 -mx-1 px-1">
      <BracketSection rounds={rounds} onMatchClick={onMatchClick} />
    </div>
  );
}
