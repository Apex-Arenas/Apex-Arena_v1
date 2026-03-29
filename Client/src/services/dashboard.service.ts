import { apiGet } from '../utils/api.utils';
import { AUTH_ENDPOINTS, TOURNAMENT_ENDPOINTS } from '../config/api.config';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DashboardProfile {
  userId: string;
  email: string;
  username: string;
  role: string;
  firstName: string;
  lastName: string;
  bio: string;
  avatarUrl: string;
  country: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
}

export interface TournamentRegistration {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  tournamentStatus: string;
  tournamentSchedule: {
    startDate?: string;
    endDate?: string;
    checkInStart?: string;
  };
  registrationType: 'solo' | 'team';
  teamName?: string;
  status: string;
  inGameId: string;
  checkedIn: boolean;
  finalPlacement?: number;
  prizeWon?: number;
  createdAt: string;
}

export interface DashboardData {
  profile: DashboardProfile | null;
  registrations: TournamentRegistration[];
  stats: {
    joinedTournaments: number;
    totalWins: number;
    totalPrizeWon: number;
    checkedInCount: number;
  };
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function mapProfile(raw: Record<string, unknown>): DashboardProfile {
  const profile = (raw.profile ?? {}) as Record<string, unknown>;
  return {
    userId: String(raw.user_id ?? raw._id ?? ''),
    email: String(raw.email ?? ''),
    username: String(raw.username ?? ''),
    role: String(raw.role ?? 'player'),
    firstName: String(profile.first_name ?? ''),
    lastName: String(profile.last_name ?? ''),
    bio: String(profile.bio ?? ''),
    avatarUrl: String(profile.avatar_url ?? ''),
    country: String(profile.country ?? ''),
    isActive: Boolean(raw.is_active ?? true),
    lastLogin: String(raw.last_login ?? ''),
    createdAt: String(raw.created_at ?? ''),
  };
}

function mapRegistration(raw: Record<string, unknown>): TournamentRegistration {
  const tournament = (raw.tournament_id ?? {}) as Record<string, unknown>;
  const team = (raw.team_id ?? null) as Record<string, unknown> | null;
  const checkIn = (raw.check_in ?? {}) as Record<string, unknown>;
  const schedule = (tournament.schedule ?? {}) as Record<string, unknown>;

  return {
    id: String(raw._id ?? ''),
    tournamentId: String(tournament._id ?? raw.tournament_id ?? ''),
    tournamentTitle: String(tournament.title ?? 'Unknown Tournament'),
    tournamentStatus: String(tournament.status ?? ''),
    tournamentSchedule: {
      startDate: schedule.start_date as string | undefined ?? schedule.startDate as string | undefined,
      endDate: schedule.end_date as string | undefined ?? schedule.endDate as string | undefined,
      checkInStart: schedule.check_in_start as string | undefined,
    },
    registrationType: (raw.registration_type as 'solo' | 'team') ?? 'solo',
    teamName: team?.name as string | undefined,
    status: String(raw.status ?? ''),
    inGameId: String(raw.in_game_id ?? ''),
    checkedIn: Boolean(checkIn.checked_in ?? false),
    finalPlacement: raw.final_placement as number | undefined,
    prizeWon: raw.prize_won as number | undefined,
    createdAt: String(raw.created_at ?? ''),
  };
}

// ─── Service ────────────────────────────────────────────────────────────────

export const dashboardService = {
  async fetchProfile(): Promise<DashboardProfile | null> {
    const response = await apiGet(AUTH_ENDPOINTS.PROFILE);
    if (!response.success) return null;
    return mapProfile(response.data as Record<string, unknown>);
  },

  async fetchRegistrations(): Promise<TournamentRegistration[]> {
    const response = await apiGet(TOURNAMENT_ENDPOINTS.MY_REGISTRATIONS);
    if (!response.success) return [];

    const data = response.data;
    const list = Array.isArray(data) ? data : (data as Record<string, unknown>).data;
    if (!Array.isArray(list)) return [];

    return list.map((item: Record<string, unknown>) => mapRegistration(item));
  },

  async fetchDashboard(): Promise<DashboardData> {
    const [profile, registrations] = await Promise.all([
      this.fetchProfile(),
      this.fetchRegistrations(),
    ]);

    // Derive stats from registrations
    const stats = {
      joinedTournaments: registrations.length,
      totalWins: registrations.filter((r) => r.finalPlacement === 1).length,
      totalPrizeWon: registrations.reduce((sum, r) => sum + (r.prizeWon ?? 0), 0),
      checkedInCount: registrations.filter((r) => r.checkedIn).length,
    };

    return { profile, registrations, stats };
  },
};
