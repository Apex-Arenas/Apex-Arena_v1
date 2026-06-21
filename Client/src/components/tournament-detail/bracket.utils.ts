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
  const inGameId = participant.in_game_id?.trim();
  if (inGameId && inGameId !== "TBD") return inGameId;
  if (participant.username) return participant.username;

  if (participant.user_id && typeof participant.user_id === "object") {
    const username = participant.user_id.username;
    if (username) return username;
  }

  // Fallback: show in_game_id even if it's 'TBD' to distinguish from truly empty slot
  if (inGameId) return inGameId;

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

function sortByMatchNumber(matches: BracketMatch[]): BracketMatch[] {
  return [...matches].sort(
    (a, b) => (a.match_number ?? Number.MAX_SAFE_INTEGER) - (b.match_number ?? Number.MAX_SAFE_INTEGER),
  );
}

function groupByRound(matches: BracketMatch[], bracket: string): BracketRound[] {
  const byRound = new Map<number, BracketMatch[]>();
  matches.forEach((m) => {
    const r = Number(m.round ?? m.round_number ?? 1) || 1;
    const arr = byRound.get(r) ?? [];
    arr.push(m);
    byRound.set(r, arr);
  });
  return Array.from(byRound.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, ms]) => ({
      round,
      round_number: round,
      bracket,
      matches: sortByMatchNumber(ms),
    }));
}

function buildRoundsFromFlatMatches(matches: BracketMatch[]): BracketRound[] {
  // Detect double elimination by bracket_position values
  const isDE = matches.some((m) =>
    m.bracket_position === "upper" ||
    m.bracket_position === "lower" ||
    m.bracket_position === "grand_final",
  );

  if (isDE) {
    const wbMatches = matches.filter(
      (m) => m.bracket_position === "upper" || m.bracket_position === "main",
    );
    const lbMatches = matches.filter((m) => m.bracket_position === "lower");
    const gfMatches = matches.filter((m) => m.bracket_position === "grand_final");

    const wbRounds = groupByRound(wbMatches, "upper");
    const lbRounds = groupByRound(lbMatches, "lower");

    const hasGrandFinalMatch = gfMatches.length > 0;
    // Two possible shapes here:
    // - Legacy tournaments (generated before the losers-bracket removal) have a
    //   separate bolted-on Grand Final match — the WB's own last round is really
    //   the Semi Finals feeding into it.
    // - Current tournaments have no separate Grand Final match at all — the WB
    //   reduces naturally all the way to one match, which IS the Grand Final.
    // Label accordingly so both old and new data render with correct names.
    const wbTotal = wbRounds.length;
    wbRounds.forEach((r, i) => {
      const fromEnd = wbTotal - 1 - i; // 0 = last round, 1 = second-to-last, etc.
      if (hasGrandFinalMatch) {
        if (fromEnd === 0) r.round_name = "Semi Finals";
        else if (fromEnd === 1) r.round_name = "Quarter Finals";
        else r.round_name = `Round ${i + 1}`;
      } else {
        if (fromEnd === 0) r.round_name = "Grand Final";
        else if (fromEnd === 1) r.round_name = "Semi Finals";
        else if (fromEnd === 2) r.round_name = "Quarter Finals";
        else r.round_name = `Round ${i + 1}`;
      }
      r.name = r.round_name;
      r.bracket = !hasGrandFinalMatch && fromEnd === 0 ? "grand_final" : "upper";
    });

    // Label LB rounds
    const lbTotal = lbRounds.length;
    lbRounds.forEach((r, i) => {
      r.round_name = i === lbTotal - 1 ? "LB Finals" : `LB Round ${i + 1}`;
      r.name = r.round_name;
    });

    const gfRound: BracketRound[] = hasGrandFinalMatch
      ? [{ round: 1, round_number: 1, bracket: "grand_final", round_name: "Grand Final", name: "Grand Final", matches: sortByMatchNumber(gfMatches) }]
      : [];

    return [...wbRounds, ...lbRounds, ...gfRound];
  }

  // Single elimination / round robin: group by round number
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
    .map(([round, roundMatches]) => ({
      round,
      round_number: round,
      round_name: roundMatches[0]?.round_name,
      name: roundMatches[0]?.round_name,
      matches: sortByMatchNumber(roundMatches),
    }));
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
