import type { EscrowStatusSummary } from "../../services/organizer.service";

// ─── Constants ──────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  registered: "bg-cyan-500/20 text-cyan-300",
  checked_in: "bg-green-500/20 text-green-300",
  pending_payment: "bg-amber-500/20 text-amber-300",
  disqualified: "bg-red-500/20 text-red-300",
  withdrawn: "bg-slate-600/20 text-slate-400",
  cancelled: "bg-slate-600/20 text-slate-400",
  waitlist: "bg-purple-500/20 text-purple-300",
};

export const ACTIVE_REGISTRANT_STATUSES = new Set([
  "registered",
  "checked_in",
  "pending_payment",
  "waitlist",
]);

export const ESCROW_STATUS_COLORS: Record<string, string> = {
  awaiting_organizer_deposit: "bg-amber-500/20 text-amber-300",
  open: "bg-green-500/20 text-green-300",
  locked: "bg-amber-500/20 text-amber-300",
  processing_fees: "bg-cyan-500/20 text-cyan-300",
  tournament_active: "bg-blue-500/20 text-blue-300",
  awaiting_results: "bg-purple-500/20 text-purple-300",
  verifying_winners: "bg-indigo-500/20 text-indigo-300",
  distributing_prizes: "bg-cyan-500/20 text-cyan-300",
  distributing_organizer: "bg-cyan-500/20 text-cyan-300",
  completed: "bg-green-500/20 text-green-300",
  disputed: "bg-red-500/20 text-red-300",
  cancelled: "bg-slate-600/20 text-slate-400",
};

export const FINAL_ESCROW_STATUSES = new Set(["completed", "cancelled", "disputed"]);

// ─── Formatters ────────────────────────────────────────────────────────────

export function formatDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatGhsFromPesewas(amount: number): string {
  return `GHS ${(amount / 100).toFixed(2)}`;
}

export function normalizeEscrowStatusLabel(status?: string): string {
  if (!status) return "unknown";
  return status.replace(/_/g, " ");
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CoOrganizerEntry {
  user_id:
    | {
        _id?: string;
        username?: string;
        email?: string;
        profile?: {
          first_name?: string;
          last_name?: string;
          avatar_url?: string;
        };
      }
    | string;
  status: "pending" | "accepted" | "declined";
  invited_at: string;
  accepted_at?: string;
}

export interface OrganizerSearchResult {
  user_id: string;
  username: string;
  email: string;
  name: string;
  avatar_url?: string;
}

export type EscrowStageState = "pending" | "active" | "completed";

export interface EscrowStageItem {
  key: string;
  label: string;
  hint: string;
  state: EscrowStageState;
  timestamp?: string;
  detail?: string;
}

export interface OrganizerBracketMatch {
  id: string;
  round: number;
  roundName?: string;
  matchNumber: number;
  bracketPosition?: string;
  status: string;
  participants: Array<{
    userId?: string;
    inGameId: string;
    score: number;
    result: string;
    isReady: boolean;
  }>;
  games?: Array<{ game_number: number; scores?: { participant_id?: string; score?: number }[] }>;
  format?: { best_of?: number };
  scheduledTime?: string;
}

// ─── Bracket parsing ─────────────────────────────────────────────────────────

export function toFlatBracketMatchRecords(
  payload: unknown,
): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    const hasRoundShape = payload.some(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        Array.isArray((item as Record<string, unknown>).matches),
    );

    if (hasRoundShape) {
      return payload.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const matches = (item as Record<string, unknown>).matches;
        return Array.isArray(matches)
          ? (matches as Record<string, unknown>[])
          : [];
      });
    }

    return payload.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object",
    );
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  return toFlatBracketMatchRecords(record.rounds ?? record.bracket ?? []);
}

export function extractOrganizerBracketMatches(
  payload: unknown,
): OrganizerBracketMatch[] {
  const rawMatches = toFlatBracketMatchRecords(payload);

  return rawMatches.map((raw) => {
    const roundCandidate = Number(raw.round ?? raw.round_number ?? 1);
    const schedule = (raw.schedule ?? {}) as Record<string, unknown>;
    const participants = Array.isArray(raw.participants)
      ? (raw.participants as Record<string, unknown>[]).map((p) => ({
          userId: p.user_id as string | undefined,
          inGameId: String(p.in_game_id ?? ""),
          score: Number(p.score ?? 0),
          result: String(p.result ?? "pending"),
          isReady: Boolean(p.is_ready ?? false),
        }))
      : [];

    return {
      id: String(raw._id ?? raw.id ?? ""),
      round:
        Number.isFinite(roundCandidate) && roundCandidate > 0
          ? roundCandidate
          : 1,
      roundName: raw.round_name as string | undefined,
      matchNumber: Number(raw.match_number ?? 0),
      bracketPosition: raw.bracket_position as string | undefined,
      status: String(raw.status ?? "pending"),
      participants,
      games: Array.isArray(raw.games) ? (raw.games as any[]) : undefined,
      format: raw.format as { best_of?: number } | undefined,
      scheduledTime: schedule.scheduled_time as string | undefined,
    };
  });
}

// ─── Escrow stage helpers ──────────────────────────────────────────────────

export function buildEscrowStages(escrow: EscrowStatusSummary): EscrowStageItem[] {
  const status = escrow.status;
  const schedule = escrow.processingSchedule;
  const winnerSubmissions = escrow.winnerSubmissions;
  const organizerDepositAt = escrow.organizerDeposit?.depositedAt;
  const winnersSubmitted = Boolean(escrow.processingSchedule?.winnersSubmitted);
  const prizesDistributed = Boolean(
    escrow.processingSchedule?.prizesDistributed,
  );

  const isStatus = (values: string[]) => values.includes(status);

  const depositState: EscrowStageState =
    status === "awaiting_organizer_deposit" ? "active" : "completed";

  const entriesState: EscrowStageState = isStatus(["open"])
    ? "active"
    : isStatus([
          "locked",
          "processing_fees",
          "tournament_active",
          "awaiting_results",
          "verifying_winners",
          "distributing_prizes",
          "distributing_organizer",
          "completed",
          "disputed",
          "cancelled",
        ])
      ? "completed"
      : "pending";

  const resultsState: EscrowStageState = isStatus([
    "tournament_active",
    "awaiting_results",
  ])
    ? "active"
    : winnersSubmitted ||
        isStatus([
          "verifying_winners",
          "distributing_prizes",
          "distributing_organizer",
          "completed",
        ])
      ? "completed"
      : "pending";

  const verifyState: EscrowStageState =
    status === "verifying_winners"
      ? "active"
      : isStatus(["distributing_prizes", "distributing_organizer", "completed"])
        ? "completed"
        : "pending";

  const prizeState: EscrowStageState =
    status === "distributing_prizes"
      ? "active"
      : prizesDistributed || isStatus(["distributing_organizer", "completed"])
        ? "completed"
        : "pending";

  const organizerState: EscrowStageState =
    status === "distributing_organizer"
      ? "active"
      : status === "completed"
        ? "completed"
        : "pending";

  return [
    {
      key: "deposit",
      label: "Organizer Deposit",
      hint: "Prize pool funding",
      state: depositState,
      timestamp: organizerDepositAt,
      detail: undefined,
    },
    {
      key: "entries",
      label: "Player Entries",
      hint: "Registration and lock",
      state: entriesState,
      timestamp: schedule?.cancellationCutoff,
      detail:
        entriesState === "active"
          ? "Currently accepting entries"
          : undefined,
    },
    {
      key: "results",
      label: "Results Phase",
      hint: "Await winners",
      state: resultsState,
      timestamp: schedule?.tournamentEnd,
    },
    {
      key: "verify",
      label: "Winner Verification",
      hint: "ID matching checks",
      state: verifyState,
      timestamp: winnerSubmissions?.submittedAt,
      detail:
        winnerSubmissions && winnerSubmissions.allWinnersVerified === false
          ? "Winner verification has unresolved matches"
          : undefined,
    },
    {
      key: "prizes",
      label: "Prize Distribution",
      hint: "Player payout allocation",
      state: prizeState,
      detail:
        prizesDistributed && winnerSubmissions?.totalPrizeDistributedLabel
          ? `Distributed: ${winnerSubmissions.totalPrizeDistributedLabel}`
          : undefined,
    },
    {
      key: "organizer",
      label: "Organizer Payout",
      hint: "Final release",
      state: organizerState,
      detail: undefined,
    },
  ];
}

export function getEscrowStageVisual(state: EscrowStageState): {
  cardClass: string;
  dotClass: string;
  badgeClass: string;
  label: string;
} {
  if (state === "completed") {
    return {
      cardClass:
        "border-emerald-400/35 bg-linear-to-br from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-100",
      dotClass: "bg-emerald-300",
      badgeClass:
        "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30",
      label: "Completed",
    };
  }

  if (state === "active") {
    return {
      cardClass:
        "border-cyan-400/35 bg-linear-to-br from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-100",
      dotClass: "bg-cyan-300 animate-pulse",
      badgeClass: "bg-cyan-500/20 text-cyan-200 border border-cyan-400/30",
      label: "In Progress",
    };
  }

  return {
    cardClass: "border-slate-700 bg-slate-900/70 text-slate-300",
    dotClass: "bg-slate-500",
    badgeClass: "bg-slate-800 text-slate-400 border border-slate-700",
    label: "Pending",
  };
}
