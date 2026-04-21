import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api.utils';
import { TOURNAMENT_ENDPOINTS, FINANCE_ENDPOINTS, NOTIFICATION_ENDPOINTS } from '../config/api.config';
import { mapTournament, type Tournament } from './tournament.service';
import { generateUniqueIdempotencyKey } from '../utils/idempotency.utils';

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
  tournamentType: string;
  format: string;
  isFree: boolean;
  entryFee?: number;
  currency?: string;
  maxParticipants: number;
  minParticipants: number;
  teamSize?: number;
  registrationStart: string;
  registrationEnd: string;
  tournamentStart: string;
  tournamentEnd?: string;
  checkInStart?: string;
  checkInEnd?: string;
  timezone?: string;
  prizePool?: number;
  rules?: string;
  region?: string;
  visibility?: string;
  thumbnailUrl?: string;
  contactEmail?: string;
  waitlistEnabled?: boolean;
  prizeDistribution?: Array<{
    position: number;
    percentage: number;
  }>;
  mapPool?: string[];
  antiCheatRequired?: boolean;
  streamRequired?: boolean;
  defaultBestOf?: number;
  inGameIdRequired?: boolean;
  allowedRegions?: string[];
  verifiedEmailRequired?: boolean;
  leagueSettings?: {
    legs?: number;
    pointsPerWin?: number;
    pointsPerDraw?: number;
    pointsPerLoss?: number;
  };
  matchDeadlineHours?: number | null;  // 24, 48, 168, or null = no deadline
  matchDeadlineDate?: string | null;   // ISO string for custom date deadline
}

export interface PayoutRequest {
  id: string;
  amountGhs: number;
  requestType: string;
  momoNumber: string;
  network: string;
  accountName: string;
  status: string;
  notes?: string;
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface RequestPayoutPayload {
  amountGhs: number;
  requestType: 'tournament_winnings' | 'wallet_withdrawal';
  momoNumber: string;
  network: 'MTN' | 'Vodafone' | 'AirtelTigo';
  accountName: string;
  notes?: string;
}

export interface WalletBalance {
  availableBalance: number;
  pendingBalance: number;
  totalBalance: number;
  escrowLocked: number;
  currency: string;
}

export interface WalletTopUpResult {
  authorizationUrl?: string;
  reference?: string;
  confirmationMode?: string;
}

export interface EscrowDepositInitiationResult {
  authorizationUrl?: string;
  reference?: string;
  amountSummary?: {
    youWillBeCharged?: string;
    netPrizePool?: string;
    platformFee?: string;
  };
}

export interface EscrowStatusSummary {
  status: string;
  playerEntries?: {
    totalCollected: number;
    totalPlayers: number;
  };
  organizerDeposit?: {
    grossAmount: number;
    netPrizePool: number;
    depositedAt?: string;
  } | null;
  processingSchedule?: {
    cancellationCutoff?: string;
    tournamentStart?: string;
    winnersSubmitted?: boolean;
    tournamentStarted?: boolean;
    pastCancellationCutoff?: boolean;
    prizesDistributed?: boolean;
    tournamentEnd?: string;
  };
  winnerSubmissions?: {
    submittedAt?: string;
    allWinnersVerified?: boolean;
    totalPrizeDistributedLabel?: string;
    winners?: EscrowWinnerSummary[];
  } | null;
}

export interface EscrowWinnerSummary {
  position: number;
  inGameId: string;
  matchStatus: string;
  payoutStatus: string;
  prizeAmountLabel?: string;
}

export interface WinnerSubmissionInput {
  position: number;
  inGameId: string;
  prizePercentage: number;
}

const GENERIC_PUBLISH_MESSAGES = new Set([
  'Failed to publish tournament',
  'Request failed',
  'Internal server error',
]);

const GENERIC_CREATE_MESSAGES = new Set([
  'Failed to create tournament',
  'Request failed',
  'Internal server error',
]);

const CREATE_ERROR_MESSAGES: Record<string, string> = {
  FAILED_TO_CREATE_TOURNAMENT:
    'Unable to create tournament. Please verify all required fields and schedule settings.',
  VALIDATION_ERROR:
    'Some tournament fields are invalid. Please review the form and try again.',
  MISSING_REQUIRED_FIELDS:
    'Required fields are missing: title, game, tournament type, format, schedule, and capacity.',
  ORGANIZER_NOT_VERIFIED:
    'Organizer verification is required to create paid tournaments.',
};

const PUBLISH_ERROR_MESSAGES: Record<string, string> = {
  FAILED_TO_PUBLISH_TOURNAMENT:
    'Unable to publish this tournament right now. Please check required fields and try again.',
  PUBLISH_VALIDATION_FAILED:
    'Tournament publish validation failed. Check schedule, game selection, participant limits, and prize settings.',
  TOURNAMENT_INVALID_STATUS:
    'Only draft tournaments can be published.',
  INVALID_STATUS:
    'Only draft tournaments can be published.',
  SCHEDULE_PAST:
    'Registration start must be in the future before publishing.',
  PRIZE_DISTRIBUTION_REQUIRED:
    'Add a valid prize distribution before publishing this paid tournament.',
  INVALID_MIN_PARTICIPANTS:
    'Minimum participants must be greater than 0 before publishing.',
  ESCROW_CREATION_FAILED:
    'Escrow setup failed while publishing. Please try again in a moment.',
};

function resolvePublishErrorMessage(code?: string, message?: string): string {
  const normalizedMessage = (message ?? '').trim();
  const hasUsefulMessage =
    normalizedMessage.length > 0 &&
    !GENERIC_PUBLISH_MESSAGES.has(normalizedMessage);

  if (hasUsefulMessage) {
    return normalizedMessage;
  }

  if (code && PUBLISH_ERROR_MESSAGES[code]) {
    return PUBLISH_ERROR_MESSAGES[code];
  }

  return 'Failed to publish tournament. Please review tournament details and try again.';
}

function resolveCreateTournamentErrorMessage(code?: string, message?: string): string {
  const normalizedMessage = (message ?? '').trim();
  const hasUsefulMessage =
    normalizedMessage.length > 0 &&
    !GENERIC_CREATE_MESSAGES.has(normalizedMessage);

  if (hasUsefulMessage) {
    return normalizedMessage;
  }

  if (code && CREATE_ERROR_MESSAGES[code]) {
    return CREATE_ERROR_MESSAGES[code];
  }

  return 'Failed to create tournament. Please review required fields and try again.';
}

function resolveFinanceErrorMessage(message?: string, fallback?: string): string {
  const normalizedMessage = (message ?? '').trim();
  if (normalizedMessage.length > 0 && normalizedMessage !== 'Request failed') {
    return normalizedMessage;
  }
  return fallback ?? 'Finance request failed. Please try again.';
}

function getStoredUserId(): string | null {
  try {
    const raw = localStorage.getItem('apex_arenas_auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: { id?: string } };
    return parsed.user?.id ?? null;
  } catch {
    return null;
  }
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
    const userId = getStoredUserId();
    if (!userId) return [];

    const url = `${TOURNAMENT_ENDPOINTS.TOURNAMENTS}?organizer_id=${encodeURIComponent(userId)}`;

    const response = await apiGet(url);
    if (!response.success) return [];

    const data = response.data as Record<string, unknown>;
    const list = Array.isArray(data)
      ? data
      : ((data.tournaments ?? data.data ?? []) as Record<string, unknown>[]);

    const missingGameIds = list
      .map((item) => {
        const gameNode =
          (item.game_id as Record<string, unknown> | string | undefined) ??
          (item.game as Record<string, unknown> | string | undefined);

        const hasGameName =
          typeof item.game_name === 'string' ||
          typeof item.gameName === 'string' ||
          (typeof gameNode === 'object' &&
            gameNode !== null &&
            typeof (gameNode as Record<string, unknown>).name === 'string');

        if (hasGameName) return undefined;

        if (typeof gameNode === 'string') return gameNode;
        if (
          gameNode &&
          typeof gameNode === 'object' &&
          (typeof (gameNode as Record<string, unknown>)._id === 'string' ||
            typeof (gameNode as Record<string, unknown>).id === 'string')
        ) {
          return String(
            (gameNode as Record<string, unknown>)._id ??
              (gameNode as Record<string, unknown>).id,
          );
        }

        return undefined;
      })
      .filter((id): id is string => Boolean(id));

    let gameLookup: Map<string, { id: string; name: string; logoUrl?: string }> | undefined;
    if (missingGameIds.length > 0) {
      const gamesResponse = await apiGet(TOURNAMENT_ENDPOINTS.GAMES, { skipCache: true });
      if (gamesResponse.success) {
        const gamesPayload = gamesResponse.data as Record<string, unknown>;
        const gamesList = Array.isArray(gamesPayload)
          ? (gamesPayload as Record<string, unknown>[])
          : ((gamesPayload.games ?? gamesPayload.data ?? []) as Record<string, unknown>[]);

        const wanted = new Set(missingGameIds);
        const lookup = new Map<string, { id: string; name: string; logoUrl?: string }>();

        gamesList.forEach((game) => {
          const id = String(game._id ?? game.id ?? '');
          const name = String(game.name ?? '');
          if (!id || !name || !wanted.has(id)) return;
          lookup.set(id, {
            id,
            name,
            logoUrl: game.logo_url as string | undefined,
          });
        });

        gameLookup = lookup;
      }
    }

    return list.map((t) =>
      mapTournament(t as Record<string, unknown>, gameLookup),
    );
  },

  async createTournament(payload: CreateTournamentPayload): Promise<Tournament> {
    const maxParticipants = payload.maxParticipants;
    const minParticipants = payload.minParticipants;
    const isFreeTournament =
      payload.isFree || payload.entryFee === undefined || payload.entryFee <= 0;

    const body: Record<string, unknown> = {
      title: payload.title,
      game_id: payload.gameId,
      is_free: isFreeTournament,
      capacity: {
        max_participants: maxParticipants,
        min_participants: minParticipants,
        waitlist_enabled: payload.waitlistEnabled ?? true,
      },
      schedule: {
        registration_start: payload.registrationStart,
        registration_end: payload.registrationEnd,
        tournament_start: payload.tournamentStart,
        ...(payload.tournamentEnd && { tournament_end: payload.tournamentEnd }),
        ...(payload.checkInStart && { check_in_start: payload.checkInStart }),
        ...(payload.checkInEnd && { check_in_end: payload.checkInEnd }),
      },
      timezone: payload.timezone || 'Africa/Accra',
      entry_fee: isFreeTournament ? 0 : payload.entryFee,
    };

    if (!isFreeTournament && payload.prizePool !== undefined) {
      const distribution =
        payload.prizeDistribution && payload.prizeDistribution.length > 0
          ? payload.prizeDistribution
          : [
              { position: 1, percentage: 60 },
              { position: 2, percentage: 30 },
              { position: 3, percentage: 10 },
            ];

      body.prize_structure = {
        organizer_gross_deposit: payload.prizePool,
        total_winning_positions: distribution.length,
        distribution,
      };
    }

    if (payload.description) body.description = payload.description;
    body.tournament_type = payload.tournamentType;
    body.format = payload.format;
    if (payload.currency) body.currency = payload.currency;
    if (
      payload.rules ||
      payload.mapPool ||
      payload.antiCheatRequired !== undefined ||
      payload.streamRequired !== undefined ||
      payload.defaultBestOf !== undefined ||
      payload.inGameIdRequired !== undefined
    ) {
      body.rules = {
        ...(payload.rules ? { description: payload.rules } : {}),
        ...(payload.mapPool && payload.mapPool.length > 0 ? { map_pool: payload.mapPool } : {}),
        anti_cheat_required: payload.antiCheatRequired ?? true,
        stream_required: payload.streamRequired ?? false,
        default_best_of: payload.defaultBestOf ?? 3,
        in_game_id_required: payload.inGameIdRequired ?? true,
      };
    }
    if (payload.region) body.region = payload.region;
    if (payload.visibility) body.visibility = payload.visibility;
    if (payload.thumbnailUrl) body.thumbnail_url = payload.thumbnailUrl;
    if (
      payload.teamSize ||
      (payload.allowedRegions && payload.allowedRegions.length > 0) ||
      payload.verifiedEmailRequired !== undefined
    ) {
      body.requirements = {
        ...(body.requirements as Record<string, unknown> | undefined),
        ...(payload.teamSize ? { team_size: payload.teamSize } : {}),
        ...(payload.allowedRegions && payload.allowedRegions.length > 0
          ? { allowed_regions: payload.allowedRegions }
          : {}),
        ...(payload.verifiedEmailRequired !== undefined
          ? { verified_email_required: payload.verifiedEmailRequired }
          : {}),
      };
    }
    if (payload.contactEmail) {
      body.communication = {
        ...(body.communication as Record<string, unknown> | undefined),
        contact_email: payload.contactEmail,
      };
    }
    if (payload.tournamentType === 'league' && payload.leagueSettings) {
      body.league_settings = {
        legs: payload.leagueSettings.legs ?? 1,
        points_per_win: payload.leagueSettings.pointsPerWin ?? 3,
        points_per_draw: payload.leagueSettings.pointsPerDraw ?? 1,
        points_per_loss: payload.leagueSettings.pointsPerLoss ?? 0,
      };
    }
    if (payload.matchDeadlineHours !== undefined || payload.matchDeadlineDate !== undefined) {
      body.timeouts = {
        match_deadline_hours: payload.matchDeadlineHours ?? null,
        match_deadline_date: payload.matchDeadlineDate ?? null,
      };
    }

    const response = await apiPost(TOURNAMENT_ENDPOINTS.TOURNAMENTS, body);
    if (!response.success) {
      const error = (response as { error?: { code?: string; message?: string } }).error;
      const msg = resolveCreateTournamentErrorMessage(error?.code, error?.message);
      throw new Error(msg);
    }

    const data = response.data as Record<string, unknown>;
    const raw = (data.tournament ?? data) as Record<string, unknown>;
    return mapTournament(raw);
  },

  async updateTournament(tournamentId: string, updates: Partial<CreateTournamentPayload>): Promise<Tournament> {
    const body: Record<string, unknown> = {};
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.gameId !== undefined) body.game_id = updates.gameId;
    if (updates.tournamentType !== undefined) body.tournament_type = updates.tournamentType;
    if (updates.format !== undefined) body.format = updates.format;
    if (updates.entryFee !== undefined) body.entry_fee = updates.entryFee;
    if (updates.currency !== undefined) body.currency = updates.currency;

    if (
      updates.maxParticipants !== undefined ||
      updates.minParticipants !== undefined ||
      updates.waitlistEnabled !== undefined
    ) {
      body.capacity = {
        ...(updates.maxParticipants !== undefined
          ? { max_participants: updates.maxParticipants }
          : {}),
        ...(updates.minParticipants !== undefined
          ? { min_participants: updates.minParticipants }
          : {}),
        ...(updates.waitlistEnabled !== undefined
          ? { waitlist_enabled: updates.waitlistEnabled }
          : {}),
      };
    }

    if (
      updates.registrationStart !== undefined ||
      updates.registrationEnd !== undefined ||
      updates.tournamentStart !== undefined ||
      updates.tournamentEnd !== undefined ||
      updates.checkInStart !== undefined ||
      updates.checkInEnd !== undefined
    ) {
      body.schedule = {
        ...(updates.registrationStart !== undefined
          ? { registration_start: updates.registrationStart }
          : {}),
        ...(updates.registrationEnd !== undefined
          ? { registration_end: updates.registrationEnd }
          : {}),
        ...(updates.tournamentStart !== undefined
          ? { tournament_start: updates.tournamentStart }
          : {}),
        ...(updates.tournamentEnd !== undefined
          ? { tournament_end: updates.tournamentEnd }
          : {}),
        ...(updates.checkInStart !== undefined
          ? { check_in_start: updates.checkInStart }
          : {}),
        ...(updates.checkInEnd !== undefined
          ? { check_in_end: updates.checkInEnd }
          : {}),
      };
    }

    if (updates.prizePool !== undefined || updates.prizeDistribution !== undefined) {
      const distribution =
        updates.prizeDistribution && updates.prizeDistribution.length > 0
          ? updates.prizeDistribution
          : undefined;

      body.prize_structure = {
        ...(updates.prizePool !== undefined
          ? { organizer_gross_deposit: updates.prizePool }
          : {}),
        ...(distribution
          ? {
              total_winning_positions: distribution.length,
              distribution,
            }
          : {}),
      };
    }

    if (updates.thumbnailUrl !== undefined) body.thumbnail_url = updates.thumbnailUrl;
    if (updates.region !== undefined) body.region = updates.region;
    if (updates.visibility !== undefined) body.visibility = updates.visibility;
    if (updates.timezone !== undefined) body.timezone = updates.timezone;

    if (
      updates.rules !== undefined ||
      updates.mapPool !== undefined ||
      updates.antiCheatRequired !== undefined ||
      updates.streamRequired !== undefined ||
      updates.defaultBestOf !== undefined ||
      updates.inGameIdRequired !== undefined
    ) {
      body.rules = {
        ...(updates.rules !== undefined ? { description: updates.rules } : {}),
        ...(updates.mapPool !== undefined ? { map_pool: updates.mapPool } : {}),
        ...(updates.antiCheatRequired !== undefined
          ? { anti_cheat_required: updates.antiCheatRequired }
          : {}),
        ...(updates.streamRequired !== undefined
          ? { stream_required: updates.streamRequired }
          : {}),
        ...(updates.defaultBestOf !== undefined
          ? { default_best_of: updates.defaultBestOf }
          : {}),
        ...(updates.inGameIdRequired !== undefined
          ? { in_game_id_required: updates.inGameIdRequired }
          : {}),
      };
    }

    if (
      updates.teamSize !== undefined ||
      updates.allowedRegions !== undefined ||
      updates.verifiedEmailRequired !== undefined
    ) {
      body.requirements = {
        ...(updates.teamSize !== undefined ? { team_size: updates.teamSize } : {}),
        ...(updates.allowedRegions !== undefined
          ? { allowed_regions: updates.allowedRegions }
          : {}),
        ...(updates.verifiedEmailRequired !== undefined
          ? { verified_email_required: updates.verifiedEmailRequired }
          : {}),
      };
    }

    if (updates.contactEmail !== undefined) {
      body.communication = {
        contact_email: updates.contactEmail,
      };
    }

    if (updates.matchDeadlineHours !== undefined || updates.matchDeadlineDate !== undefined) {
      body.timeouts = {
        match_deadline_hours: updates.matchDeadlineHours ?? null,
        match_deadline_date: updates.matchDeadlineDate ?? null,
      };
    }

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

  async publishTournament(tournamentId: string): Promise<Tournament> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.TOURNAMENT_PUBLISH}/${tournamentId}/publish`,
      {},
    );
    if (!response.success) {
      const error = (response as { error?: { code?: string; message?: string } }).error;
      const msg = resolvePublishErrorMessage(error?.code, error?.message);
      throw new Error(msg);
    }

    const data = response.data as Record<string, unknown>;
    const raw = (data.tournament ?? data) as Record<string, unknown>;
    return mapTournament(raw);
  },

  async getWalletBalance(): Promise<WalletBalance> {
    const response = await apiGet(FINANCE_ENDPOINTS.WALLET);
    if (!response.success) {
      const msg = resolveFinanceErrorMessage(
        (response as { error?: { message?: string } }).error?.message,
        'Failed to fetch wallet balance',
      );
      throw new Error(msg);
    }

    const data = response.data as Record<string, unknown>;
    return {
      availableBalance: Number(data.available_balance ?? 0),
      pendingBalance: Number(data.pending_balance ?? 0),
      totalBalance: Number(data.total_balance ?? 0),
      escrowLocked: Number(data.escrow_locked ?? 0),
      currency: String(data.currency ?? 'GHS'),
    };
  },

  async initiateWalletTopUp(amountGhs: number): Promise<WalletTopUpResult> {
    const callbackUrl = FINANCE_ENDPOINTS.DEPOSIT_VERIFY;

    const response = await apiPost(FINANCE_ENDPOINTS.DEPOSIT, {
      amount_ghs: amountGhs,
      callback_url: callbackUrl,
      idempotency_key: generateUniqueIdempotencyKey(),
    });

    if (!response.success) {
      const msg = resolveFinanceErrorMessage(
        (response as { error?: { message?: string } }).error?.message,
        'Failed to initiate wallet top-up',
      );
      throw new Error(msg);
    }

    const data = response.data as Record<string, unknown>;
    return {
      authorizationUrl: data.authorization_url as string | undefined,
      reference: data.reference as string | undefined,
      confirmationMode: data.confirmation_mode as string | undefined,
    };
  },

  async initiateEscrowDeposit(
    tournamentId: string,
    grossAmountGhs: number,
  ): Promise<EscrowDepositInitiationResult> {
    const callbackUrl = `${window.location.origin}/payment/callback`;

    const response = await apiPost(FINANCE_ENDPOINTS.ESCROW_INITIATE_DEPOSIT, {
      tournament_id: tournamentId,
      gross_amount_ghs: grossAmountGhs,
      callback_url: callbackUrl,
      idempotency_key: generateUniqueIdempotencyKey(),
    });

    if (!response.success) {
      const msg = resolveFinanceErrorMessage(
        (response as { error?: { message?: string } }).error?.message,
        'Failed to deposit prize pool',
      );
      throw new Error(msg);
    }

    const data = response.data as Record<string, unknown>;
    const amountSummary = (data.amount_summary ?? {}) as Record<string, unknown>;

    return {
      authorizationUrl: data.authorization_url as string | undefined,
      reference: data.reference as string | undefined,
      amountSummary: {
        youWillBeCharged: amountSummary.you_will_be_charged as string | undefined,
        netPrizePool: amountSummary.net_prize_pool as string | undefined,
        platformFee: amountSummary.platform_fee as string | undefined,
      },
    };
  },

  async getEscrowStatus(tournamentId: string): Promise<EscrowStatusSummary | null> {
    const response = await apiGet(`${FINANCE_ENDPOINTS.ESCROW_STATUS}/${tournamentId}`);

    if (!response.success) {
      const errorCode = (response as { error?: { code?: string } }).error?.code;
      if (errorCode === 'ESCROW_NOT_FOUND') {
        return null;
      }

      const msg = resolveFinanceErrorMessage(
        (response as { error?: { message?: string } }).error?.message,
        'Failed to fetch escrow status',
      );
      throw new Error(msg);
    }

    const data = response.data as Record<string, unknown>;
    const playerEntries = (data.player_entries ?? {}) as Record<string, unknown>;
    const organizerDeposit = (data.organizer_deposit ?? null) as Record<string, unknown> | null;
    const processingSchedule = (data.processing_schedule ?? {}) as Record<string, unknown>;
    const winnerSubmissions = (data.winner_submissions ?? null) as Record<string, unknown> | null;
    const winnerRows = Array.isArray(winnerSubmissions?.winners)
      ? (winnerSubmissions?.winners as Record<string, unknown>[])
      : [];

    return {
      status: String(data.status ?? ''),
      playerEntries: {
        totalCollected: Number(playerEntries.total_collected ?? 0),
        totalPlayers: Number(playerEntries.total_players ?? 0),
      },
      organizerDeposit: organizerDeposit
        ? {
            grossAmount: Number(organizerDeposit.gross_amount ?? 0),
            netPrizePool: Number(organizerDeposit.net_prize_pool ?? 0),
            depositedAt: organizerDeposit.deposited_at as string | undefined,
          }
        : null,
      processingSchedule: {
        cancellationCutoff: processingSchedule.cancellation_cutoff as string | undefined,
        tournamentStart: processingSchedule.tournament_start as string | undefined,
        winnersSubmitted: Boolean(processingSchedule.winners_submitted ?? false),
        tournamentStarted: Boolean(processingSchedule.tournament_started ?? false),
        pastCancellationCutoff: Boolean(processingSchedule.past_cancellation_cutoff ?? false),
        prizesDistributed: Boolean(processingSchedule.prizes_distributed ?? false),
        tournamentEnd: processingSchedule.tournament_end as string | undefined,
      },
      winnerSubmissions: winnerSubmissions
        ? {
            submittedAt: winnerSubmissions.submitted_at as string | undefined,
            allWinnersVerified: Boolean(
              winnerSubmissions.all_winners_verified ?? false,
            ),
            totalPrizeDistributedLabel:
              winnerSubmissions.total_prize_distributed as string | undefined,
            winners: winnerRows.map((winner) => ({
              position: Number(winner.position ?? 0),
              inGameId: String(winner.in_game_id ?? ''),
              matchStatus: String(winner.match_status ?? ''),
              payoutStatus: String(winner.payout_status ?? ''),
              prizeAmountLabel: winner.prize_amount_ghs as string | undefined,
            })),
          }
        : null,
    };
  },

  async submitWinners(
    tournamentId: string,
    winners: WinnerSubmissionInput[],
  ): Promise<void> {
    const response = await apiPost(`${FINANCE_ENDPOINTS.ESCROW_SUBMIT_WINNERS}/${tournamentId}/winners`, {
      winners: winners.map((winner) => ({
        position: winner.position,
        in_game_id: winner.inGameId,
        prize_percentage: winner.prizePercentage,
      })),
      idempotency_key: generateUniqueIdempotencyKey(),
    });

    if (!response.success) {
      const msg = resolveFinanceErrorMessage(
        (response as { error?: { message?: string } }).error?.message,
        'Failed to submit winners',
      );
      throw new Error(msg);
    }
  },

  async cancelTournament(tournamentId: string, reason?: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.TOURNAMENT_CANCEL}/${tournamentId}/cancel`,
      { reason: (reason ?? '').trim() },
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
      { userIds },
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Bulk check-in failed';
      throw new Error(msg);
    }
  },

  async generateBracket(tournamentId: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.BRACKET}/${tournamentId}/bracket/generate`,
      {},
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to generate bracket';
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

  // ─── Match Management (Organizer) ───────────────────────────────────────────

  async getMatch(matchId: string): Promise<Record<string, unknown>> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.MATCHES}/${matchId}`);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch match';
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  async startMatch(matchId: string): Promise<void> {
    const response = await apiPost(`${TOURNAMENT_ENDPOINTS.MATCH_START}/${matchId}/start`, {});
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to start match';
      throw new Error(msg);
    }
  },

  async forfeitMatch(matchId: string, noShowUserId: string): Promise<void> {
    const response = await apiPost(`${TOURNAMENT_ENDPOINTS.MATCH_FORFEIT}/${matchId}/forfeit`, {
      noShowUserId,
    });
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to forfeit match';
      throw new Error(msg);
    }
  },

  async cancelMatchById(matchId: string): Promise<void> {
    const response = await apiPost(`${TOURNAMENT_ENDPOINTS.MATCH_CANCEL}/${matchId}/cancel`, {});
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to cancel match';
      throw new Error(msg);
    }
  },

  async resolveDispute(matchId: string, winnerId: string, resolution: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.MATCH_DISPUTE_RESOLVE}/${matchId}/dispute/resolve`,
      { winnerId, resolution },
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to resolve dispute';
      throw new Error(msg);
    }
  },

  // ─── Tournament Results ──────────────────────────────────────────────────────

  async getTournamentResults(
    tournamentId: string,
    options?: { includePrizes?: boolean; limit?: number },
  ): Promise<Record<string, unknown>> {
    const params = new URLSearchParams();
    if (options?.includePrizes) params.set('includePrizes', 'true');
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    const query = params.toString() ? `?${params.toString()}` : '';

    const response = await apiGet(
      `${TOURNAMENT_ENDPOINTS.RESULTS}/${tournamentId}/results${query}`,
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch results';
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  async submitTournamentResults(
    tournamentId: string,
    winners: Array<{ position: number; in_game_id: string }>,
  ): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.RESULTS}/${tournamentId}/results`,
      { winners },
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to submit results';
      throw new Error(msg);
    }
  },

  async verifyResults(tournamentId: string): Promise<void> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.RESULTS_VERIFY}/${tournamentId}/results/verify`,
      {},
    );
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to verify results';
      throw new Error(msg);
    }
  },

  // ─── Payouts ─────────────────────────────────────────────────────────────────

  async requestPayout(payload: RequestPayoutPayload): Promise<void> {
    const response = await apiPost(FINANCE_ENDPOINTS.PAYOUT_REQUEST, {
      amount_ghs: payload.amountGhs,
      request_type: payload.requestType,
      momo_number: payload.momoNumber,
      network: payload.network,
      account_name: payload.accountName,
      notes: payload.notes,
      idempotency_key: generateUniqueIdempotencyKey(),
    });
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to submit withdrawal request';
      throw new Error(msg);
    }
  },

  async getMyPayoutRequests(): Promise<PayoutRequest[]> {
    const response = await apiGet(FINANCE_ENDPOINTS.PAYOUT_MY_REQUESTS, { skipCache: true });
    if (!response.success) return [];

    const data = response.data as Record<string, unknown>;
    const list = Array.isArray(data)
      ? (data as Record<string, unknown>[])
      : ((data.requests ?? data.payouts ?? data.data ?? []) as Record<string, unknown>[]);

    return list.map((raw) => ({
      id: String(raw._id ?? raw.id ?? ''),
      amountGhs: Number(raw.amount_ghs ?? (Number(raw.amount ?? 0) / 100)),
      requestType: String(raw.request_type ?? ''),
      momoNumber: String(raw.momo_number ?? ''),
      network: String(raw.network ?? ''),
      accountName: String(raw.account_name ?? ''),
      status: String(raw.status ?? ''),
      notes: raw.notes as string | undefined,
      createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
      reviewedAt: raw.reviewed_at as string | undefined,
      rejectionReason: raw.rejection_reason as string | undefined,
    }));
  },

  async cancelPayoutRequest(id: string): Promise<void> {
    const response = await apiDelete(`${FINANCE_ENDPOINTS.PAYOUT_DETAIL}/${id}`);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to cancel withdrawal request';
      throw new Error(msg);
    }
  },

  // ─── Tournament Detail & Bracket ────────────────────────────────────────────

  async getTournament(tournamentId: string): Promise<Tournament> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.TOURNAMENT_DETAIL}/${tournamentId}`);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch tournament';
      throw new Error(msg);
    }
    const data = response.data as Record<string, unknown>;
    return mapTournament((data.tournament ?? data) as Record<string, unknown>);
  },

  async getBracket(tournamentId: string): Promise<Record<string, unknown>> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.BRACKET}/${tournamentId}`);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch bracket';
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  async getCurrentRound(tournamentId: string): Promise<Record<string, unknown>> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.BRACKET_CURRENT_ROUND}/${tournamentId}/current-round`);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch current round';
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  // ─── Check-in Status ────────────────────────────────────────────────────────

  async getCheckInStatus(tournamentId: string): Promise<Record<string, unknown>> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.CHECK_IN_STATUS}/${tournamentId}/check-in/status`);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch check-in status';
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  async getCheckedInPlayers(tournamentId: string): Promise<TournamentRegistrant[]> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.CHECKED_IN_PLAYERS}/${tournamentId}/check-in/players`);
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    const list = (Array.isArray(data) ? data : (data.players ?? data.registrations ?? data.data ?? [])) as Record<string, unknown>[];
    return list.map(mapRegistrant);
  },

  // ─── Match Sessions ──────────────────────────────────────────────────────────

  async getMatchSession(matchId: string): Promise<Record<string, unknown>> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.MATCH_SESSION}/${matchId}/session`);
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to fetch match session';
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  async getMatchSessionMessages(matchId: string): Promise<Record<string, unknown>[]> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.MATCH_SESSION_MESSAGES}/${matchId}/session/messages`);
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    return (Array.isArray(data) ? data : (data.messages ?? data.data ?? [])) as Record<string, unknown>[];
  },

  async getMatchSessionEvidence(matchId: string): Promise<Record<string, unknown>[]> {
    const response = await apiGet(`${TOURNAMENT_ENDPOINTS.MATCH_SESSION_EVIDENCE}/${matchId}/session/evidence`);
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    return (Array.isArray(data) ? data : (data.evidence ?? data.data ?? [])) as Record<string, unknown>[];
  },

  // ─── Finance: Transactions & Payout Detail ───────────────────────────────────

  async getTransactionHistory(params: { page?: number; limit?: number; type?: string } = {}): Promise<Record<string, unknown>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.type) query.set('type', params.type);
    const url = `${FINANCE_ENDPOINTS.TRANSACTIONS}?${query.toString()}`;
    const response = await apiGet(url, { skipCache: true });
    if (!response.success) {
      const msg = resolveFinanceErrorMessage(
        (response as { error?: { message?: string } }).error?.message,
        'Failed to fetch transactions',
      );
      throw new Error(msg);
    }
    return response.data as Record<string, unknown>;
  },

  async getPayoutDetail(id: string): Promise<PayoutRequest | null> {
    const response = await apiGet(`${FINANCE_ENDPOINTS.PAYOUT_DETAIL}/${id}`, { skipCache: true });
    if (!response.success) return null;
    const raw = (response.data as Record<string, unknown>).payout as Record<string, unknown>
      ?? response.data as Record<string, unknown>;
    return {
      id: String(raw._id ?? raw.id ?? ''),
      amountGhs: Number(raw.amount_ghs ?? (Number(raw.amount ?? 0) / 100)),
      requestType: String(raw.request_type ?? ''),
      momoNumber: String(raw.momo_number ?? ''),
      network: String(raw.network ?? ''),
      accountName: String(raw.account_name ?? ''),
      status: String(raw.status ?? ''),
      notes: raw.notes as string | undefined,
      createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
      reviewedAt: raw.reviewed_at as string | undefined,
      rejectionReason: raw.rejection_reason as string | undefined,
    };
  },

  // ─── Validation ──────────────────────────────────────────────────────────────

  async validateCanCancel(tournamentId: string): Promise<{ canCancel: boolean; reason?: string }> {
    const response = await apiGet(
      `${TOURNAMENT_ENDPOINTS.VALIDATION_CAN_CANCEL}/${tournamentId}/can-cancel`,
    );
    const data = (response.success ? response.data : {}) as Record<string, unknown>;
    return {
      canCancel: Boolean(data.can_cancel ?? data.canCancel ?? response.success),
      reason: data.reason as string | undefined,
    };
  },

  async validateCanGenerateBracket(tournamentId: string): Promise<{ canGenerate: boolean; reason?: string }> {
    const response = await apiGet(
      `${TOURNAMENT_ENDPOINTS.VALIDATION_CAN_GENERATE_BRACKET}/${tournamentId}/can-generate-bracket`,
    );
    const data = (response.success ? response.data : {}) as Record<string, unknown>;
    return {
      canGenerate: Boolean(data.can_generate ?? data.canGenerate ?? response.success),
      reason: data.reason as string | undefined,
    };
  },

  async validatePrizeDistribution(distribution: Array<{ position: number; percentage: number }>): Promise<{ valid: boolean; errors?: string[] }> {
    const response = await apiPost(TOURNAMENT_ENDPOINTS.VALIDATION_PRIZE_DISTRIBUTION, { distribution });
    const data = (response.success ? response.data : {}) as Record<string, unknown>;
    return {
      valid: Boolean(data.valid ?? response.success),
      errors: data.errors as string[] | undefined,
    };
  },

  async validateSchedule(schedule: Record<string, unknown>): Promise<{ valid: boolean; errors?: string[] }> {
    const response = await apiPost(TOURNAMENT_ENDPOINTS.VALIDATION_SCHEDULE, schedule);
    const data = (response.success ? response.data : {}) as Record<string, unknown>;
    return {
      valid: Boolean(data.valid ?? response.success),
      errors: data.errors as string[] | undefined,
    };
  },

  // ─── Notifications ───────────────────────────────────────────────────────────

  async getNotifications(params: { page?: number; limit?: number; unreadOnly?: boolean } = {}): Promise<Record<string, unknown>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.unreadOnly) query.set('unread_only', 'true');
    const url = `${NOTIFICATION_ENDPOINTS.LIST}?${query.toString()}`;
    const response = await apiGet(url, { skipCache: true });
    if (!response.success) return { notifications: [], total: 0 };
    return response.data as Record<string, unknown>;
  },

  async getUnreadNotificationCount(): Promise<number> {
    const response = await apiGet(NOTIFICATION_ENDPOINTS.UNREAD_COUNT, { skipCache: true });
    if (!response.success) return 0;
    const data = response.data as Record<string, unknown>;
    return Number(data.count ?? data.unread_count ?? data.unreadCount ?? 0);
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    await apiPost(`${NOTIFICATION_ENDPOINTS.MARK_READ}/${notificationId}/read`, {});
  },

  async markAllNotificationsRead(): Promise<void> {
    await apiPost(NOTIFICATION_ENDPOINTS.MARK_ALL_READ, {});
  },
};
