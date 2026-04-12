import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../utils/api.utils';
import { TOURNAMENT_ENDPOINTS, FINANCE_ENDPOINTS } from '../config/api.config';
import { generateUniqueIdempotencyKey } from '../utils/idempotency.utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TournamentGame {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface TournamentSchedule {
  registrationStart?: string;
  registrationEnd?: string;
  tournamentStart?: string;
  tournamentEnd?: string;
  checkInStart?: string;
  checkInEnd?: string;
}

export interface PrizeDistribution {
  position: number;
  percentage: number;
  amount?: number;
}

export interface LeagueSettings {
  pointsPerWin: number;
  pointsPerDraw: number;
  pointsPerLoss: number;
  legs: number;
  currentMatchweek: number;
  totalMatchweeks: number;
  fixturesGenerated: boolean;
  fixturesGeneratedAt?: string;
}

export interface Tournament {
  id: string;
  title: string;
  description?: string;
  game?: TournamentGame;
  organizerId: string;
  organizerName?: string;
  tournamentType?: string;
  format?: string;
  isFree: boolean;
  entryFee: number;
  currency: string;
  maxParticipants: number;
  minParticipants: number;
  currentCount: number;
  status: string;
  schedule: TournamentSchedule;
  prizePool?: number;
  organizerGrossDeposit?: number;
  prizeDistribution?: PrizeDistribution[];
  thumbnailUrl?: string;
  bannerUrl?: string;
  rules?: string;
  region?: string;
  visibility: string;
  isRegistered?: boolean;
  leagueSettings?: LeagueSettings;
}

export interface LeagueTableRow {
  userId?: string;
  teamId?: string;
  displayName: string;
  inGameId?: string;
  avatarUrl?: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string[];
  positionChange: number;
}

export interface LeagueMatch {
  matchId: string;
  matchweek: number;
  player1Id?: string;
  player1Name: string;
  player1Avatar?: string;
  player2Id?: string;
  player2Name: string;
  player2Avatar?: string;
  status: string;
  score1?: number;
  score2?: number;
  winnerId?: string;
  scheduledAt?: string;
}

export interface LeagueMatchweek {
  week: number;
  matches: LeagueMatch[];
}

export interface LeagueOverview {
  tournamentId: string;
  currentMatchweek: number;
  totalMatchweeks: number;
  fixturesGenerated: boolean;
  table: LeagueTableRow[];
  currentWeekMatches: LeagueMatch[];
}

export interface FullMatch {
  matchId: string;
  matchweek?: number;
  status: string;
  player1Id: string;
  player1Name: string;
  player1Score: number;
  player1Result: string;
  player1IsReady: boolean;
  player2Id: string;
  player2Name: string;
  player2Score: number;
  player2Result: string;
  player2IsReady: boolean;
  winnerId?: string;
  resultReportedBy?: string;
  resultConfirmationDeadline?: string;
  isDisputed: boolean;
  scheduledAt?: string;
  screenshotUrl?: string;
}

export interface TournamentFilters {
  page?: number;
  limit?: number;
  gameId?: string;
  status?: string;
  isFree?: boolean;
  search?: string;
}

export interface TournamentsResult {
  tournaments: Tournament[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface RegistrationPayload {
  inGameId?: string;
  registrationType?: 'solo' | 'team';
  teamId?: string;
}

export interface RegistrationResult {
  registrationId: string;
  status: string;
  message?: string;
}

export interface CanRegisterResult {
  canRegister: boolean;
  reason?: string;
}

export interface MyTournamentRegistration {
  registrationId: string;
  tournamentId: string;
  tournamentTitle: string;
  tournamentStatus: string;
  tournamentStart?: string;
  tournamentGameName?: string;
  status: string;
  checkedIn: boolean;
  inGameId?: string;
  registeredAt?: string;
}

export interface MatchResultProofPayload {
  screenshots?: string[];
  videoUrl?: string;
}

export interface SubmitMatchResultPayload {
  winnerId: string;
  proof?: MatchResultProofPayload;
}

export interface DisputeMatchResultPayload {
  reason: string;
  evidence?: string[];
}

function extractId(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const direct = record._id ?? record.id;
    if (typeof direct === 'string' || typeof direct === 'number') {
      return String(direct);
    }

    const nested = record.tournament_id ?? record.tournamentId;
    if (typeof nested === 'string' || typeof nested === 'number') {
      return String(nested);
    }
  }

  return '';
}

function normalizeStatus(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function extractGameId(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    const id = String(value);
    return id.length > 0 ? id : undefined;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const id = record._id ?? record.id;
    if (typeof id === 'string' || typeof id === 'number') {
      const normalized = String(id);
      return normalized.length > 0 ? normalized : undefined;
    }
  }

  return undefined;
}

function extractGameName(value: unknown): string | undefined {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nameCandidate = record.name ?? record.title ?? record.game_name ?? record.gameName;
    if (typeof nameCandidate === 'string' && nameCandidate.trim().length > 0) {
      return nameCandidate;
    }
  }

  return undefined;
}

async function fetchGameLookupByIds(gameIds: string[]): Promise<Map<string, TournamentGame>> {
  const uniqueGameIds = Array.from(new Set(gameIds.filter((id) => id.length > 0)));
  if (uniqueGameIds.length === 0) {
    return new Map();
  }

  const response = await apiGet(TOURNAMENT_ENDPOINTS.GAMES, { skipCache: true });
  if (!response.success) {
    return new Map();
  }

  const payload = response.data as Record<string, unknown>;
  const list = Array.isArray(payload)
    ? (payload as Record<string, unknown>[])
    : ((payload.games ?? payload.data ?? []) as Record<string, unknown>[]);

  const lookup = new Map<string, TournamentGame>();
  list.forEach((gameRaw) => {
    const id = extractGameId(gameRaw._id ?? gameRaw.id);
    const name = typeof gameRaw.name === 'string' ? gameRaw.name : undefined;
    if (!id || !name) {
      return;
    }

    if (uniqueGameIds.includes(id)) {
      lookup.set(id, {
        id,
        name,
        logoUrl: gameRaw.logo_url as string | undefined,
      });
    }
  });

  return lookup;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

export function mapTournament(
  raw: Record<string, unknown>,
  gameLookup?: Map<string, TournamentGame>,
): Tournament {
  const game = (raw.game_id ?? raw.game ?? {}) as Record<string, unknown>;
  const schedule = (raw.schedule ?? {}) as Record<string, unknown>;
  const prize = (raw.prize_structure ?? {}) as Record<string, unknown>;
  const capacity = (raw.capacity ?? {}) as Record<string, unknown>;
  const organizer = (raw.organizer_id ?? {}) as Record<string, unknown>;
  const isFree = Boolean(raw.is_free ?? false);
  const entryFee = Number(raw.entry_fee ?? 0);
  const rawStatus = String(raw.status ?? 'draft');
  const normalizedStatus =
    rawStatus === 'awaiting_deposit' && (isFree || entryFee <= 0)
      ? 'open'
      : rawStatus;

  const explicitGameName =
    (typeof raw.game_name === 'string' && raw.game_name.trim().length > 0
      ? (raw.game_name as string)
      : undefined) ??
    (typeof raw.gameName === 'string' && raw.gameName.trim().length > 0
      ? (raw.gameName as string)
      : undefined);

  const gameId =
    extractGameId(raw.game_id) ??
    extractGameId(raw.game) ??
    extractGameId((raw.game as Record<string, unknown> | undefined)?._id);
  const rawGameName = extractGameName(raw.game_id) ?? extractGameName(raw.game) ?? explicitGameName;
  const fallbackGame = gameId ? gameLookup?.get(gameId) : undefined;

  const mappedGame: TournamentGame | undefined =
    gameId || rawGameName || fallbackGame
      ? {
          id: gameId ?? fallbackGame?.id ?? '',
          name: rawGameName ?? fallbackGame?.name ?? '',
          logoUrl:
            (game.logo_url as string | undefined) ??
            ((raw.game as Record<string, unknown> | undefined)?.logo_url as string | undefined) ??
            fallbackGame?.logoUrl,
        }
      : undefined;

  return {
    id: String(raw._id ?? raw.id ?? ''),
    title: String(raw.title ?? ''),
    description: raw.description as string | undefined,
    game: mappedGame,
    organizerId: String(organizer._id ?? raw.organizer_id ?? ''),
    organizerName: (organizer.username ?? organizer.first_name) as string | undefined,
    tournamentType: raw.tournament_type as string | undefined,
    format: raw.format as string | undefined,
    isFree,
    entryFee,
    currency: String(raw.currency ?? 'GHS'),
    maxParticipants: Number(capacity.max_participants ?? raw.max_participants ?? 0),
    minParticipants: Number(capacity.min_participants ?? raw.min_participants ?? 0),
    currentCount: Number(capacity.current_participants ?? capacity.current_count ?? raw.current_participants ?? raw.current_count ?? 0),
    status: normalizedStatus,
    schedule: {
      registrationStart: schedule.registration_start as string | undefined,
      registrationEnd: schedule.registration_end as string | undefined,
      tournamentStart: schedule.tournament_start as string | undefined,
      tournamentEnd: schedule.tournament_end as string | undefined,
      checkInStart: schedule.check_in_start as string | undefined,
      checkInEnd: schedule.check_in_end as string | undefined,
    },
    prizePool: (prize.net_prize_pool ?? prize.net_pool) as number | undefined,
    organizerGrossDeposit: (prize.organizer_gross_deposit ?? raw.organizer_gross_deposit) as number | undefined,
    prizeDistribution: (prize.distribution as Record<string, unknown>[] | undefined)?.map((d) => ({
      position: Number(d.position ?? 0),
      percentage: Number(d.percentage ?? 0),
      amount: d.amount as number | undefined,
    })),
    thumbnailUrl: raw.thumbnail_url as string | undefined,
    bannerUrl: raw.banner_url as string | undefined,
    rules: (raw.rules as Record<string, unknown>)?.description as string | undefined,
    region: raw.region as string | undefined,
    visibility: String(raw.visibility ?? 'public'),
    leagueSettings: raw.league_settings
      ? (() => {
          const ls = raw.league_settings as Record<string, unknown>;
          return {
            pointsPerWin: Number(ls.points_per_win ?? 3),
            pointsPerDraw: Number(ls.points_per_draw ?? 1),
            pointsPerLoss: Number(ls.points_per_loss ?? 0),
            legs: Number(ls.legs ?? 1),
            currentMatchweek: Number(ls.current_matchweek ?? 0),
            totalMatchweeks: Number(ls.total_matchweeks ?? 0),
            fixturesGenerated: Boolean(ls.fixtures_generated ?? false),
            fixturesGeneratedAt: ls.fixtures_generated_at as string | undefined,
          };
        })()
      : undefined,
  };
}

function mapLeagueMatches(list: Record<string, unknown>[]): LeagueMatch[] {
  return list.map((m) => {
    const parts = (Array.isArray(m.participants) ? m.participants : []) as Record<string, unknown>[];
    const p1 = (parts[0] ?? {}) as Record<string, unknown>;
    const p2 = (parts[1] ?? {}) as Record<string, unknown>;
    const scheduledTime =
      (m.schedule as Record<string, unknown> | undefined)?.scheduled_time ??
      m.scheduled_at ?? m.scheduledAt;
    return {
      matchId: String(m._id ?? m.id ?? ''),
      matchweek: Number(m.matchweek ?? 0),
      player1Id: String(p1.user_id ?? p1.team_id ?? p1._id ?? ''),
      player1Name: String(p1.in_game_id ?? p1.display_name ?? p1.username ?? ''),
      player1Avatar: p1.avatar_url as string | undefined,
      player2Id: String(p2.user_id ?? p2.team_id ?? p2._id ?? ''),
      player2Name: String(p2.in_game_id ?? p2.display_name ?? p2.username ?? ''),
      player2Avatar: p2.avatar_url as string | undefined,
      status: String(m.status ?? 'scheduled'),
      score1: p1.score !== undefined ? Number(p1.score) : undefined,
      score2: p2.score !== undefined ? Number(p2.score) : undefined,
      winnerId: m.winner_id as string | undefined,
      scheduledAt: scheduledTime as string | undefined,
    };
  });
}

// ─── Service ────────────────────────────────────────────────────────────────

export const tournamentService = {
  async getTournaments(filters: TournamentFilters = {}): Promise<TournamentsResult> {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.gameId) params.set('game_id', filters.gameId);
    if (filters.status) params.set('status', filters.status);
    if (filters.isFree !== undefined) params.set('is_free', String(filters.isFree));
    if (filters.search) params.set('search', filters.search);

    const url = params.toString()
      ? `${TOURNAMENT_ENDPOINTS.TOURNAMENTS}?${params}`
      : TOURNAMENT_ENDPOINTS.TOURNAMENTS;

    const response = await apiGet(url);
    if (!response.success) return { tournaments: [], pagination: { total: 0, page: 1, limit: 10, pages: 0 } };

    const data = response.data as Record<string, unknown>;
    const list = Array.isArray(data) ? data : ((data.tournaments ?? data.data ?? []) as Record<string, unknown>[]);

    const missingGameIds = list
      .map((item) => {
        const hasName =
          typeof item.game_name === 'string' ||
          typeof item.gameName === 'string' ||
          extractGameName(item.game_id) !== undefined ||
          extractGameName(item.game) !== undefined;
        if (hasName) return undefined;
        return extractGameId(item.game_id) ?? extractGameId(item.game);
      })
      .filter((id): id is string => Boolean(id));

    const gameLookup = await fetchGameLookupByIds(missingGameIds);

    const pagination = (data.pagination ?? {}) as Record<string, unknown>;
    const page = Number(pagination.page ?? data.page ?? filters.page ?? 1);
    const limit = Number(pagination.limit ?? data.limit ?? filters.limit ?? 10);
    const total = Number(pagination.total ?? data.total ?? list.length);
    const pages = Number(
      pagination.pages ??
      (limit > 0 ? Math.ceil(total / limit) : 1),
    );

    return {
      tournaments: list.map((t) =>
        mapTournament(t as Record<string, unknown>, gameLookup),
      ),
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };
  },

  async getTournamentDetail(tournamentId: string): Promise<Tournament | null> {
    const response = await apiGet(
      `${TOURNAMENT_ENDPOINTS.TOURNAMENT_DETAIL}/${tournamentId}`,
      { skipCache: true },
    );
    if (!response.success) return null;

    const data = response.data as Record<string, unknown>;
    const raw = (data.tournament ?? data) as Record<string, unknown>;

    const gameId = extractGameId(raw.game_id) ?? extractGameId(raw.game);
    const hasGameName = Boolean(extractGameName(raw.game_id) ?? extractGameName(raw.game));
    const gameLookup = gameId && !hasGameName ? await fetchGameLookupByIds([gameId]) : undefined;

    return mapTournament(raw, gameLookup);
  },

  async canRegister(tournamentId: string): Promise<CanRegisterResult> {
    const response = await apiGet(
      `${TOURNAMENT_ENDPOINTS.VALIDATION_CAN_REGISTER}/${tournamentId}/can-register`,
    );
    if (!response.success) return { canRegister: false, reason: 'Unable to check eligibility' };

    const data = response.data as Record<string, unknown>;
    return {
      canRegister: Boolean(data.allowed ?? data.can_register ?? data.canRegister ?? false),
      reason: data.reason as string | undefined,
    };
  },

  async register(tournamentId: string, payload: RegistrationPayload = {}): Promise<RegistrationResult> {
    const body: Record<string, unknown> = {};
    if (payload.inGameId) body.in_game_id = payload.inGameId;
    if (payload.registrationType) body.registration_type = payload.registrationType;
    if (payload.teamId) body.team_id = payload.teamId;

    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.REGISTER}/${tournamentId}/register`,
      body,
    );

    if (!response.success) {
      const msg = response.error?.message ?? 'Registration failed';
      throw new Error(msg);
    }

    const data = response.data as Record<string, unknown>;
    const reg = (data.registration ?? data) as Record<string, unknown>;
    return {
      registrationId: String(reg._id ?? reg.id ?? ''),
      status: String(reg.status ?? 'registered'),
      message: data.message as string | undefined,
    };
  },

  async unregister(tournamentId: string, reason?: string): Promise<void> {
    const body = reason && reason.trim().length > 0 ? { reason: reason.trim() } : undefined;
    const response = await apiDelete(
      `${TOURNAMENT_ENDPOINTS.UNREGISTER}/${tournamentId}/unregister`,
      body ? { body: JSON.stringify(body) } : undefined,
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to unregister';
      throw new Error(msg);
    }
  },

  async getMyRegistrations(status?: string): Promise<MyTournamentRegistration[]> {
    const query = new URLSearchParams();
    if (status) query.set('status', status);

    const url = query.toString()
      ? `${TOURNAMENT_ENDPOINTS.MY_REGISTRATIONS}?${query}`
      : TOURNAMENT_ENDPOINTS.MY_REGISTRATIONS;

    const response = await apiGet(url);
    if (!response.success) return [];

    const data = response.data as Record<string, unknown>;
    const list = Array.isArray(data)
      ? data
      : ((data.registrations ?? data.data ?? []) as Record<string, unknown>[]);

    return list
      .map((item) => {
        const rawTournament =
          item.tournament_id ?? item.tournament ?? item.tournamentId ?? {};
        const tournament =
          rawTournament && typeof rawTournament === 'object'
            ? (rawTournament as Record<string, unknown>)
            : {};
        const game = (tournament.game_id ?? {}) as Record<string, unknown>;
        const schedule = (tournament.schedule ?? {}) as Record<string, unknown>;
        const checkIn = (item.check_in ?? {}) as Record<string, unknown>;

        const tournamentId =
          extractId(rawTournament) ||
          extractId(item.tournament_id) ||
          extractId(item.tournamentId);

        return {
          registrationId: String(
            item._id ?? item.id ?? item.registration_id ?? item.registrationId ?? '',
          ),
          tournamentId,
          tournamentTitle: String(tournament.title ?? 'Tournament'),
          tournamentStatus: normalizeStatus(tournament.status),
          tournamentStart:
            (schedule.tournament_start as string | undefined) ??
            (schedule.start_date as string | undefined) ??
            (schedule.startDate as string | undefined),
          tournamentGameName: (game.name as string | undefined),
          status: normalizeStatus(item.status),
          checkedIn: Boolean(checkIn.checked_in ?? false),
          inGameId: (item.in_game_id as string | undefined) ??
            (item.inGameId as string | undefined),
          registeredAt:
            (item.created_at as string | undefined) ??
            (item.createdAt as string | undefined),
        };
      })
      .filter((item) => item.tournamentId.length > 0);
  },

  async submitMatchResult(
    matchId: string,
    payload: SubmitMatchResultPayload,
  ): Promise<void> {
    const body: Record<string, unknown> = {
      winnerId: payload.winnerId,
    };

    if (payload.proof) {
      body.proof = {
        screenshots: payload.proof.screenshots ?? [],
        video_url: payload.proof.videoUrl,
      };
    }

    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.MATCH_RESULT}/${matchId}/result`,
      body,
    );

    if (!response.success) {
      const msg = response.error?.message ?? 'Failed to submit match result';
      throw new Error(msg);
    }
  },

  async confirmMatchResult(matchId: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.MATCH_CONFIRM}/${matchId}/confirm`,
      {},
    );

    if (!response.success) {
      const msg = response.error?.message ?? 'Failed to confirm match result';
      throw new Error(msg);
    }
  },

  async disputeMatchResult(
    matchId: string,
    payload: DisputeMatchResultPayload,
  ): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.MATCH_DISPUTE}/${matchId}/dispute`,
      {
        reason: payload.reason,
        evidence: payload.evidence ?? [],
      },
    );

    if (!response.success) {
      const msg = response.error?.message ?? 'Failed to dispute match result';
      throw new Error(msg);
    }
  },

  async markMatchReady(matchId: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.MATCH_READY}/${matchId}/ready`,
      {},
    );
    if (!response.success) {
      const msg = response.error?.message ?? 'Failed to mark ready';
      throw new Error(msg);
    }
  },

  // ─── Check-in ──────────────────────────────────────────────────────────────

  async checkIn(tournamentId: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.CHECK_IN}/${tournamentId}/check-in`,
      {},
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Check-in failed';
      throw new Error(msg);
    }
  },

  async getCheckInStatus(tournamentId: string): Promise<Record<string, unknown>> {
    const response = await apiGet(
      `${TOURNAMENT_ENDPOINTS.CHECK_IN_STATUS}/${tournamentId}/check-in/status`,
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch check-in status';
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  // ─── Bracket & Results ─────────────────────────────────────────────────────

  async getBracket(tournamentId: string): Promise<Record<string, unknown>> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.BRACKET}/${tournamentId}`);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch bracket';
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  async getCurrentRound(tournamentId: string): Promise<Record<string, unknown>> {
    const response = await apiGet(
      `${TOURNAMENT_ENDPOINTS.BRACKET_CURRENT_ROUND}/${tournamentId}/current-round`,
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch current round';
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  async getTournamentResults(tournamentId: string): Promise<Record<string, unknown>> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.RESULTS}/${tournamentId}`);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch results';
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  // ─── Registration ──────────────────────────────────────────────────────────

  async updateInGameId(registrationId: string, inGameId: string): Promise<void> {
    const response = await apiPatch(
      `${TOURNAMENT_ENDPOINTS.UPDATE_IN_GAME_ID}/${registrationId}/in-game-id`,
      { in_game_id: inGameId },
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to update in-game ID';
      throw new Error(msg);
    }
  },

  // ─── Match Detail & Sessions ───────────────────────────────────────────────

  async getMatchDetail(matchId: string): Promise<Record<string, unknown>> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.MATCHES}/${matchId}`);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch match';
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  async getMatchSession(matchId: string): Promise<Record<string, unknown>> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.MATCH_SESSION}/${matchId}/session`);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch match session';
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  async getMatchSessionMessages(matchId: string): Promise<Record<string, unknown>[]> {
    const response = await apiGet(
      `${TOURNAMENT_ENDPOINTS.MATCH_SESSION_MESSAGES}/${matchId}/session/messages`,
    );
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    return (Array.isArray(data) ? data : (data.messages ?? data.data ?? [])) as Record<string, unknown>[];
  },

  async sendMatchSessionMessage(matchId: string, content: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.MATCH_SESSION_MESSAGES}/${matchId}/session/messages`,
      { content },
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to send message';
      throw new Error(msg);
    }
  },

  async submitMatchEvidence(matchId: string, evidence: string[]): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.MATCH_SESSION_EVIDENCE}/${matchId}/session/evidence`,
      { evidence },
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to submit evidence';
      throw new Error(msg);
    }
  },

  // ─── Game Profiles ─────────────────────────────────────────────────────────

  async getGameProfiles(): Promise<Record<string, unknown>[]> {
    const response = await apiGet(TOURNAMENT_ENDPOINTS.GAME_PROFILES);
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    return (Array.isArray(data) ? data : (data.profiles ?? data.game_profiles ?? data.data ?? [])) as Record<string, unknown>[];
  },

  async getGameProfile(gameId: string): Promise<Record<string, unknown> | null> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.GAME_PROFILE_DETAIL}/${gameId}`);
    if (!response.success) return null;
    const data = response.data as Record<string, unknown>;
    return (data.profile ?? data) as Record<string, unknown>;
  },

  async upsertGameProfile(
    gameId: string,
    payload: { inGameId: string; skillLevel?: string },
  ): Promise<void> {
    const response = await apiPut(
      `${TOURNAMENT_ENDPOINTS.GAME_PROFILE_DETAIL}/${gameId}`,
      { in_game_id: payload.inGameId, skill_level: payload.skillLevel },
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to save game profile';
      throw new Error(msg);
    }
  },

  async deleteGameProfile(gameId: string): Promise<void> {
    const response = await apiDelete(`${TOURNAMENT_ENDPOINTS.GAME_PROFILE_DETAIL}/${gameId}`);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to delete game profile';
      throw new Error(msg);
    }
  },

  // ─── Game Requests ─────────────────────────────────────────────────────────

  async getGameRequests(filters: { status?: string; page?: number; limit?: number } = {}): Promise<Record<string, unknown>[]> {
    const query = new URLSearchParams();
    if (filters.status) query.set('status', filters.status);
    if (filters.page) query.set('page', String(filters.page));
    if (filters.limit) query.set('limit', String(filters.limit));
    const url = query.toString()
      ? `${TOURNAMENT_ENDPOINTS.GAME_REQUESTS}?${query}`
      : TOURNAMENT_ENDPOINTS.GAME_REQUESTS;
    const response = await apiGet(url);
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    return (Array.isArray(data) ? data : (data.requests ?? data.data ?? [])) as Record<string, unknown>[];
  },

  async submitGameRequest(payload: {
    gameName: string;
    genre?: string;
    platform?: string[];
    description?: string;
  }): Promise<void> {
    const response = await apiPost(TOURNAMENT_ENDPOINTS.GAME_REQUESTS, {
      game_name: payload.gameName,
      genre: payload.genre,
      platform: payload.platform,
      description: payload.description,
    });
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to submit game request';
      throw new Error(msg);
    }
  },

  async upvoteGameRequest(requestId: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.GAME_REQUEST_UPVOTE}/${requestId}/upvote`,
      {},
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to upvote';
      throw new Error(msg);
    }
  },

  // ─── Finance (Player Wallet) ───────────────────────────────────────────────

  async getWalletBalance(): Promise<{
    availableBalance: number;
    pendingBalance: number;
    totalBalance: number;
    currency: string;
  }> {
    const response = await apiGet(FINANCE_ENDPOINTS.WALLET);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch wallet';
      throw new Error(msg);
    }
    const data = response.data as Record<string, unknown>;
    return {
      availableBalance: Number(data.available_balance ?? 0),
      pendingBalance: Number(data.pending_balance ?? 0),
      totalBalance: Number(data.total_balance ?? 0),
      currency: String(data.currency ?? 'GHS'),
    };
  },

  async initiateTopUp(amountGhs: number): Promise<{ authorizationUrl?: string; reference?: string }> {
    const callbackUrl = `${window.location.origin}/payment/callback`;
    const response = await apiPost(FINANCE_ENDPOINTS.DEPOSIT, {
      amount_ghs: amountGhs,
      callback_url: callbackUrl,
      idempotency_key: generateUniqueIdempotencyKey(),
    });
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to initiate top-up';
      throw new Error(msg);
    }
    const data = response.data as Record<string, unknown>;
    return {
      authorizationUrl: data.authorization_url as string | undefined,
      reference: data.reference as string | undefined,
    };
  },

  async getMatchSessionHistory(matchId: string): Promise<Record<string, unknown>[]> {
    const response = await apiGet(
      `${TOURNAMENT_ENDPOINTS.MATCH_SESSION_HISTORY}/${matchId}/session/history`,
    );
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    return (Array.isArray(data) ? data : (data.history ?? data.events ?? data.data ?? [])) as Record<string, unknown>[];
  },

  async archiveMatchSession(matchId: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.MATCH_SESSION_ARCHIVE}/${matchId}/session/archive`,
      {},
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to archive session';
      throw new Error(msg);
    }
  },

  async getGameRequestDetail(requestId: string): Promise<Record<string, unknown> | null> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.GAME_REQUEST_DETAIL}/${requestId}`);
    if (!response.success) return null;
    const data = response.data as Record<string, unknown>;
    return (data.request ?? data) as Record<string, unknown>;
  },

  async getTransactionHistory(params: { page?: number; limit?: number; type?: string } = {}): Promise<Record<string, unknown>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.type) query.set('type', params.type);
    const url = query.toString()
      ? `${FINANCE_ENDPOINTS.TRANSACTIONS}?${query}`
      : FINANCE_ENDPOINTS.TRANSACTIONS;
    const response = await apiGet(url, { skipCache: true });
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch transactions';
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  // ─── League ────────────────────────────────────────────────────────────────

  async getLeagueTable(tournamentId: string): Promise<LeagueTableRow[]> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.LEAGUE}/${tournamentId}/table`, { skipCache: true });
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    const list = (Array.isArray(data) ? data : (data.table ?? [])) as Record<string, unknown>[];
    return list.map((r) => ({
      userId: (r.userId ?? r.user_id) as string | undefined,
      teamId: (r.teamId ?? r.team_id) as string | undefined,
      displayName: String(r.displayName ?? r.display_name ?? ''),
      inGameId: (r.inGameId ?? r.in_game_id) as string | undefined,
      avatarUrl: (r.avatarUrl ?? r.avatar_url) as string | undefined,
      position: Number(r.position ?? 0),
      played: Number(r.played ?? 0),
      won: Number(r.won ?? 0),
      drawn: Number(r.drawn ?? 0),
      lost: Number(r.lost ?? 0),
      goalsFor: Number(r.goalsFor ?? r.goals_for ?? 0),
      goalsAgainst: Number(r.goalsAgainst ?? r.goals_against ?? 0),
      goalDifference: Number(r.goalDifference ?? r.goal_difference ?? 0),
      points: Number(r.points ?? 0),
      form: Array.isArray(r.form) ? (r.form as string[]) : [],
      positionChange: Number(r.positionChange ?? r.position_change ?? 0),
    }));
  },

  async getLeagueMatchweeks(tournamentId: string): Promise<LeagueMatchweek[]> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.LEAGUE}/${tournamentId}/matchweeks`, { skipCache: true });
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    const list = (Array.isArray(data) ? data : (data.matchweeks ?? [])) as Record<string, unknown>[];
    return list.map((mw) => ({
      week: Number(mw.matchweek ?? mw.week ?? 0),
      matches: mapLeagueMatches((mw.matches ?? []) as Record<string, unknown>[]),
    }));
  },

  async getLeagueMatchweek(tournamentId: string, week: number): Promise<LeagueMatchweek | null> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.LEAGUE}/${tournamentId}/matchweeks/${week}`, { skipCache: true });
    if (!response.success) return null;
    const data = response.data as Record<string, unknown>;
    return {
      week: Number(data.week ?? week),
      matches: mapLeagueMatches((data.matches ?? []) as Record<string, unknown>[]),
    };
  },

  async getLeagueOverview(tournamentId: string): Promise<LeagueOverview | null> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.LEAGUE}/${tournamentId}/overview`, { skipCache: true });
    if (!response.success) return null;
    const data = response.data as Record<string, unknown>;
    const tableRaw = (Array.isArray(data.table) ? data.table : []) as Record<string, unknown>[];
    return {
      tournamentId: String(data.tournament_id ?? tournamentId),
      currentMatchweek: Number(data.current_matchweek ?? 0),
      totalMatchweeks: Number(data.total_matchweeks ?? 0),
      fixturesGenerated: Boolean(data.fixtures_generated ?? false),
      table: tableRaw.map((r) => ({
        userId: (r.userId ?? r.user_id) as string | undefined,
        teamId: (r.teamId ?? r.team_id) as string | undefined,
        displayName: String(r.displayName ?? r.display_name ?? ''),
        inGameId: (r.inGameId ?? r.in_game_id) as string | undefined,
        avatarUrl: (r.avatarUrl ?? r.avatar_url) as string | undefined,
        position: Number(r.position ?? 0),
        played: Number(r.played ?? 0),
        won: Number(r.won ?? 0),
        drawn: Number(r.drawn ?? 0),
        lost: Number(r.lost ?? 0),
        goalsFor: Number(r.goalsFor ?? r.goals_for ?? 0),
        goalsAgainst: Number(r.goalsAgainst ?? r.goals_against ?? 0),
        goalDifference: Number(r.goalDifference ?? r.goal_difference ?? 0),
        points: Number(r.points ?? 0),
        form: Array.isArray(r.form) ? (r.form as string[]) : [],
        positionChange: Number(r.positionChange ?? r.position_change ?? 0),
      })),
      currentWeekMatches: mapLeagueMatches((data.current_week_matches ?? data.currentWeekMatches ?? []) as Record<string, unknown>[]),
    };
  },

  async generateLeagueFixtures(tournamentId: string): Promise<void> {
    const response = await apiPost(`${TOURNAMENT_ENDPOINTS.LEAGUE}/${tournamentId}/generate`, {});
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to generate fixtures';
      throw new Error(msg);
    }
  },

  async advanceLeagueMatchweek(tournamentId: string): Promise<number> {
    const response = await apiPost(`${TOURNAMENT_ENDPOINTS.LEAGUE}/${tournamentId}/advance`, {});
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to advance matchweek';
      throw new Error(msg);
    }
    const data = response.data as Record<string, unknown>;
    return Number(data.currentMatchweek ?? data.current_matchweek ?? 0);
  },

  async recalculateLeagueStandings(tournamentId: string): Promise<void> {
    const response = await apiPost(`${TOURNAMENT_ENDPOINTS.LEAGUE}/${tournamentId}/standings/recalculate`, {});
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to recalculate standings';
      throw new Error(msg);
    }
  },

  // ─── Match Actions ─────────────────────────────────────────────────────────

  async getMatch(matchId: string): Promise<FullMatch | null> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.MATCHES}/${matchId}`, { skipCache: true });
    if (!response.success) return null;
    const m = (response.data as Record<string, unknown>);
    const parts = (Array.isArray(m.participants) ? m.participants : []) as Record<string, unknown>[];
    const p1 = (parts[0] ?? {}) as Record<string, unknown>;
    const p2 = (parts[1] ?? {}) as Record<string, unknown>;
    return {
      matchId: String(m._id ?? m.id ?? ''),
      matchweek: m.matchweek !== undefined ? Number(m.matchweek) : undefined,
      status: String(m.status ?? 'pending'),
      player1Id: String(p1.user_id ?? p1.team_id ?? ''),
      player1Name: String(p1.in_game_id ?? p1.display_name ?? p1.username ?? ''),
      player1Score: Number(p1.score ?? 0),
      player1Result: String(p1.result ?? 'pending'),
      player1IsReady: Boolean(p1.is_ready),
      player2Id: String(p2.user_id ?? p2.team_id ?? ''),
      player2Name: String(p2.in_game_id ?? p2.display_name ?? p2.username ?? ''),
      player2Score: Number(p2.score ?? 0),
      player2Result: String(p2.result ?? 'pending'),
      player2IsReady: Boolean(p2.is_ready),
      winnerId: m.winner_id as string | undefined,
      resultReportedBy: m.result_reported_by as string | undefined,
      resultConfirmationDeadline: m.result_confirmation_deadline as string | undefined,
      isDisputed: Boolean((m.dispute as Record<string, unknown> | undefined)?.is_disputed ?? false),
      scheduledAt: (m.schedule as Record<string, unknown> | undefined)?.scheduled_time as string | undefined,
      screenshotUrl: ((m.proof as Record<string, unknown> | undefined)?.screenshots as string[] | undefined)?.[0],
    };
  },

  async markReady(matchId: string): Promise<void> {
    const response = await apiPost(`${TOURNAMENT_ENDPOINTS.MATCH_READY}/${matchId}/ready`, {});
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to mark ready';
      throw new Error(msg);
    }
  },

  async submitMatchResult(
    matchId: string,
    winnerId: string | null, // null = draw
    proof?: { screenshots?: string[]; videoUrl?: string },
    scores?: { player1: number; player2: number },
  ): Promise<void> {
    const body: Record<string, unknown> = winnerId ? { winnerId } : { isDraw: true };
    if (proof) {
      body.proof = {
        ...(proof.screenshots?.length ? { screenshots: proof.screenshots } : {}),
        ...(proof.videoUrl ? { video_url: proof.videoUrl } : {}),
      };
    }
    if (scores) body.scores = scores;
    const response = await apiPost(`${TOURNAMENT_ENDPOINTS.MATCH_RESULT}/${matchId}/result`, body);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to submit result';
      throw new Error(msg);
    }
  },

  async confirmMatchResult(matchId: string): Promise<void> {
    const response = await apiPost(`${TOURNAMENT_ENDPOINTS.MATCH_CONFIRM}/${matchId}/confirm`, {});
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to confirm result';
      throw new Error(msg);
    }
  },

  async resolveMatchDispute(matchId: string, winnerId: string, resolution: string): Promise<void> {
    const response = await apiPost(`${TOURNAMENT_ENDPOINTS.MATCH_DISPUTE_RESOLVE}/${matchId}/dispute/resolve`, { winnerId, resolution });
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to resolve dispute';
      throw new Error(msg);
    }
  },

  async disputeMatchResult(matchId: string, reason: string, evidence?: string[]): Promise<void> {
    const body: Record<string, unknown> = { reason };
    if (evidence?.length) body.evidence = evidence;
    const response = await apiPost(`${TOURNAMENT_ENDPOINTS.MATCH_DISPUTE}/${matchId}/dispute`, body);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to dispute result';
      throw new Error(msg);
    }
  },

  async autoConfirmMatch(matchId: string): Promise<void> {
    const response = await apiPost(`${TOURNAMENT_ENDPOINTS.MATCHES}/${matchId}/auto-confirm`, {});
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to auto-confirm';
      throw new Error(msg);
    }
  },
};
