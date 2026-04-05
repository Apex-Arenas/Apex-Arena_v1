import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Trophy,
  Users,
  CalendarDays,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  X,
  Shield,
  Gamepad2,
  Globe,
  Award,
  RefreshCw,
  Upload,
} from "lucide-react";
import {
  tournamentService,
  type MyTournamentRegistration,
  type Tournament,
} from "../../../services/tournament.service";
import { apiGet, apiPost } from "../../../utils/api.utils";
import { TOURNAMENT_ENDPOINTS } from "../../../config/api.config";
import { useAuth } from "../../../lib/auth-context";
import { uploadImageMedia } from "../../../services/media-upload.service";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

function formatFee(isFree: boolean, fee: number, currency: string) {
  if (isFree) return "Free";
  return `${currency} ${(fee / 100).toFixed(2)}`;
}

function formatPrize(pesewas: number, currency: string) {
  return `${currency} ${(pesewas / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

const REGISTRATION_STATUS_COLORS: Record<string, string> = {
  registered: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  checked_in: "bg-green-500/20 text-green-300 border-green-500/30",
  pending_payment: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  waitlist: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  withdrawn: "bg-slate-600/20 text-slate-400 border-slate-600/30",
  cancelled: "bg-slate-600/20 text-slate-400 border-slate-600/30",
  disqualified: "bg-red-500/20 text-red-300 border-red-500/30",
};

const ACTIVE_STATUSES = new Set([
  "registered",
  "checked_in",
  "pending_payment",
  "waitlist",
]);

// ─── Register Modal ───────────────────────────────────────────────────────────

function RegisterModal({
  tournament,
  onClose,
  onSuccess,
}: {
  tournament: Tournament;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [canJoin, setCanJoin] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    tournamentService
      .canRegister(tournament.id)
      .then((result) => {
        if (!active) return;
        setCanJoin(result.canRegister);
        setEligibilityReason(
          result.canRegister
            ? null
            : (result.reason ??
                "You are not eligible to join this tournament."),
        );
      })
      .catch(() => {
        if (!active) return;
        setCanJoin(false);
        setEligibilityReason("Unable to verify eligibility right now.");
      })
      .finally(() => {
        if (active) setIsCheckingEligibility(false);
      });
    return () => {
      active = false;
    };
  }, [tournament.id]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canJoin) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await tournamentService.register(tournament.id);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Join Tournament
            </h2>
            <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">
              {tournament.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleJoin} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-800/60 rounded-lg px-3 py-2">
              <p className="text-slate-400 text-xs">Entry Fee</p>
              <p className="font-semibold text-white mt-0.5">
                {formatFee(
                  tournament.isFree,
                  tournament.entryFee,
                  tournament.currency,
                )}
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-lg px-3 py-2">
              <p className="text-slate-400 text-xs">Format</p>
              <p className="font-semibold text-white mt-0.5 capitalize">
                {tournament.format ?? "Solo"}
              </p>
            </div>
          </div>

          {!tournament.isFree && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Entry fee of{" "}
                <strong>
                  {formatFee(
                    tournament.isFree,
                    tournament.entryFee,
                    tournament.currency,
                  )}
                </strong>{" "}
                will be deducted from your wallet.
              </span>
            </div>
          )}

          {isCheckingEligibility ? (
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              Checking eligibility…
            </div>
          ) : !canJoin && eligibilityReason ? (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {eligibilityReason}
            </div>
          ) : null}

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2.5 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCheckingEligibility || !canJoin}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-60 transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Joining…" : "Confirm & Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Bracket ─────────────────────────────────────────────────────────────────

interface BracketParticipant {
  in_game_id?: string;
  username?: string;
  result?: string;
  score?: number;
  user_id?: string | { _id?: string; id?: string; username?: string };
  team_id?: string | { _id?: string; id?: string; name?: string; tag?: string };
}

interface BracketDispute {
  is_disputed?: boolean;
  resolved?: boolean;
  dispute_reason?: string;
  resolution?: string;
}

interface BracketMatch {
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

interface BracketRound {
  round_number?: number;
  round?: number;
  round_name?: string;
  name?: string;
  matches?: BracketMatch[];
}

const BRACKET_VISIBLE_STATUSES = new Set([
  "locked",
  "ready_to_start",
  "ongoing",
  "awaiting_results",
  "verifying_results",
  "completed",
  // Legacy/compat status seen in some payloads
  "started",
]);

function extractEntityId(
  value?: string | { _id?: string; id?: string },
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value._id === "string") return value._id;
  if (typeof value.id === "string") return value.id;
  return "";
}

function getParticipantEntityId(participant?: BracketParticipant): string {
  if (!participant) return "";
  const userId = extractEntityId(participant.user_id);
  if (userId) return userId;
  return extractEntityId(participant.team_id);
}

function getParticipantLabel(participant?: BracketParticipant): string {
  if (!participant) return "TBD";
  if (participant.in_game_id) return participant.in_game_id;
  if (participant.username) return participant.username;

  if (participant.user_id && typeof participant.user_id === "object") {
    const username = participant.user_id.username;
    if (username) return username;
  }

  return "TBD";
}

function matchIncludesCurrentPlayer(
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

function getOpponentLabel(
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

function extractBracketRounds(payload: unknown): BracketRound[] {
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

const BRACKET_CARD_HEIGHT = 82;
const BRACKET_BASE_UNIT = 104;
const BRACKET_CONNECTOR_OUT = 18;
const BRACKET_CONNECTOR_IN = 30;
const BRACKET_COLUMN_WIDTH = 228;

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

function BracketView({ rounds }: { rounds: BracketRound[] }) {
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

                    return (
                      <div
                        key={match._id ?? match.id ?? mi}
                        className="rounded-xl border border-slate-700/80 bg-linear-to-br from-slate-800/80 via-slate-900/80 to-slate-900/95 shadow-[0_8px_24px_rgba(2,6,23,0.35)] overflow-hidden"
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

// ─── Main Page ────────────────────────────────────────────────────────────────

const TournamentDetail = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [myRegistration, setMyRegistration] =
    useState<MyTournamentRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [bracketRounds, setBracketRounds] = useState<BracketRound[]>([]);
  const [isLoadingBracket, setIsLoadingBracket] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConfirmingMatch, setIsConfirmingMatch] = useState<string | null>(
    null,
  );
  const [activeSubmitMatch, setActiveSubmitMatch] =
    useState<BracketMatch | null>(null);
  const [submitWinnerId, setSubmitWinnerId] = useState("");
  const [submitVideoUrl, setSubmitVideoUrl] = useState("");
  const [submitScreenshotFile, setSubmitScreenshotFile] = useState<File | null>(
    null,
  );
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [activeDisputeMatch, setActiveDisputeMatch] =
    useState<BracketMatch | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeScreenshotFile, setDisputeScreenshotFile] =
    useState<File | null>(null);
  const [disputeEvidenceUrl, setDisputeEvidenceUrl] = useState("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  const hasFetched = useRef(false);

  const loadRegistration = useCallback(async (tid: string) => {
    try {
      const list = await tournamentService.getMyRegistrations();
      const found = list.find((r) => r.tournamentId === tid) ?? null;
      setMyRegistration(found);
    } catch {
      setMyRegistration(null);
    }
  }, []);

  const loadCheckInStatus = useCallback(async (tid: string) => {
    try {
      const res = await apiGet(
        `${TOURNAMENT_ENDPOINTS.CHECK_IN_STATUS}/${tid}/check-in/status`,
      );
      if (res.success) {
        setCheckInStatus(res.data as Record<string, unknown>);
      }
    } catch {
      // not critical
    }
  }, []);

  const loadBracket = useCallback(async (tid: string) => {
    setIsLoadingBracket(true);
    try {
      const res = await apiGet(
        `${TOURNAMENT_ENDPOINTS.BRACKET}/${tid}/bracket`,
      );
      if (res.success) {
        const rounds = extractBracketRounds(res.data);
        setBracketRounds(rounds);
      }
    } catch {
      setBracketRounds([]);
    } finally {
      setIsLoadingBracket(false);
    }
  }, []);

  const loadAll = useCallback(
    async (silent = false) => {
      if (!tournamentId) return;
      if (!silent) setIsLoading(true);
      try {
        const t = await tournamentService.getTournamentDetail(tournamentId);
        setTournament(t);
        await Promise.all([
          loadRegistration(tournamentId),
          loadCheckInStatus(tournamentId),
        ]);
        if (t && BRACKET_VISIBLE_STATUSES.has(t.status)) {
          void loadBracket(tournamentId);
        }
      } catch {
        if (!silent) setTournament(null);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [tournamentId, loadRegistration, loadCheckInStatus, loadBracket],
  );

  const handleRefresh = useCallback(async () => {
    if (!tournamentId || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const t = await tournamentService.getTournamentDetail(tournamentId);
      setTournament(t);
      await Promise.all([
        loadRegistration(tournamentId),
        loadCheckInStatus(tournamentId),
      ]);
      if (t && BRACKET_VISIBLE_STATUSES.has(t.status)) {
        await loadBracket(tournamentId);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [
    tournamentId,
    isRefreshing,
    loadRegistration,
    loadCheckInStatus,
    loadBracket,
  ]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void loadAll();
  }, [loadAll]);

  // Auto-poll every 10s only while check-in is open.
  // Bracket refresh is now manual to avoid automatic updates in the bracket section.
  useEffect(() => {
    if (!tournament) return;
    const shouldPoll =
      tournament.status === "open" &&
      Boolean(
        checkInStatus?.is_check_in_open ??
        checkInStatus?.check_in_open ??
        false,
      );
    if (!shouldPoll) return;

    const id = window.setInterval(() => {
      void loadAll(true);
    }, 10000);

    return () => window.clearInterval(id);
  }, [tournament?.status, checkInStatus, loadAll]);

  const handleRegisterSuccess = async () => {
    setShowRegisterModal(false);
    setSuccessMsg(
      "You've successfully joined the tournament! Check your status below.",
    );
    if (tournamentId) await loadRegistration(tournamentId);
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  const handleCheckIn = async () => {
    if (!tournamentId) return;
    setIsCheckingIn(true);
    setErrorMsg(null);
    try {
      await apiPost(
        `${TOURNAMENT_ENDPOINTS.CHECK_IN}/${tournamentId}/check-in`,
        {},
      );
      setSuccessMsg("You have checked in successfully!");
      await loadRegistration(tournamentId);
      await loadCheckInStatus(tournamentId);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Check-in failed.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleWithdraw = async () => {
    if (!tournamentId || !myRegistration) return;
    const reason = withdrawReason.trim();
    if (!reason) return;
    setIsWithdrawing(true);
    setErrorMsg(null);
    try {
      await tournamentService.unregister(tournamentId, reason);
      setMyRegistration(null);
      setShowWithdrawModal(false);
      setWithdrawReason("");
      setSuccessMsg("You have withdrawn from the tournament.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Withdrawal failed.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const ensureMatchSessionExists = useCallback(async (matchId: string) => {
    await apiGet(`${TOURNAMENT_ENDPOINTS.MATCH_SESSION}/${matchId}/session`, {
      skipCache: true,
    });
  }, []);

  const uploadMatchEvidence = useCallback(
    async (
      matchId: string,
      file: File,
      description: string,
    ): Promise<string> => {
      const uploadedUrl = await uploadImageMedia(
        file,
        `match-proof/${matchId}`,
      );

      try {
        await ensureMatchSessionExists(matchId);
        await apiPost(
          `${TOURNAMENT_ENDPOINTS.MATCH_SESSION_EVIDENCE}/${matchId}/session/evidence`,
          {
            fileUrl: uploadedUrl,
            fileType: "image",
            description,
          },
        );
      } catch {
        // Evidence endpoint is best-effort. Result submission should still proceed.
      }

      return uploadedUrl;
    },
    [ensureMatchSessionExists],
  );

  const openSubmitResultModal = useCallback((match: BracketMatch) => {
    const participants = (match.participants ?? []).filter(
      (participant) => getParticipantEntityId(participant).length > 0,
    );
    const firstWinner = getParticipantEntityId(participants[0]);

    setActiveSubmitMatch(match);
    setSubmitWinnerId(firstWinner);
    setSubmitVideoUrl("");
    setSubmitScreenshotFile(null);
  }, []);

  const closeSubmitResultModal = useCallback(() => {
    setActiveSubmitMatch(null);
    setSubmitWinnerId("");
    setSubmitVideoUrl("");
    setSubmitScreenshotFile(null);
  }, []);

  const handleSubmitMatchResult = useCallback(async () => {
    if (!activeSubmitMatch) return;

    const matchId = activeSubmitMatch._id ?? activeSubmitMatch.id;
    if (!matchId || !submitWinnerId) {
      setErrorMsg("Please select a winner before submitting.");
      return;
    }

    setIsSubmittingResult(true);
    setErrorMsg(null);

    try {
      const screenshots: string[] = [];

      if (submitScreenshotFile) {
        const proofUrl = await uploadMatchEvidence(
          matchId,
          submitScreenshotFile,
          "Result proof screenshot",
        );
        screenshots.push(proofUrl);
      }

      await tournamentService.submitMatchResult(matchId, {
        winnerId: submitWinnerId,
        proof: {
          screenshots,
          videoUrl: submitVideoUrl.trim() || undefined,
        },
      });

      closeSubmitResultModal();
      setSuccessMsg("Result submitted. Waiting for opponent confirmation.");
      await handleRefresh();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to submit match result.",
      );
    } finally {
      setIsSubmittingResult(false);
    }
  }, [
    activeSubmitMatch,
    closeSubmitResultModal,
    handleRefresh,
    submitScreenshotFile,
    submitVideoUrl,
    submitWinnerId,
    uploadMatchEvidence,
  ]);

  const handleConfirmMatchResult = useCallback(
    async (matchId: string) => {
      setIsConfirmingMatch(matchId);
      setErrorMsg(null);

      try {
        await tournamentService.confirmMatchResult(matchId);
        setSuccessMsg("Result confirmed. Bracket has been updated.");
        await handleRefresh();
        setTimeout(() => setSuccessMsg(null), 5000);
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Failed to confirm match result.",
        );
      } finally {
        setIsConfirmingMatch(null);
      }
    },
    [handleRefresh],
  );

  const openDisputeModal = useCallback((match: BracketMatch) => {
    setActiveDisputeMatch(match);
    setDisputeReason("");
    setDisputeScreenshotFile(null);
    setDisputeEvidenceUrl("");
  }, []);

  const closeDisputeModal = useCallback(() => {
    setActiveDisputeMatch(null);
    setDisputeReason("");
    setDisputeScreenshotFile(null);
    setDisputeEvidenceUrl("");
  }, []);

  const handleSubmitDispute = useCallback(async () => {
    if (!activeDisputeMatch) return;

    const matchId = activeDisputeMatch._id ?? activeDisputeMatch.id;
    if (!matchId || disputeReason.trim().length < 5) {
      setErrorMsg("Please provide a brief dispute reason.");
      return;
    }

    setIsSubmittingDispute(true);
    setErrorMsg(null);

    try {
      const evidence: string[] = [];

      if (disputeScreenshotFile) {
        const evidenceUrl = await uploadMatchEvidence(
          matchId,
          disputeScreenshotFile,
          "Dispute evidence screenshot",
        );
        evidence.push(evidenceUrl);
      }

      if (disputeEvidenceUrl.trim().length > 0) {
        evidence.push(disputeEvidenceUrl.trim());
      }

      await tournamentService.disputeMatchResult(matchId, {
        reason: disputeReason.trim(),
        evidence,
      });

      closeDisputeModal();
      setSuccessMsg("Dispute submitted. Organizer review is required.");
      await handleRefresh();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to submit dispute.",
      );
    } finally {
      setIsSubmittingDispute(false);
    }
  }, [
    activeDisputeMatch,
    closeDisputeModal,
    disputeEvidenceUrl,
    disputeReason,
    disputeScreenshotFile,
    handleRefresh,
    uploadMatchEvidence,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <AlertCircle className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400">Tournament not found.</p>
        <button
          onClick={() => navigate("/auth/tournaments")}
          className="text-cyan-400 text-sm hover:underline"
        >
          Back to Tournaments
        </button>
      </div>
    );
  }

  const isRegistered =
    myRegistration !== null && ACTIVE_STATUSES.has(myRegistration.status);
  const isCheckedIn =
    myRegistration?.checkedIn === true ||
    myRegistration?.status === "checked_in";
  const canWithdraw =
    myRegistration !== null && ACTIVE_STATUSES.has(myRegistration.status);

  const checkInOpen = Boolean(
    checkInStatus?.is_check_in_open ??
    checkInStatus?.check_in_open ??
    checkInStatus?.isOpen ??
    false,
  );
  const checkInStart = checkInStatus?.check_in_start as string | undefined;
  const checkInEnd = checkInStatus?.check_in_end as string | undefined;

  const showBracketSection = BRACKET_VISIBLE_STATUSES.has(tournament.status);
  const canRegister = tournament.status === "open" && !isRegistered;
  const registrationClosed =
    !["open"].includes(tournament.status) && !isRegistered;

  const currentUserId = user?.id;
  const myInGameId = myRegistration?.inGameId;

  const allBracketMatches = bracketRounds.flatMap(
    (round) => round.matches ?? [],
  );

  const myMatches = allBracketMatches.filter((match) =>
    matchIncludesCurrentPlayer(match, currentUserId, myInGameId),
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Back + Refresh */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/auth/tournaments")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Tournaments
        </button>
        <button
          onClick={() => {
            void handleRefresh();
          }}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Toasts */}
      {successMsg && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800">
        {tournament.thumbnailUrl ? (
          <img
            src={tournament.thumbnailUrl}
            alt=""
            className="w-full h-48 sm:h-64 object-cover"
          />
        ) : (
          <div className="w-full h-48 sm:h-64 bg-linear-to-br from-slate-900 via-cyan-950/30 to-slate-900 flex items-center justify-center">
            <Gamepad2 className="w-20 h-20 text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            {tournament.game?.logoUrl && (
              <img
                src={tournament.game.logoUrl}
                alt=""
                className="w-5 h-5 rounded object-cover"
              />
            )}
            <span className="text-xs text-slate-300">
              {tournament.game?.name ?? "Unknown Game"}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full capitalize ml-1
              ${
                tournament.status === "open"
                  ? "bg-green-500/20 text-green-300"
                  : tournament.status === "started" ||
                      tournament.status === "ongoing"
                    ? "bg-blue-500/20 text-blue-300"
                    : tournament.status === "completed"
                      ? "bg-slate-500/20 text-slate-400"
                      : tournament.status === "cancelled"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {tournament.status.replace("_", " ")}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            {tournament.title}
          </h1>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tournament.prizePool && tournament.prizePool > 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-cyan-400" /> Prize Pool
            </p>
            <p className="text-base font-bold text-cyan-300">
              {formatPrize(tournament.prizePool, tournament.currency)}
            </p>
          </div>
        ) : null}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Players
          </p>
          <p className="text-base font-bold text-white">
            {tournament.currentCount} / {tournament.maxParticipants}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> Starts
          </p>
          <p className="text-base font-bold text-white">
            {formatDate(tournament.schedule.tournamentStart)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" /> Entry
          </p>
          <p className="text-base font-bold text-white">
            {formatFee(
              tournament.isFree,
              tournament.entryFee,
              tournament.currency,
            )}
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          {tournament.description && (
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="font-display text-base font-semibold text-white mb-3">
                About This Tournament
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {tournament.description}
              </p>
            </section>
          )}

          {/* Schedule */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="font-display text-base font-semibold text-white mb-4">
              Schedule
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                {
                  label: "Registration Open",
                  value: tournament.schedule.registrationStart,
                },
                {
                  label: "Registration Closes",
                  value: tournament.schedule.registrationEnd,
                },
                {
                  label: "Tournament Start",
                  value: tournament.schedule.tournamentStart,
                },
                {
                  label: "Tournament End",
                  value: tournament.schedule.tournamentEnd,
                },
                {
                  label: "Check-in Opens",
                  value: tournament.schedule.checkInStart ?? checkInStart,
                },
                {
                  label: "Check-in Closes",
                  value: tournament.schedule.checkInEnd ?? checkInEnd,
                },
              ]
                .filter((row) => Boolean(row.value))
                .map((row) => (
                  <div key={row.label} className="flex flex-col gap-0.5">
                    <span className="text-xs text-slate-400">{row.label}</span>
                    <span className="font-medium text-white">
                      {formatDateTime(row.value)}
                    </span>
                  </div>
                ))}
            </div>
          </section>

          {/* Prize Distribution */}
          {!tournament.isFree &&
            tournament.prizeDistribution &&
            tournament.prizeDistribution.length > 0 && (
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="font-display text-base font-semibold text-white mb-4">
                  Prize Distribution
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {tournament.prizeDistribution.slice(0, 3).map((d) => (
                    <div
                      key={d.position}
                      className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-center"
                    >
                      <p className="text-xs text-slate-400 mb-1">
                        {d.position === 1
                          ? "🥇 1st"
                          : d.position === 2
                            ? "🥈 2nd"
                            : "🥉 3rd"}
                      </p>
                      <p className="text-base font-bold text-cyan-300">
                        {d.percentage}%
                      </p>
                      {tournament.prizePool && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatPrize(
                            Math.floor(
                              (tournament.prizePool * d.percentage) / 100,
                            ),
                            tournament.currency,
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* Rules */}
          {tournament.rules && (
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="font-display text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Rules
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {tournament.rules}
              </p>
            </section>
          )}

          {/* Details */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="font-display text-base font-semibold text-white mb-4">
              Details
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Format", value: tournament.format },
                { label: "Type", value: tournament.tournamentType },
                { label: "Region", value: tournament.region },
                {
                  label: "Min Players",
                  value:
                    tournament.minParticipants > 0
                      ? String(tournament.minParticipants)
                      : null,
                },
                {
                  label: "Visibility",
                  value: tournament.visibility
                    ? tournament.visibility.charAt(0).toUpperCase() +
                      tournament.visibility.slice(1)
                    : null,
                },
              ]
                .filter((row) => Boolean(row.value))
                .map((row) => (
                  <div key={row.label}>
                    <p className="text-xs text-slate-400">{row.label}</p>
                    <p className="font-medium text-white capitalize mt-0.5">
                      {row.value}
                    </p>
                  </div>
                ))}
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Registration card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-white">
              {isRegistered ? "My Registration" : "Join Tournament"}
            </h2>

            {isRegistered && myRegistration ? (
              <>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border capitalize
                  ${REGISTRATION_STATUS_COLORS[myRegistration.status] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {myRegistration.status.replace("_", " ")}
                </div>

                <div className="text-xs text-slate-400 space-y-1.5">
                  <p>Joined: {formatDate(myRegistration.registeredAt)}</p>
                  {isCheckedIn && (
                    <p className="text-green-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Checked in
                    </p>
                  )}
                </div>

                {/* Check-in button */}
                {checkInOpen &&
                  !isCheckedIn &&
                  myRegistration.status === "registered" && (
                    <button
                      onClick={() => {
                        void handleCheckIn();
                      }}
                      disabled={isCheckingIn}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500 text-slate-950 text-sm font-semibold hover:bg-green-400 disabled:opacity-60 transition-colors"
                    >
                      {isCheckingIn ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {isCheckingIn ? "Checking in…" : "Check In Now"}
                    </button>
                  )}

                {/* Check-in window info */}
                {!checkInOpen &&
                  !isCheckedIn &&
                  myRegistration.status === "registered" && (
                    <div className="flex items-start gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Check-in is not open yet.
                        {tournament.schedule.checkInStart
                          ? ` Opens ${formatDateTime(tournament.schedule.checkInStart)}.`
                          : ""}
                      </span>
                    </div>
                  )}

                {/* Withdraw */}
                {canWithdraw && myRegistration.status !== "checked_in" && (
                  <button
                    onClick={() => setShowWithdrawModal(true)}
                    className="w-full py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm font-medium hover:bg-red-500 hover:text-white transition-colors"
                  >
                    Withdraw
                  </button>
                )}
              </>
            ) : canRegister ? (
              <>
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {tournament.currentCount} / {tournament.maxParticipants}{" "}
                    players
                  </p>
                  {!tournament.isFree && (
                    <p className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      Entry fee deducted from wallet
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="w-full py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 transition-colors"
                >
                  Join Tournament
                </button>
              </>
            ) : registrationClosed ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Lock className="w-4 h-4 shrink-0" />
                Registration is{" "}
                {tournament.status === "completed"
                  ? "closed (tournament ended)"
                  : "not open yet"}
              </div>
            ) : null}
          </div>

          {/* Tournament info summary */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Format</span>
              <span className="text-white font-medium capitalize">
                {tournament.format ?? "Solo"}
              </span>
            </div>
            <div className="h-px bg-slate-800" />
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Type</span>
              <span className="text-white font-medium capitalize">
                {tournament.tournamentType ?? "Standard"}
              </span>
            </div>
            {tournament.region && (
              <>
                <div className="h-px bg-slate-800" />
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Region</span>
                  <span className="text-white font-medium">
                    {tournament.region}
                  </span>
                </div>
              </>
            )}
            <div className="h-px bg-slate-800" />
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Min Players</span>
              <span className="text-white font-medium">
                {tournament.minParticipants}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Registered-only & bracket sections ── */}

      {/* Check-in banner (prominent when window is open and registered but not checked in) */}
      {isRegistered && checkInOpen && !isCheckedIn && (
        <section className="rounded-xl border border-green-500/40 bg-green-500/10 p-5 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-green-200">
                Check-in is now open!
              </p>
              <p className="text-sm text-green-300/80 mt-0.5">
                Make sure to check in before the window closes to keep your
                spot.
                {checkInEnd ? ` Closes ${formatDateTime(checkInEnd)}.` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              void handleCheckIn();
            }}
            disabled={isCheckingIn}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-slate-950 text-sm font-semibold hover:bg-green-400 disabled:opacity-60 transition-colors"
          >
            {isCheckingIn ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isCheckingIn ? "Checking in…" : "Check In"}
          </button>
        </section>
      )}

      {/* Bracket */}
      {showBracketSection && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-cyan-400" />
              Tournament Bracket
            </h2>
            <button
              onClick={() => {
                void handleRefresh();
              }}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {isLoadingBracket ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : (
            <BracketView rounds={bracketRounds} />
          )}
        </section>
      )}

      {/* My Match Voting */}
      {isRegistered && showBracketSection && (
        <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
          <h2 className="font-display text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
            My Match Voting
          </h2>

          {myMatches.length === 0 ? (
            <p className="text-sm text-slate-400">
              No active matches for your registration yet. Your voting actions
              will appear here when your bracket match is ready.
            </p>
          ) : (
            <div className="space-y-3">
              {myMatches.map((match, index) => {
                const matchId = match._id ?? match.id ?? "";
                const reporterId = extractEntityId(match.result_reported_by);
                const confirmerId = extractEntityId(match.result_confirmed_by);
                const winnerId = extractEntityId(match.winner_id);
                const disputeActive = Boolean(
                  match.dispute?.is_disputed && !match.dispute?.resolved,
                );
                const isCompleted = match.status === "completed";
                const iReported = Boolean(
                  currentUserId && reporterId === currentUserId,
                );
                const isConfirmLoading = isConfirmingMatch === matchId;

                const canSubmitResult =
                  Boolean(matchId) &&
                  !reporterId &&
                  !disputeActive &&
                  !isCompleted &&
                  ["scheduled", "ready_check", "ongoing"].includes(
                    match.status ?? "",
                  );

                const canConfirmResult =
                  Boolean(matchId) &&
                  Boolean(reporterId) &&
                  !disputeActive &&
                  !isCompleted &&
                  Boolean(currentUserId) &&
                  reporterId !== currentUserId;

                const canDisputeResult = canConfirmResult;

                const winnerParticipant = (match.participants ?? []).find(
                  (participant) =>
                    getParticipantEntityId(participant) === winnerId,
                );

                const statusText = disputeActive
                  ? "Result disputed - waiting for organizer resolution"
                  : isCompleted
                    ? "Match completed"
                    : reporterId && confirmerId
                      ? "Result confirmed"
                      : iReported
                        ? "Awaiting opponent confirmation"
                        : reporterId
                          ? "Opponent submitted a result"
                          : "Result not submitted yet";

                return (
                  <div
                    key={matchId || index}
                    className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Match #{match.match_number ?? index + 1}
                        </p>
                        <p className="text-xs text-slate-400">
                          Round {match.round ?? match.round_number ?? 1} •
                          Opponent:{" "}
                          {getOpponentLabel(match, currentUserId, myInGameId)}
                        </p>
                      </div>
                      <span className="text-[11px] uppercase tracking-wide text-slate-300 px-2.5 py-1 rounded-full border border-slate-600 bg-slate-800/60">
                        {match.status ?? "pending"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      <p>{statusText}</p>
                      {winnerParticipant && (
                        <p className="text-cyan-300">
                          Submitted winner:{" "}
                          {getParticipantLabel(winnerParticipant)}
                        </p>
                      )}
                      {match.dispute?.is_disputed &&
                        match.dispute?.dispute_reason && (
                          <p className="text-amber-300">
                            Dispute reason: {match.dispute.dispute_reason}
                          </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canSubmitResult && (
                        <button
                          onClick={() => openSubmitResultModal(match)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors"
                        >
                          Submit Result
                        </button>
                      )}

                      {canConfirmResult && (
                        <button
                          onClick={() => {
                            void handleConfirmMatchResult(matchId);
                          }}
                          disabled={isConfirmLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-green-500 text-slate-950 hover:bg-green-400 disabled:opacity-60 transition-colors"
                        >
                          {isConfirmLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {isConfirmLoading
                            ? "Confirming..."
                            : "Confirm Result"}
                        </button>
                      )}

                      {canDisputeResult && (
                        <button
                          onClick={() => openDisputeModal(match)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Dispute Result
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Modals */}
      {showRegisterModal && (
        <RegisterModal
          tournament={tournament}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            void handleRegisterSuccess();
          }}
        />
      )}

      {activeSubmitMatch && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-start justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Submit Match Result
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Select the winner and attach proof if available.
                </p>
              </div>
              <button
                onClick={closeSubmitResultModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Winner
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(activeSubmitMatch.participants ?? []).map(
                    (participant, idx) => {
                      const participantId = getParticipantEntityId(participant);
                      if (!participantId) return null;

                      const selected = submitWinnerId === participantId;

                      return (
                        <button
                          key={`${participantId}-${idx}`}
                          onClick={() => setSubmitWinnerId(participantId)}
                          className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                            selected
                              ? "border-cyan-500 bg-cyan-500/15 text-cyan-200"
                              : "border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-500"
                          }`}
                        >
                          {getParticipantLabel(participant)}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Proof Screenshot (optional)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSubmitScreenshotFile(file);
                  }}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-100 hover:file:bg-slate-600"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Video URL (optional)
                </span>
                <input
                  type="url"
                  value={submitVideoUrl}
                  onChange={(event) => setSubmitVideoUrl(event.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </label>

              <div className="flex gap-3">
                <button
                  onClick={closeSubmitResultModal}
                  className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    void handleSubmitMatchResult();
                  }}
                  disabled={isSubmittingResult || submitWinnerId.length === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-60 transition-colors"
                >
                  {isSubmittingResult ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isSubmittingResult ? "Submitting..." : "Submit Result"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeDisputeMatch && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-start justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Dispute Match Result
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Provide your reason and evidence for organizer review.
                </p>
              </div>
              <button
                onClick={closeDisputeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Dispute Reason
                </span>
                <textarea
                  value={disputeReason}
                  onChange={(event) => setDisputeReason(event.target.value)}
                  rows={3}
                  placeholder="Explain what happened..."
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Screenshot Evidence (optional)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setDisputeScreenshotFile(file);
                  }}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-100 hover:file:bg-slate-600"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Evidence URL (optional)
                </span>
                <input
                  type="url"
                  value={disputeEvidenceUrl}
                  onChange={(event) =>
                    setDisputeEvidenceUrl(event.target.value)
                  }
                  placeholder="https://..."
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </label>

              <div className="flex gap-3">
                <button
                  onClick={closeDisputeModal}
                  className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    void handleSubmitDispute();
                  }}
                  disabled={
                    isSubmittingDispute || disputeReason.trim().length < 5
                  }
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 disabled:opacity-60 transition-colors"
                >
                  {isSubmittingDispute ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {isSubmittingDispute ? "Submitting..." : "Submit Dispute"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-start justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Withdraw
                </h2>
                <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">
                  {tournament.title}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawReason("");
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Please provide a reason for withdrawing.</span>
              </div>
              <textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="e.g. Scheduling conflict…"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawReason("");
                  }}
                  className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    void handleWithdraw();
                  }}
                  disabled={isWithdrawing || withdrawReason.trim().length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-400 disabled:opacity-60 transition-colors"
                >
                  {isWithdrawing && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {isWithdrawing ? "Withdrawing…" : "Confirm Withdraw"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetail;
