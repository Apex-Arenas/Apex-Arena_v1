export interface BracketParticipant {
  in_game_id?: string;
  username?: string;
  result?: string;
  score?: number;
  user_id?: string | { _id?: string; id?: string; username?: string };
  team_id?: string | { _id?: string; id?: string; name?: string; tag?: string };
}

export interface BracketDispute {
  is_disputed?: boolean;
  resolved?: boolean;
  dispute_reason?: string;
  resolution?: string;
}

export interface BracketMatch {
  _id?: string;
  id?: string;
  round?: number;
  round_number?: number;
  round_name?: string;
  match_number?: number;
  status?: string;
  scheduled_at?: string;
  scheduled_time?: string;
  schedule?: {
    scheduled_time?: string;
  };
  participants?: BracketParticipant[];
  winner_id?: string | { _id?: string; id?: string };
  loser_id?: string | { _id?: string; id?: string };
  result_reported_by?: string | { _id?: string; id?: string };
  result_reported_at?: string;
  result_confirmed_by?: string | { _id?: string; id?: string };
  result_confirmed_at?: string;
  dispute?: BracketDispute;
  player1?: Record<string, unknown>;
  player2?: Record<string, unknown>;
}

export interface BracketRound {
  round_number?: number;
  round?: number;
  round_name?: string;
  name?: string;
  matches?: BracketMatch[];
}

export const BRACKET_VISIBLE_STATUSES = new Set([
  "locked",
  "ready_to_start",
  "ongoing",
  "awaiting_results",
  "verifying_results",
  "completed",
  "started",
]);
