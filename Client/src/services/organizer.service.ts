import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api.utils';
import { TOURNAMENT_ENDPOINTS } from '../config/api.config';
import { mapTournament, type Tournament } from './tournament.service';

export type { Tournament };

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TournamentRegistrant {
  registrationId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  inGameId: string;
  registrationType: 'solo' | 'team';
  teamName?: string;
  status: string;
  checkedIn: boolean;
  checkedInAt?: string;
  registeredAt: string;
  finalPlacement?: number;
}

export interface CreateTournamentPayload {
  title: string;
  description?: string;
  gameId: string;
  tournamentType?: string;
  format?: string;
  isFree: boolean;
  entryFee?: number;
  currency?: string;
  maxParticipants: number;
  minParticipants?: number;
  registrationStart: string;
  registrationEnd: string;
  tournamentStart: string;
  tournamentEnd?: string;
  checkInStart?: string;
  checkInEnd?: string;
  prizePool?: number;
  rules?: string;
  region?: string;
  visibility?: string;
  thumbnailUrl?: string;
}

function mapRegistrant(raw: Record<string, unknown>): TournamentRegistrant {
  const user = (raw.user_id ?? {}) as Record<string, unknown>;
  const checkIn = (raw.check_in ?? {}) as Record<string, unknown>;
  const team = (raw.team_id ?? null) as Record<string, unknown> | null;

  const firstName = String(user.first_name ?? '');
  const lastName = String(user.last_name ?? '');
  const displayName = `${firstName} ${lastName}`.trim() || String(user.username ?? '');

  return {
    registrationId: String(raw._id ?? ''),
    userId: String(user._id ?? raw.user_id ?? ''),
    username: String(user.username ?? ''),
    displayName,
    avatarUrl: (user.avatar_url ?? (user.profile as Record<string, unknown>)?.avatar_url) as string | undefined,
    inGameId: String(raw.in_game_id ?? ''),
    registrationType: (raw.registration_type as 'solo' | 'team') ?? 'solo',
    teamName: team?.name as string | undefined,
    status: String(raw.status ?? ''),
    checkedIn: Boolean(checkIn.checked_in ?? false),
    checkedInAt: checkIn.checked_in_at as string | undefined,
    registeredAt: String(raw.created_at ?? ''),
    finalPlacement: raw.final_placement as number | undefined,
  };
}

// ─── Service ────────────────────────────────────────────────────────────────

export const organizerService = {
  async getMyTournaments(): Promise<Tournament[]> {
    // Filter tournaments by organizer — backend uses /tournaments with query params
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.TOURNAMENTS}?mine=true`);
    if (!response.success) return [];

    const data = response.data as Record<string, unknown>;
    const list = Array.isArray(data)
      ? data
      : ((data.tournaments ?? data.data ?? []) as Record<string, unknown>[]);

    return list.map((t) => mapTournament(t as Record<string, unknown>));
  },

  async createTournament(payload: CreateTournamentPayload): Promise<Tournament> {
    const body: Record<string, unknown> = {
      title: payload.title,
      game_id: payload.gameId,
      is_free: payload.isFree,
      max_participants: payload.maxParticipants,
      schedule: {
        registration_start: payload.registrationStart,
        registration_end: payload.registrationEnd,
        tournament_start: payload.tournamentStart,
        ...(payload.tournamentEnd && { tournament_end: payload.tournamentEnd }),
        ...(payload.checkInStart && { check_in_start: payload.checkInStart }),
        ...(payload.checkInEnd && { check_in_end: payload.checkInEnd }),
      },
    };

    if (payload.description) body.description = payload.description;
    if (payload.tournamentType) body.tournament_type = payload.tournamentType;
    if (payload.format) body.format = payload.format;
    if (!payload.isFree && payload.entryFee !== undefined) body.entry_fee = payload.entryFee;
    if (payload.currency) body.currency = payload.currency;
    if (payload.minParticipants) body.min_participants = payload.minParticipants;
    if (payload.rules) body.rules = { description: payload.rules };
    if (payload.region) body.region = payload.region;
    if (payload.visibility) body.visibility = payload.visibility;
    if (payload.thumbnailUrl) body.thumbnail_url = payload.thumbnailUrl;
    if (payload.prizePool) body.prize_structure = { organizer_deposit: payload.prizePool };

    const response = await apiPost(TOURNAMENT_ENDPOINTS.TOURNAMENTS, body);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to create tournament';
      throw new Error(msg);
    }

    const data = response.data as Record<string, unknown>;
    const raw = (data.tournament ?? data) as Record<string, unknown>;
    return mapTournament(raw);
  },

  async updateTournament(tournamentId: string, updates: Partial<CreateTournamentPayload>): Promise<Tournament> {
    const body: Record<string, unknown> = {};
    if (updates.title) body.title = updates.title;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.thumbnailUrl !== undefined) body.thumbnail_url = updates.thumbnailUrl;
    if (updates.rules !== undefined) body.rules = { description: updates.rules };
    if (updates.maxParticipants !== undefined) body.max_participants = updates.maxParticipants;

    const response = await apiPatch(
      `${TOURNAMENT_ENDPOINTS.TOURNAMENT_DETAIL}/${tournamentId}`,
      body,
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to update tournament';
      throw new Error(msg);
    }

    const data = response.data as Record<string, unknown>;
    const raw = (data.tournament ?? data) as Record<string, unknown>;
    return mapTournament(raw);
  },

  async publishTournament(tournamentId: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.TOURNAMENT_PUBLISH}/${tournamentId}/publish`,
      {},
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to publish tournament';
      throw new Error(msg);
    }
  },

  async cancelTournament(tournamentId: string, reason?: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.TOURNAMENT_CANCEL}/${tournamentId}/cancel`,
      { reason: reason ?? '' },
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to cancel tournament';
      throw new Error(msg);
    }
  },

  async getRegistrations(tournamentId: string): Promise<TournamentRegistrant[]> {
    const response = await apiGet(
      `${TOURNAMENT_ENDPOINTS.TOURNAMENT_REGISTRATIONS}/${tournamentId}/registrations`,
    );
    if (!response.success) return [];

    const data = response.data as Record<string, unknown>;
    const list = Array.isArray(data)
      ? data
      : ((data.registrations ?? data.data ?? []) as Record<string, unknown>[]);

    return list.map((r) => mapRegistrant(r as Record<string, unknown>));
  },

  async forceCheckIn(tournamentId: string, userId: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.ADMIN_CHECK_IN_FORCE}/${tournamentId}/check-in/force/${userId}`,
      {},
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Check-in failed';
      throw new Error(msg);
    }
  },

  async undoCheckIn(tournamentId: string, userId: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.ADMIN_CHECK_IN_UNDO}/${tournamentId}/check-in/undo/${userId}`,
      {},
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Undo check-in failed';
      throw new Error(msg);
    }
  },

  async bulkCheckIn(tournamentId: string, userIds: string[]): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.ADMIN_CHECK_IN_BULK}/${tournamentId}/check-in/bulk`,
      { user_ids: userIds },
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Bulk check-in failed';
      throw new Error(msg);
    }
  },

  async deleteTournament(tournamentId: string): Promise<void> {
    const response = await apiDelete(
      `${TOURNAMENT_ENDPOINTS.TOURNAMENT_DETAIL}/${tournamentId}`,
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to delete tournament';
      throw new Error(msg);
    }
  },
};
