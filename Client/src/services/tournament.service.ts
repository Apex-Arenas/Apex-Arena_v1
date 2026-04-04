import { apiGet, apiPost, apiDelete } from '../utils/api.utils';
import { TOURNAMENT_ENDPOINTS } from '../config/api.config';

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
  registeredAt?: string;
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

// ─── Mappers ────────────────────────────────────────────────────────────────

export function mapTournament(raw: Record<string, unknown>): Tournament {
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

  return {
    id: String(raw._id ?? raw.id ?? ''),
    title: String(raw.title ?? ''),
    description: raw.description as string | undefined,
    game: game._id
      ? {
          id: String(game._id ?? ''),
          name: String(game.name ?? ''),
          logoUrl: game.logo_url as string | undefined,
        }
      : undefined,
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
  };
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
    const pagination = (data.pagination ?? {}) as Record<string, unknown>;
    const page = Number(pagination.page ?? data.page ?? filters.page ?? 1);
    const limit = Number(pagination.limit ?? data.limit ?? filters.limit ?? 10);
    const total = Number(pagination.total ?? data.total ?? list.length);
    const pages = Number(
      pagination.pages ??
      (limit > 0 ? Math.ceil(total / limit) : 1),
    );

    return {
      tournaments: list.map((t) => mapTournament(t as Record<string, unknown>)),
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };
  },

  async getTournamentDetail(tournamentId: string): Promise<Tournament | null> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.TOURNAMENT_DETAIL}/${tournamentId}`);
    if (!response.success) return null;

    const data = response.data as Record<string, unknown>;
    const raw = (data.tournament ?? data) as Record<string, unknown>;
    return mapTournament(raw);
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
          registeredAt:
            (item.created_at as string | undefined) ??
            (item.createdAt as string | undefined),
        };
      })
      .filter((item) => item.tournamentId.length > 0);
  },
};
