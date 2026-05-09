import type { BracketMatch, BracketParticipant, BracketRound } from "./types";

export function extractEntityId(
  value?: string | { _id?: string; id?: string },
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value._id === "string") return value._id;
  if (typeof value.id === "string") return value.id;
  return "";
}

export function getParticipantEntityId(participant?: BracketParticipant): string {
  if (!participant) return "";
  const userId = extractEntityId(participant.user_id);
  if (userId) return userId;
  return extractEntityId(participant.team_id);
}

export function getParticipantLabel(participant?: BracketParticipant): string {
  if (!participant) return "TBD";
  if (participant.in_game_id) return participant.in_game_id;
  if (participant.username) return participant.username;

  if (participant.user_id && typeof participant.user_id === "object") {
    const username = participant.user_id.username;
    if (username) return username;
  }

  return "TBD";
}

export function matchIncludesCurrentPlayer(
  match: BracketMatch,
  currentUserId?: string,
  myInGameId?: string,
): boolean {
  const participants = match.participants ?? [];
  const normalizedInGameId = myInGameId?.trim().toLowerCase();

  return participants.some((participant) => {
    const participantId = getParticipantEntityId(participant);
    if (currentUserId && participantId === currentUserId) {
      return true;
    }

    const participantInGameId = participant.in_game_id?.trim().toLowerCase();
    return Boolean(
      normalizedInGameId &&
        participantInGameId &&
        participantInGameId === normalizedInGameId,
    );
  });
}

export function getOpponentLabel(
  match: BracketMatch,
  currentUserId?: string,
  myInGameId?: string,
): string {
  const participants = match.participants ?? [];
  const normalizedInGameId = myInGameId?.trim().toLowerCase();

  const opponent = participants.find((participant) => {
    const participantId = getParticipantEntityId(participant);
    if (currentUserId && participantId === currentUserId) {
      return false;
    }

    const participantInGameId = participant.in_game_id?.trim().toLowerCase();
    if (
      normalizedInGameId &&
      participantInGameId &&
      participantInGameId === normalizedInGameId
    ) {
      return false;
    }

    return true;
  });

  return getParticipantLabel(opponent);
}

function buildRoundsFromFlatMatches(matches: BracketMatch[]): BracketRound[] {
  // Check if this is a double elimination bracket (has upper/lower/grand_final positions)
  const hasDoubleElim = matches.some(
    (m) => m.bracket_position === "upper" || m.bracket_position === "lower" || m.bracket_position === "grand_final"
  );

  if (hasDoubleElim) {
    return buildDoubleElimRounds(matches);
  }

  const byRound = new Map<number, BracketMatch[]>();

  matches.forEach((match) => {
    const roundValue = match.round ?? match.round_number ?? 1;
    const round = Number.isFinite(Number(roundValue)) ? Number(roundValue) : 1;
    const existing = byRound.get(round) ?? [];
    existing.push(match);
    byRound.set(round, existing);
  });

  return Array.from(byRound.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, roundMatches]) => {
      const sortedMatches = [...roundMatches].sort((a, b) => {
        const aNum = a.match_number ?? Number.MAX_SAFE_INTEGER;
        const bNum = b.match_number ?? Number.MAX_SAFE_INTEGER;
        return aNum - bNum;
      });

      return {
        round,
        round_number: round,
        round_name: sortedMatches[0]?.round_name,
        name: sortedMatches[0]?.round_name,
        matches: sortedMatches,
      };
    });
}

function buildDoubleElimRounds(matches: BracketMatch[]): BracketRound[] {
  const upper = matches.filter((m) => m.bracket_position === "upper");
  const lower = matches.filter((m) => m.bracket_position === "lower");
  const gf = matches.filter((m) => m.bracket_position === "grand_final");

  const sort = (ms: BracketMatch[]) =>
    [...ms].sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0));

  const groupByRound = (ms: BracketMatch[], prefix: string, labelFn: (r: number, total: number) => string): BracketRound[] => {
    const byRound = new Map<number, BracketMatch[]>();
    ms.forEach((m) => {
      const r = m.round ?? m.round_number ?? 1;
      byRound.set(r, [...(byRound.get(r) ?? []), m]);
    });
    const total = byRound.size;
    return Array.from(byRound.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, roundMatches]) => ({
        round,
        round_number: round,
        round_name: `${prefix}_r${round}`,
        name: labelFn(round, total),
        matches: sort(roundMatches),
      }));
  };

  const ubRounds = groupByRound(upper, "upper", (r, total) => {
    if (r === total) return "Upper Final";
    if (r === total - 1) return "Upper Semi";
    return `Upper R${r}`;
  });

  const lbRounds = groupByRound(lower, "lower", (r, total) => {
    if (r === total) return "Lower Final";
    return `Lower R${r}`;
  });

  const gfRounds: BracketRound[] =
    gf.length > 0
      ? [{ round: 999, round_number: 999, round_name: "grand_final", name: "Grand Final", matches: sort(gf) }]
      : [];

  return [...ubRounds, ...lbRounds, ...gfRounds];
}

export function extractBracketRounds(payload: unknown): BracketRound[] {
  if (Array.isArray(payload)) {
    return buildRoundsFromFlatMatches(payload as BracketMatch[]);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidate = record.rounds ?? record.bracket;

  if (!Array.isArray(candidate)) {
    return [];
  }

  const hasRoundShape = candidate.some(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      Array.isArray((item as BracketRound).matches),
  );

  if (hasRoundShape) {
    return candidate as BracketRound[];
  }

  return buildRoundsFromFlatMatches(candidate as BracketMatch[]);
}
