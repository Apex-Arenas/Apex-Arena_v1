import { CheckCircle2 } from "lucide-react";
import { getParticipantLabel } from "./bracket.utils";
import type { BracketRound } from "./types";

const BRACKET_CARD_HEIGHT = 82;
const BRACKET_BASE_UNIT = 104;
const BRACKET_CONNECTOR_OUT = 18;
const BRACKET_CONNECTOR_IN = 30;
const BRACKET_COLUMN_WIDTH = 228;

function formatDateTime(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoundLayout(
  roundIndex: number,
  matchCount: number,
): {
  topOffset: number;
  gap: number;
  height: number;
} {
  const factor = Math.pow(2, roundIndex);
  const topOffset = ((factor - 1) * BRACKET_BASE_UNIT) / 2;
  const gap = Math.max(16, factor * BRACKET_BASE_UNIT - BRACKET_CARD_HEIGHT);
  const height =
    topOffset +
    matchCount * BRACKET_CARD_HEIGHT +
    Math.max(0, matchCount - 1) * gap;

  return { topOffset, gap, height };
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatRoundName(raw?: string): string | null {
  if (!raw || raw.trim().length === 0) return null;

  const normalized = raw.trim().toLowerCase();
  const named: Record<string, string> = {
    final: "Final",
    grand_final: "Grand Final",
    upper_final: "Upper Final",
    lower_final: "Lower Final",
    semi_final: "Semifinal",
    semi_finals: "Semifinals",
    quarter_final: "Quarterfinal",
    quarter_finals: "Quarterfinals",
  };

  if (named[normalized]) {
    return named[normalized];
  }

  const roundMatch = normalized.match(/^round[_\s-]?(\d+)$/);
  if (roundMatch) {
    return `Round ${roundMatch[1]}`;
  }

  return toTitleCase(normalized.replace(/[_-]+/g, " "));
}

function getRoundTitle(
  round: BracketRound,
  index: number,
  totalRounds: number,
): string {
  const explicit = formatRoundName(round.name ?? round.round_name);
  if (explicit) {
    return explicit;
  }

  const roundNumber = round.round_number ?? round.round ?? index + 1;

  if (totalRounds >= 2 && roundNumber === totalRounds) {
    return "Final";
  }

  if (totalRounds >= 3 && roundNumber === totalRounds - 1) {
    return "Semifinal";
  }

  if (totalRounds >= 4 && roundNumber === totalRounds - 2) {
    return "Quarterfinal";
  }

  return `Round ${roundNumber}`;
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
      <p className="text-sm text-slate-400 text-center py-6">
        Bracket has not been generated yet.
      </p>
    );
  }

  const layouts = rounds.map((round, index) =>
    getRoundLayout(index, (round.matches ?? []).length),
  );
  const boardHeight = Math.max(...layouts.map((layout) => layout.height));

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="relative flex gap-14 px-1 pb-4"
        style={{
          minWidth: `${rounds.length * (BRACKET_COLUMN_WIDTH + 56)}px`,
          minHeight: `${boardHeight + 28}px`,
        }}
      >
        {rounds.map((round, ri) => {
          const layout = layouts[ri];
          const matches = round.matches ?? [];
          const connectorLeft = BRACKET_COLUMN_WIDTH;

          return (
            <div
              key={ri}
              className="relative"
              style={{
                width: `${BRACKET_COLUMN_WIDTH}px`,
                minHeight: `${boardHeight}px`,
              }}
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 text-center">
                {getRoundTitle(round, ri, rounds.length)}
              </p>

              <div
                className="relative"
                style={{
                  paddingTop: `${layout.topOffset}px`,
                }}
              >
                <div
                  className="flex flex-col"
                  style={{ rowGap: `${layout.gap}px` }}
                >
                  {matches.map((match, mi) => {
                    const p = match.participants ?? [];
                    const p1Label = getParticipantLabel(p[0]);
                    const p2Label = getParticipantLabel(p[1]);
                    const scheduledAt =
                      match.scheduled_at ??
                      match.scheduled_time ??
                      match.schedule?.scheduled_time;
                    const matchId = match._id ?? match.id;
                    const isClickable = Boolean(onMatchClick && matchId);

                    return (
                      <div
                        key={matchId ?? mi}
                        onClick={() => isClickable && onMatchClick!(matchId!)}
                        className={`rounded-xl border border-slate-700/80 bg-linear-to-br from-slate-800/80 via-slate-900/80 to-slate-900/95 shadow-[0_8px_24px_rgba(2,6,23,0.35)] overflow-hidden ${isClickable ? "cursor-pointer hover:border-slate-500/80 transition-colors" : ""}`}
                        style={{ minHeight: `${BRACKET_CARD_HEIGHT}px` }}
                      >
                        <div
                          className={`px-3 py-2 flex items-center justify-between text-xs ${p[0]?.result === "win" ? "text-cyan-300" : "text-slate-300"}`}
                        >
                          <span className="truncate font-semibold">
                            {p1Label}
                          </span>
                          {p[0]?.result === "win" && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
                          )}
                        </div>
                        <div className="h-px bg-slate-700/80" />
                        <div
                          className={`px-3 py-2 flex items-center justify-between text-xs ${p[1]?.result === "win" ? "text-cyan-300" : "text-slate-300"}`}
                        >
                          <span className="truncate font-semibold">
                            {p2Label}
                          </span>
                          {p[1]?.result === "win" && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
                          )}
                        </div>
                        <div className="h-px bg-slate-700/70" />
                        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-slate-500 flex items-center justify-between">
                          <span>{match.status ?? "pending"}</span>
                          <span className="normal-case tracking-normal text-slate-500">
                            {scheduledAt ? formatDateTime(scheduledAt) : "TBD"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {ri < rounds.length - 1 && matches.length > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ overflow: "visible" }}
                  >
                    {matches.map((_, mi) => {
                      const centerY =
                        layout.topOffset +
                        mi * (BRACKET_CARD_HEIGHT + layout.gap) +
                        BRACKET_CARD_HEIGHT / 2;

                      return (
                        <div
                          key={`line-out-${mi}`}
                          className="absolute h-px bg-slate-600/80"
                          style={{
                            left: `${connectorLeft}px`,
                            top: `${centerY}px`,
                            width: `${BRACKET_CONNECTOR_OUT}px`,
                          }}
                        />
                      );
                    })}

                    {Array.from({ length: Math.floor(matches.length / 2) }).map(
                      (_, pairIndex) => {
                        const topMatchIndex = pairIndex * 2;
                        const bottomMatchIndex = topMatchIndex + 1;
                        const yTop =
                          layout.topOffset +
                          topMatchIndex * (BRACKET_CARD_HEIGHT + layout.gap) +
                          BRACKET_CARD_HEIGHT / 2;
                        const yBottom =
                          layout.topOffset +
                          bottomMatchIndex *
                            (BRACKET_CARD_HEIGHT + layout.gap) +
                          BRACKET_CARD_HEIGHT / 2;
                        const yMid = (yTop + yBottom) / 2;

                        return (
                          <div key={`pair-${pairIndex}`}>
                            <div
                              className="absolute w-px bg-slate-600/80"
                              style={{
                                left: `${connectorLeft + BRACKET_CONNECTOR_OUT}px`,
                                top: `${yTop}px`,
                                height: `${yBottom - yTop}px`,
                              }}
                            />
                            <div
                              className="absolute h-px bg-slate-600/80"
                              style={{
                                left: `${connectorLeft + BRACKET_CONNECTOR_OUT}px`,
                                top: `${yMid}px`,
                                width: `${BRACKET_CONNECTOR_IN}px`,
                              }}
                            />
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
