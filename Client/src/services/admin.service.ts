import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api.utils';
import { AUTH_ENDPOINTS, TOURNAMENT_ENDPOINTS } from '../config/api.config';
import { getAdminAccessToken } from '../utils/auth.utils';
import type { AdminStats, ManagedUser } from '../types/admin.types';

// Helper — injects the admin Bearer token into every request
function adminHeaders(): { headers: Record<string, string>; skipAuth: true } {
  const token = getAdminAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('[AdminService] No admin token found in storage');
  }
  return { headers, skipAuth: true };
}

// ─── Game Types ───────────────────────────────────────────────────────────────

export interface AdminGame {
  id: string;
  name: string;
  slug: string;
  category: string;
  platform: string[];
  supportedFormats: string[];
  inGameIdLabel: string;
  inGameIdExample: string;
  logoUrl?: string;
  bannerUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  publisher?: string;
  tournamentCount: number;
  playerCount: number;
}

export interface CreateGamePayload {
  name: string;
  slug: string;
  category: string;
  platform: string[];
  supportedFormats: string[];
  inGameIdLabel: string;
  inGameIdExample: string;
  logoUrl?: string;
  bannerUrl?: string;
  publisher?: string;
  isFeatured?: boolean;
}

// ─── Verification Types ───────────────────────────────────────────────────────

export interface OrganizerVerificationRequest {
  id: string;
  userId: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  businessName: string;
  businessType: string;
  registrationNumber?: string;
  contactPerson?: string;
  address?: string;
  documents: {
    idFront?: string;
    idBack?: string;
    selfieWithId?: string;
    businessRegistration?: string;
  };
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'needs_resubmission';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReasons?: string[];
  reviewNotes?: string;
  reviewerId?: string;
}

function mapGame(raw: Record<string, unknown>): AdminGame {
  const stats = (raw.stats ?? {}) as Record<string, unknown>;
  const inGameIdConfig = (raw.in_game_id_config ?? {}) as Record<string, unknown>;
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    category: String(raw.category ?? ''),
    platform: (raw.platform ?? []) as string[],
    supportedFormats: (raw.supported_formats ?? raw.supportedFormats ?? []) as string[],
    inGameIdLabel: String(inGameIdConfig.label ?? ''),
    inGameIdExample: String(inGameIdConfig.example ?? ''),
    logoUrl: raw.logo_url as string | undefined,
    bannerUrl: raw.banner_url as string | undefined,
    isActive: Boolean(raw.is_active ?? true),
    isFeatured: Boolean(raw.is_featured ?? false),
    publisher: raw.publisher as string | undefined,
    tournamentCount: Number(stats.tournament_count ?? 0),
    playerCount: Number(stats.player_count ?? 0),
  };
}

function mapVerification(raw: Record<string, unknown>): OrganizerVerificationRequest {
  const user = (raw.user_id ?? raw.user ?? {}) as Record<string, unknown>;
  const userProfile = (user.profile ?? {}) as Record<string, unknown>;
  const docs = (raw.documents ?? {}) as Record<string, unknown>;
  const firstName = String(userProfile.first_name ?? user.first_name ?? '');
  const lastName = String(userProfile.last_name ?? user.last_name ?? '');

  return {
    id: String(raw._id ?? raw.id ?? ''),
    userId: String(user._id ?? raw.user_id ?? ''),
    username: String(user.username ?? ''),
    email: String(user.email ?? ''),
    displayName: `${firstName} ${lastName}`.trim() || String(user.username ?? ''),
    avatarUrl: (userProfile.avatar_url ?? user.avatar_url) as string | undefined,
    businessName: String(raw.business_name ?? ''),
    businessType: String(raw.business_type ?? ''),
    registrationNumber: raw.registration_number as string | undefined,
    contactPerson: raw.contact_person as string | undefined,
    address: raw.address as string | undefined,
    documents: {
      idFront: (docs.id_front ?? docs.idFront) as string | undefined,
      idBack: (docs.id_back ?? docs.idBack) as string | undefined,
      selfieWithId: (docs.selfie_with_id ?? docs.selfieWithId) as string | undefined,
      businessRegistration: (docs.business_registration ?? docs.businessRegistration) as string | undefined,
    },
    status: String(raw.status ?? 'pending') as OrganizerVerificationRequest['status'],
    submittedAt: String(raw.created_at ?? raw.submittedAt ?? ''),
    reviewedAt: raw.reviewed_at as string | undefined,
    rejectionReasons: raw.rejection_reasons as string[] | undefined,
    reviewNotes: raw.review_notes as string | undefined,
    reviewerId: raw.reviewed_by as string | undefined,
  };
}

// ─── Mapping ─────────────────────────────────────────────────────────────────

function mapStats(raw: Record<string, unknown>): AdminStats {
  const users = (raw.users ?? {}) as Record<string, unknown>;
  const security = (raw.security ?? {}) as Record<string, unknown>;
  const sessions = (raw.sessions ?? {}) as Record<string, unknown>;
  const system = (raw.system ?? {}) as Record<string, unknown>;

  return {
    users: {
      total: Number(users.total ?? 0),
      active: Number(users.active ?? 0),
      banned: Number(users.banned ?? 0),
      deactivated: Number(users.deactivated ?? 0),
      unverified: Number(users.unverified ?? 0),
      newToday: Number(users.new_today ?? users.newToday ?? 0),
      newThisWeek: Number(users.new_this_week ?? users.newThisWeek ?? 0),
      newThisMonth: Number(users.new_this_month ?? users.newThisMonth ?? 0),
    },
    security: {
      failedLogins24h: Number(security.failed_logins_24h ?? security.failedLogins24h ?? 0),
      lockedAccounts: Number(security.locked_accounts ?? security.lockedAccounts ?? 0),
      suspiciousActivities: Number(security.suspicious_activities ?? security.suspiciousActivities ?? 0),
    },
    sessions: {
      activeSessions: Number(sessions.active_sessions ?? sessions.activeSessions ?? 0),
      averageSessionsPerUser: Number(sessions.average_sessions_per_user ?? sessions.averageSessionsPerUser ?? 0),
    },
    system: {
      uptime: (system.uptime as string) ?? undefined,
      version: (system.version as string) ?? undefined,
    },
  };
}

function mapManagedUser(raw: Record<string, unknown>): ManagedUser {
  const profile = (raw.profile ?? {}) as Record<string, unknown>;
  return {
    id: String(raw.user_id ?? raw._id ?? raw.id ?? ''),
    email: String(raw.email ?? ''),
    username: String(raw.username ?? ''),
    firstName: String(profile.first_name ?? raw.first_name ?? raw.firstName ?? ''),
    lastName: String(profile.last_name ?? raw.last_name ?? raw.lastName ?? ''),
    role: String(raw.role ?? 'player'),
    avatarUrl: (profile.avatar_url ?? raw.avatar_url ?? raw.avatarUrl) as string | undefined,
    isEmailVerified: Boolean(raw.is_email_verified ?? raw.isEmailVerified ?? false),
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
    isBanned: Boolean(raw.is_banned ?? raw.isBanned ?? false),
    banReason: (raw.ban_reason ?? raw.banReason) as string | undefined,
    lastLogin: (raw.last_login ?? raw.lastLogin) as string | undefined,
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export interface UsersListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string; // active, banned, deactivated, unverified
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface UsersListResult {
  users: ManagedUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const adminService = {
  async fetchStats(): Promise<AdminStats | null> {
    const response = await apiGet(AUTH_ENDPOINTS.ADMIN_SYSTEM_STATS, adminHeaders());
    if (!response.success) return null;
    return mapStats(response.data as Record<string, unknown>);
  },

  async fetchUsers(params: UsersListParams = {}): Promise<UsersListResult> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.role) query.set('role', params.role);
    if (params.status) query.set('status', params.status);
    if (params.sort) query.set('sort', params.sort);
    if (params.order) query.set('order', params.order);

    const url = `${AUTH_ENDPOINTS.ADMIN_GET_USERS}?${query.toString()}`;
    const response = await apiGet(url, adminHeaders());

    if (!response.success) {
      return { users: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } };
    }

    const data = response.data as Record<string, unknown>;
    const rawUsers = (data.users ?? data.data ?? []) as Record<string, unknown>[];
    const rawPagination = (data.pagination ?? {}) as Record<string, unknown>;

    return {
      users: rawUsers.map(mapManagedUser),
      pagination: {
        total: Number(rawPagination.total ?? 0),
        page: Number(rawPagination.page ?? 1),
        limit: Number(rawPagination.limit ?? 20),
        pages: Number(rawPagination.pages ?? rawPagination.total_pages ?? 0),
      },
    };
  },

  async banUser(userId: string, reason: string): Promise<boolean> {
    const response = await apiPost(`${AUTH_ENDPOINTS.ADMIN_USER_BAN}/${userId}/ban`, { reason }, adminHeaders());
    return response.success;
  },

  async unbanUser(userId: string): Promise<boolean> {
    const response = await apiPost(`${AUTH_ENDPOINTS.ADMIN_USER_UNBAN}/${userId}/unban`, {}, adminHeaders());
    return response.success;
  },

  async deactivateUser(userId: string): Promise<boolean> {
    const response = await apiPost(`${AUTH_ENDPOINTS.ADMIN_USER_DEACTIVATE}/${userId}/deactivate`, {}, adminHeaders());
    return response.success;
  },

  async reactivateUser(userId: string): Promise<boolean> {
    const response = await apiPost(`${AUTH_ENDPOINTS.ADMIN_USER_REACTIVATE}/${userId}/reactivate`, {}, adminHeaders());
    return response.success;
  },

  async changeUserRole(userId: string, role: string): Promise<boolean> {
    const response = await apiPatch(`${AUTH_ENDPOINTS.ADMIN_USER_ROLE}/${userId}/role`, { role }, adminHeaders());
    return response.success;
  },

  async forceVerifyEmail(userId: string): Promise<boolean> {
    const response = await apiPost(`${AUTH_ENDPOINTS.ADMIN_USER_FORCE_VERIFY_EMAIL}/${userId}/verify-email`, {}, adminHeaders());
    return response.success;
  },

  async forceLogout(userId: string): Promise<boolean> {
    const response = await apiPost(`${AUTH_ENDPOINTS.ADMIN_USER_FORCE_LOGOUT}/${userId}/force-logout`, {}, adminHeaders());
    return response.success;
  },

  async unlockUser(userId: string): Promise<boolean> {
    const response = await apiPost(`${AUTH_ENDPOINTS.ADMIN_USER_UNLOCK}/${userId}/unlock`, {}, adminHeaders());
    return response.success;
  },

  async verifyOrganizer(userId: string): Promise<boolean> {
    const response = await apiPost(`${AUTH_ENDPOINTS.ADMIN_USER_VERIFY_ORGANIZER}/${userId}/verify-organizer`, {}, adminHeaders());
    return response.success;
  },

  // ─── Games ────────────────────────────────────────────────────────────────

  async fetchGames(): Promise<AdminGame[]> {
    const response = await apiGet(TOURNAMENT_ENDPOINTS.GAMES_LIST, adminHeaders());
    if (!response.success) return [];
    const raw = response.data as Record<string, unknown>;
    const list = Array.isArray(raw) ? raw : ((raw.games ?? raw.data ?? []) as Record<string, unknown>[]);
    return list.map(mapGame);
  },

  async createGame(payload: CreateGamePayload): Promise<AdminGame> {
    const body = {
      name: payload.name,
      slug: payload.slug,
      category: payload.category,
      platform: payload.platform,
      supported_formats: payload.supportedFormats,
      in_game_id_config: {
        label: payload.inGameIdLabel,
        example: payload.inGameIdExample,
      },
      logo_url: payload.logoUrl || undefined,
      banner_url: payload.bannerUrl || undefined,
      publisher: payload.publisher || undefined,
      is_featured: payload.isFeatured ?? false,
      is_active: true,
    };
    const response = await apiPost(TOURNAMENT_ENDPOINTS.GAME_CREATE, body, adminHeaders());
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to create game';
      throw new Error(msg);
    }
    const data = response.data as Record<string, unknown>;
    return mapGame((data.game ?? data) as Record<string, unknown>);
  },

  async updateGame(gameId: string, updates: Partial<CreateGamePayload>): Promise<AdminGame> {
    const body: Record<string, unknown> = {};
    if (updates.name) body.name = updates.name;
    if (updates.logoUrl !== undefined) body.logo_url = updates.logoUrl;
    if (updates.bannerUrl !== undefined) body.banner_url = updates.bannerUrl;
    if (updates.publisher !== undefined) body.publisher = updates.publisher;
    if (updates.isFeatured !== undefined) body.is_featured = updates.isFeatured;
    if (updates.platform) body.platform = updates.platform;
    if (updates.supportedFormats) body.supported_formats = updates.supportedFormats;
    if (updates.inGameIdLabel || updates.inGameIdExample) {
      body.in_game_id_config = {
        ...(updates.inGameIdLabel && { label: updates.inGameIdLabel }),
        ...(updates.inGameIdExample && { example: updates.inGameIdExample }),
      };
    }

    const response = await apiPatch(`${TOURNAMENT_ENDPOINTS.GAME_DETAIL}/${gameId}`, body, adminHeaders());
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to update game';
      throw new Error(msg);
    }
    const data = response.data as Record<string, unknown>;
    return mapGame((data.game ?? data) as Record<string, unknown>);
  },

  async toggleGameActive(gameId: string): Promise<boolean> {
    const response = await apiPatch(`${TOURNAMENT_ENDPOINTS.GAME_TOGGLE_ACTIVE}/${gameId}/toggle-active`, {}, adminHeaders());
    return response.success;
  },

  async deleteGame(gameId: string): Promise<boolean> {
    const response = await apiDelete(`${TOURNAMENT_ENDPOINTS.GAME_DETAIL}/${gameId}`, adminHeaders());
    return response.success;
  },

  // ─── Organizer Verifications ──────────────────────────────────────────────

  async fetchVerifications(status?: string): Promise<OrganizerVerificationRequest[]> {
    const url = status
      ? `${AUTH_ENDPOINTS.ADMIN_VERIFICATIONS_DETAILS}?status=${status}`
      : AUTH_ENDPOINTS.ADMIN_VERIFICATIONS_DETAILS;
    const response = await apiGet(url, adminHeaders());
    if (!response.success) return [];
    const raw = response.data as Record<string, unknown>;
    const list = Array.isArray(raw) ? raw : ((raw.verifications ?? raw.requests ?? raw.data ?? []) as Record<string, unknown>[]);
    return list.map(mapVerification);
  },

  async startVerificationReview(requestId: string): Promise<boolean> {
    const response = await apiPost(`${AUTH_ENDPOINTS.ADMIN_VERIFICATIONS_DETAILS}/${requestId}/review-start`, {}, adminHeaders());
    return response.success;
  },

  async reviewVerification(
    requestId: string,
    action: 'approve' | 'reject' | 'needs_resubmission',
    notes?: string,
    rejectionReasons?: string[],
  ): Promise<boolean> {
    const body: Record<string, unknown> = { action };
    if (notes) body.review_notes = notes;
    if (rejectionReasons?.length) body.rejection_reasons = rejectionReasons;
    const response = await apiPost(`${AUTH_ENDPOINTS.ADMIN_VERIFICATIONS_DETAILS}/${requestId}/review`, body, adminHeaders());
    return response.success;
  },

  // ─── Admin Profile ────────────────────────────────────────────────────────

  async fetchProfile(): Promise<Record<string, unknown> | null> {
    const response = await apiGet(AUTH_ENDPOINTS.ADMIN_SESSIONS, adminHeaders());
    if (!response.success) return null;
    return response.data as Record<string, unknown>;
  },

  async updateAdminProfile(updates: { firstName?: string; lastName?: string; avatarUrl?: string }): Promise<boolean> {
    const body: Record<string, unknown> = {};
    if (updates.firstName !== undefined) body.first_name = updates.firstName;
    if (updates.lastName !== undefined) body.last_name = updates.lastName;
    if (updates.avatarUrl !== undefined) body.avatar_url = updates.avatarUrl;
    const response = await apiPatch(AUTH_ENDPOINTS.PROFILE, body, adminHeaders());
    return response.success;
  },
};
