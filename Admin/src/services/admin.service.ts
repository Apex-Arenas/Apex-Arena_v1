import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '../utils/api.utils';
import { AUTH_ENDPOINTS, TOURNAMENT_ENDPOINTS, FINANCE_ENDPOINTS } from '../config/api.config';
import { getAdminAccessToken } from '../utils/auth.utils';
import type { AdminStats, ManagedUser } from '../types/admin.types';

// Helper — injects the admin Bearer token into every request
function adminHeaders(): { headers: Record<string, string> } {
  const token = getAdminAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('[AdminService] No admin token found in storage');
  }
  return { headers };
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

  const tournamentCount = Number(
    stats.tournament_count ??
      stats.tournaments_hosted ??
      raw.tournament_count ??
      raw.tournaments_hosted ??
      0,
  );

  const playerCount = Number(
    stats.player_count ??
      stats.total_players ??
      raw.player_count ??
      raw.total_players ??
      0,
  );

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
    tournamentCount,
    playerCount,
  };
}

function mapVerification(raw: Record<string, unknown>): OrganizerVerificationRequest {
  const user = (raw.user_id ?? raw.user ?? {}) as Record<string, unknown>;
  const userProfile = (user.profile ?? {}) as Record<string, unknown>;
  const businessInfo = (raw.business_info ?? {}) as Record<string, unknown>;
  const docs = (raw.required_documents ?? raw.documents ?? {}) as Record<string, unknown>;
  const firstName = String(userProfile.first_name ?? user.first_name ?? '');
  const lastName = String(userProfile.last_name ?? user.last_name ?? '');
  const reviewedBy = raw.reviewed_by as Record<string, unknown> | string | undefined;

  const getDocumentUrl = (doc: unknown): string | undefined => {
    if (!doc) return undefined;
    if (typeof doc === 'string') return doc;
    const payload = doc as Record<string, unknown>;
    return (payload.secure_url ?? payload.cloudinary_url ?? payload.url ?? payload.file_url) as string | undefined;
  };

  return {
    id: String(raw._id ?? raw.id ?? ''),
    userId: String(user._id ?? raw.user_id ?? ''),
    username: String(user.username ?? ''),
    email: String(user.email ?? ''),
    displayName: `${firstName} ${lastName}`.trim() || String(user.username ?? ''),
    avatarUrl: (userProfile.avatar_url ?? user.avatar_url) as string | undefined,
    businessName: String(businessInfo.business_name ?? raw.business_name ?? ''),
    businessType: String(businessInfo.business_type ?? raw.business_type ?? ''),
    registrationNumber: (businessInfo.registration_number ?? raw.registration_number) as string | undefined,
    contactPerson: (businessInfo.contact_person ?? raw.contact_person) as string | undefined,
    address: (businessInfo.address ?? raw.address) as string | undefined,
    documents: {
      idFront: getDocumentUrl(docs.id_front ?? docs.idFront),
      idBack: getDocumentUrl(docs.id_back ?? docs.idBack),
      selfieWithId: getDocumentUrl(docs.selfie_with_id ?? docs.selfieWithId),
      businessRegistration: getDocumentUrl(docs.business_registration ?? docs.businessRegistration),
    },
    status: String(raw.status ?? 'pending') as OrganizerVerificationRequest['status'],
    submittedAt: String(raw.submitted_at ?? raw.created_at ?? raw.submittedAt ?? ''),
    reviewedAt: raw.reviewed_at as string | undefined,
    rejectionReasons: raw.rejection_reasons as string[] | undefined,
    reviewNotes: (raw.admin_notes ?? raw.review_notes) as string | undefined,
    reviewerId: reviewedBy
      ? String((reviewedBy as Record<string, unknown>)._id ?? reviewedBy)
      : undefined,
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
  const verificationStatus = (raw.verification_status ?? raw.verificationStatus ?? {}) as Record<string, unknown>;
  return {
    id: String(raw.user_id ?? raw._id ?? raw.id ?? ''),
    email: String(raw.email ?? ''),
    username: String(raw.username ?? ''),
    firstName: String(profile.first_name ?? raw.first_name ?? raw.firstName ?? ''),
    lastName: String(profile.last_name ?? raw.last_name ?? raw.lastName ?? ''),
    role: String(raw.role ?? 'player'),
    avatarUrl: (profile.avatar_url ?? raw.avatar_url ?? raw.avatarUrl) as string | undefined,
    isEmailVerified: Boolean(
      verificationStatus.email_verified ??
      raw.is_email_verified ??
      raw.isEmailVerified ??
      false,
    ),
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
    isBanned: Boolean(raw.is_banned ?? raw.isBanned ?? false),
    isLocked: Boolean(raw.is_locked ?? raw.isLocked ?? false),
    banReason: (raw.ban_reason ?? raw.banReason) as string | undefined,
    lastLogin: (raw.last_login ?? raw.lastLogin) as string | undefined,
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
  };
}

// ─── Payout Types ────────────────────────────────────────────────────────────

export interface AdminPayoutRequest {
  id: string;
  userId: string;
  username: string;
  email: string;
  amount: number;
  type: 'wallet_withdrawal' | 'tournament_winnings';
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  momoNumber?: string;
  network?: string;
  accountName?: string;
  tournamentId?: string;
  tournamentName?: string;
  requestedAt: string;
  processedAt?: string;
  adminNotes?: string;
}

// ─── Escrow Types ─────────────────────────────────────────────────────────────

export interface AdminEscrowInfo {
  tournamentId: string;
  tournamentName: string;
  status: string;
  prizePool: number;
  depositedAmount: number;
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Audit Log Types ──────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId: string;
  username?: string;
  action: string;
  category: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  severity?: 'info' | 'warning' | 'critical';
}

export interface AuditSearchParams {
  userId?: string;
  action?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ─── Game Request Types ───────────────────────────────────────────────────────

export interface GameRequest {
  id: string;
  userId: string;
  username: string;
  gameName: string;
  genre?: string;
  platform?: string[];
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'duplicate';
  upvoteCount: number;
  adminNotes?: string;
  duplicateOfId?: string;
  createdAt: string;
  reviewedAt?: string;
}

// ─── Scheduler Types ──────────────────────────────────────────────────────────

export interface SchedulerStatus {
  isRunning: boolean;
  lastRun?: Record<string, string>;
  nextRun?: Record<string, string>;
  jobs: string[];
}

// ─── Admin User Types ─────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  twoFactorEnabled?: boolean;
}

export interface AdminActionResponse {
  ok: boolean;
  code?: string;
  message?: string;
}

// ─── Session Types ────────────────────────────────────────────────────────────

export interface UserSession {
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  location?: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent?: boolean;
}

// ─── Audit Log Mapper ─────────────────────────────────────────────────────────

function mapAuditLog(l: Record<string, unknown>, fallbackUserId = ''): AuditLog {
  // user_id may be a populated object or a plain string ID
  const rawUser = l.user_id ?? l.userId;
  const userObj = rawUser && typeof rawUser === 'object'
    ? (rawUser as Record<string, unknown>)
    : null;

  const userId = userObj
    ? String(userObj._id ?? userObj.id ?? '')
    : String(rawUser ?? fallbackUserId);

  const username = userObj
    ? String(userObj.username ?? userObj.email ?? userId)
    : (l.username as string | undefined);

  return {
    id: String(l._id ?? l.id ?? ''),
    userId,
    username,
    // try several common field names the API may use
    action: String(l.action ?? l.event ?? l.event_type ?? l.type ?? ''),
    category: String(l.category ?? l.module ?? l.resource ?? ''),
    ipAddress: (l.ip_address ?? l.ip ?? l.ipAddress) as string | undefined,
    userAgent: (l.user_agent ?? l.userAgent) as string | undefined,
    metadata: l.metadata as Record<string, unknown> | undefined,
    createdAt: String(l.created_at ?? l.createdAt ?? l.timestamp ?? ''),
    severity: (l.severity ?? l.level) as AuditLog['severity'],
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export interface UsersListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  emailVerified?: boolean;
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
    if (params.emailVerified !== undefined) query.set('email_verified', String(params.emailVerified));
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
    const response = await apiPut(`${AUTH_ENDPOINTS.ADMIN_USER_ROLE}/${userId}/role`, { role }, adminHeaders());
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
    if (!response.success) {
      const msg = (response as { error?: { message?: string } }).error?.message ?? 'Failed to load organizer verifications';
      throw new Error(msg);
    }
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
    const backendAction = action === 'needs_resubmission' ? 'request_resubmission' : action;
    const body: Record<string, unknown> = { action: backendAction };
    if (notes) body.admin_notes = notes;
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

  // ─── User Sessions & Audit ────────────────────────────────────────────────

  async getUserSessions(userId: string): Promise<UserSession[]> {
    const response = await apiGet(`${AUTH_ENDPOINTS.ADMIN_USER_SESSIONS}/${userId}/sessions`, adminHeaders());
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    const list = (Array.isArray(data) ? data : (data.sessions ?? data.data ?? [])) as Record<string, unknown>[];
    return list.map((s) => ({
      sessionId: String(s.session_id ?? s.sessionId ?? s._id ?? s.id ?? ''),
      ipAddress: s.ip_address as string | undefined,
      userAgent: s.user_agent as string | undefined,
      device: s.device as string | undefined,
      location: s.location as string | undefined,
      createdAt: String(s.created_at ?? s.createdAt ?? ''),
      lastActiveAt: String(s.last_active_at ?? s.lastActiveAt ?? s.created_at ?? ''),
      isCurrent: Boolean(s.is_current ?? s.isCurrent ?? false),
    }));
  },

  async revokeUserSession(userId: string, sessionId: string): Promise<boolean> {
    const response = await apiDelete(
      `${AUTH_ENDPOINTS.ADMIN_USER_SESSION_REVOKE}/${userId}/sessions/${sessionId}`,
      adminHeaders(),
    );
    return response.success;
  },

  async forcePasswordReset(userId: string): Promise<boolean> {
    const response = await apiPost(
      `${AUTH_ENDPOINTS.ADMIN_USER_FORCE_PASSWORD_RESET}/${userId}/force-password-reset`,
      {},
      adminHeaders(),
    );
    return response.success;
  },

  async getUserAuditTrail(userId: string, params: { page?: number; limit?: number } = {}): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const url = `${AUTH_ENDPOINTS.ADMIN_USER_AUDIT_TRAIL}/${userId}/audit?${query.toString()}`;
    const response = await apiGet(url, adminHeaders());
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    const list = (Array.isArray(data) ? data : (data.logs ?? data.audit ?? data.data ?? [])) as Record<string, unknown>[];
    return list.map((l) => mapAuditLog(l, userId));
  },

  // ─── Audit Logs (Global) ──────────────────────────────────────────────────

  async searchAuditLogs(params: AuditSearchParams = {}): Promise<{ logs: AuditLog[]; total: number }> {
    const query = new URLSearchParams();
    if (params.userId) query.set('user_id', params.userId);
    if (params.action) query.set('action', params.action);
    if (params.category) query.set('category', params.category);
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const url = `${AUTH_ENDPOINTS.ADMIN_SEARCH_AUDIT_LOGS}?${query.toString()}`;
    const response = await apiGet(url, adminHeaders());
    if (!response.success) return { logs: [], total: 0 };
    const data = response.data as Record<string, unknown>;
    const list = (Array.isArray(data) ? data : (data.logs ?? data.data ?? [])) as Record<string, unknown>[];
    const total = Number((data.pagination as Record<string, unknown>)?.total ?? data.total ?? list.length);
    return {
      logs: list.map((l) => mapAuditLog(l)),
      total,
    };
  },

  async getSuspiciousActivity(): Promise<AuditLog[]> {
    const response = await apiGet(AUTH_ENDPOINTS.ADMIN_SECURITY_SUSPICIOUS, adminHeaders());
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    const list = (Array.isArray(data) ? data : (data.events ?? data.logs ?? data.data ?? [])) as Record<string, unknown>[];
    return list.map((l) => {
      const log = mapAuditLog(l);
      if (!log.category) log.category = 'security';
      if (!log.severity) log.severity = 'warning';
      return log;
    });
  },

  // ─── Admin Management ─────────────────────────────────────────────────────

  async fetchAdmins(): Promise<AdminUser[]> {
    const url = `${AUTH_ENDPOINTS.ADMIN_GET_USERS}?role=admin&limit=100`;
    const response = await apiGet(url, adminHeaders());
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    const list = (Array.isArray(data) ? data : (data.users ?? data.data ?? [])) as Record<string, unknown>[];
    return list.map((u) => {
      const profile = (u.profile ?? {}) as Record<string, unknown>;
      return {
        id: String(u._id ?? u.id ?? ''),
        email: String(u.email ?? ''),
        username: String(u.username ?? ''),
        firstName: String(profile.first_name ?? u.first_name ?? ''),
        lastName: String(profile.last_name ?? u.last_name ?? ''),
        role: String(u.role ?? 'admin'),
        isActive: Boolean(u.is_active ?? true),
        lastLogin: u.last_login as string | undefined,
        createdAt: String(u.created_at ?? u.createdAt ?? ''),
        twoFactorEnabled: Boolean(u.two_factor_enabled ?? u.twoFactorEnabled ?? false),
      };
    });
  },

  async setupAdmin(email: string, role: string): Promise<boolean> {
    const response = await apiPost(AUTH_ENDPOINTS.ADMIN_BOOTSTRAP, { email, role }, adminHeaders());
    return response.success;
  },

  async forceAdmin2FA(adminId: string): Promise<AdminActionResponse> {
    const response = await apiPost(
      `${AUTH_ENDPOINTS.ADMIN_GET_USERS.replace('/users', '')}/admins/${adminId}/force-2fa`,
      {},
      adminHeaders(),
    );
    if (!response.success) {
      return {
        ok: false,
        code: response.error.code,
        message: response.error.message,
      };
    }

    return {
      ok: true,
      message: response.message ?? '2FA setup required on next login.',
    };
  },

  // ─── Finance: Payouts ─────────────────────────────────────────────────────

  async fetchPendingPayouts(): Promise<AdminPayoutRequest[]> {
    const response = await apiGet(FINANCE_ENDPOINTS.ADMIN_PAYOUTS_PENDING, adminHeaders());
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    const list = (Array.isArray(data) ? data : (data.payouts ?? data.requests ?? data.data ?? [])) as Record<string, unknown>[];
    return list.map((p) => {
      const user = (p.user_id ?? p.user ?? {}) as Record<string, unknown>;
      const pd = (p.payout_details ?? {}) as Record<string, unknown>;
      return {
        id: String(p._id ?? p.id ?? ''),
        userId: String(user._id ?? user.id ?? p.user_id ?? ''),
        username: String(user.username ?? p.username ?? ''),
        email: String(user.email ?? p.email ?? ''),
        amount: Number(p.amount ?? 0),                          // pesewas — divide by 100 to display
        type: String(p.request_type ?? p.type ?? 'wallet_withdrawal') as AdminPayoutRequest['type'],
        status: String(p.status ?? 'pending') as AdminPayoutRequest['status'],
        momoNumber: (pd.momo_number ?? p.momo_number) as string | undefined,
        network: (pd.network ?? p.network) as string | undefined,
        accountName: (pd.account_name ?? p.account_name) as string | undefined,
        tournamentId: p.tournament_id as string | undefined,
        tournamentName: (p.tournament as Record<string, unknown>)?.name as string | undefined,
        requestedAt: String(p.requested_at ?? p.created_at ?? p.createdAt ?? ''),
        processedAt: p.processed_at as string | undefined,
        adminNotes: p.admin_notes as string | undefined,
      };
    });
  },

  async getPayoutDetail(id: string): Promise<AdminPayoutRequest | null> {
    const response = await apiGet(`${FINANCE_ENDPOINTS.ADMIN_PAYOUT_DETAIL}/${id}`, adminHeaders());
    if (!response.success) return null;
    const p = (response.data as Record<string, unknown>).payout as Record<string, unknown> ?? response.data as Record<string, unknown>;
    const user = (p.user_id ?? p.user ?? {}) as Record<string, unknown>;
    const pd = (p.payout_details ?? {}) as Record<string, unknown>;
    return {
      id: String(p._id ?? p.id ?? ''),
      userId: String(user._id ?? user.id ?? p.user_id ?? ''),
      username: String(user.username ?? p.username ?? ''),
      email: String(user.email ?? p.email ?? ''),
      amount: Number(p.amount ?? 0),                          // pesewas — divide by 100 to display
      type: String(p.request_type ?? p.type ?? 'wallet_withdrawal') as AdminPayoutRequest['type'],
      status: String(p.status ?? 'pending') as AdminPayoutRequest['status'],
      momoNumber: (pd.momo_number ?? p.momo_number) as string | undefined,
      network: (pd.network ?? p.network) as string | undefined,
      accountName: (pd.account_name ?? p.account_name) as string | undefined,
      tournamentId: p.tournament_id as string | undefined,
      tournamentName: (p.tournament as Record<string, unknown>)?.name as string | undefined,
      requestedAt: String(p.requested_at ?? p.created_at ?? p.createdAt ?? ''),
      processedAt: p.processed_at as string | undefined,
      adminNotes: p.admin_notes as string | undefined,
    };
  },

  async approvePayout(id: string, notes?: string): Promise<boolean> {
    const body: Record<string, unknown> = {};
    if (notes) body.admin_notes = notes;
    const response = await apiPatch(`${FINANCE_ENDPOINTS.ADMIN_PAYOUT_APPROVE}/${id}/approve`, body, adminHeaders());
    return response.success;
  },

  async rejectPayout(id: string, reason: string): Promise<boolean> {
    const response = await apiPatch(
      `${FINANCE_ENDPOINTS.ADMIN_PAYOUT_REJECT}/${id}/reject`,
      { reason },
      adminHeaders(),
    );
    return response.success;
  },

  // ─── Finance: Escrow ──────────────────────────────────────────────────────

  async getAdminEscrowStatus(tournamentId: string): Promise<AdminEscrowInfo | null> {
    const response = await apiGet(`${FINANCE_ENDPOINTS.ADMIN_ESCROW_STATUS}/${tournamentId}`, adminHeaders());
    if (!response.success) return null;
    const raw = (response.data as Record<string, unknown>).escrow as Record<string, unknown> ?? response.data as Record<string, unknown>;
    return {
      tournamentId: String(raw.tournament_id ?? raw.tournamentId ?? tournamentId),
      tournamentName: String((raw.tournament as Record<string, unknown>)?.name ?? raw.tournament_name ?? ''),
      status: String(raw.status ?? ''),
      prizePool: Number(raw.prize_pool ?? raw.prizePool ?? 0),
      depositedAmount: Number(raw.deposited_amount ?? raw.depositedAmount ?? 0),
      balance: Number(raw.balance ?? 0),
      currency: String(raw.currency ?? 'GHS'),
      createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
      updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ''),
    };
  },

  async cancelEscrow(tournamentId: string): Promise<boolean> {
    const response = await apiPost(`${FINANCE_ENDPOINTS.ADMIN_ESCROW_CANCEL}/${tournamentId}/cancel`, {}, adminHeaders());
    return response.success;
  },

  async runEscrowProcessor(): Promise<boolean> {
    const response = await apiPost(FINANCE_ENDPOINTS.ADMIN_ESCROW_PROCESSOR_RUN, {}, adminHeaders());
    return response.success;
  },

  // ─── Scheduler ────────────────────────────────────────────────────────────

  async getSchedulerStatus(): Promise<SchedulerStatus | null> {
    const response = await apiGet(TOURNAMENT_ENDPOINTS.SCHEDULER_STATUS, adminHeaders());
    if (!response.success) return null;
    const raw = response.data as Record<string, unknown>;
    return {
      isRunning: Boolean(raw.is_running ?? raw.isRunning ?? false),
      lastRun: raw.last_run as Record<string, string> | undefined,
      nextRun: raw.next_run as Record<string, string> | undefined,
      jobs: (raw.jobs ?? []) as string[],
    };
  },

  async runSchedulerJob(job: 'auto-lock' | 'auto-start' | 'check-in-reminders' | 'disqualify-no-shows' | 'auto-forfeit' | 'match-ready-checks'): Promise<boolean> {
    const endpointMap: Record<string, string> = {
      'auto-lock': TOURNAMENT_ENDPOINTS.SCHEDULER_AUTO_LOCK,
      'auto-start': TOURNAMENT_ENDPOINTS.SCHEDULER_AUTO_START,
      'check-in-reminders': TOURNAMENT_ENDPOINTS.SCHEDULER_CHECK_IN_REMINDERS,
      'disqualify-no-shows': TOURNAMENT_ENDPOINTS.SCHEDULER_DISQUALIFY_NO_SHOWS,
      'auto-forfeit': TOURNAMENT_ENDPOINTS.SCHEDULER_AUTO_FORFEIT,
      'match-ready-checks': TOURNAMENT_ENDPOINTS.SCHEDULER_MATCH_READY_CHECKS,
    };
    const response = await apiPost(endpointMap[job], {}, adminHeaders());
    return response.success;
  },

  // ─── Game Requests ────────────────────────────────────────────────────────

  async fetchGameRequests(status?: string): Promise<GameRequest[]> {
    const url = status
      ? `${TOURNAMENT_ENDPOINTS.GAME_REQUESTS}?status=${status}`
      : TOURNAMENT_ENDPOINTS.GAME_REQUESTS;
    const response = await apiGet(url, adminHeaders());
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    const list = (Array.isArray(data) ? data : (data.requests ?? data.data ?? [])) as Record<string, unknown>[];
    return list.map((r) => {
      const user = (r.user_id ?? r.user ?? {}) as Record<string, unknown>;
      return {
        id: String(r._id ?? r.id ?? ''),
        userId: String(user._id ?? user.id ?? r.user_id ?? ''),
        username: String(user.username ?? r.username ?? ''),
        gameName: String(r.game_name ?? r.gameName ?? ''),
        genre: r.genre as string | undefined,
        platform: r.platform as string[] | undefined,
        description: r.description as string | undefined,
        status: String(r.status ?? 'pending') as GameRequest['status'],
        upvoteCount: Number(r.upvote_count ?? r.upvoteCount ?? r.upvotes ?? 0),
        adminNotes: r.admin_notes as string | undefined,
        duplicateOfId: r.duplicate_of as string | undefined,
        createdAt: String(r.created_at ?? r.createdAt ?? ''),
        reviewedAt: r.reviewed_at as string | undefined,
      };
    });
  },

  async reviewGameRequest(requestId: string, action: 'approve' | 'reject', notes?: string): Promise<boolean> {
    const body: Record<string, unknown> = { action };
    if (notes) body.admin_notes = notes;
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.GAME_REQUEST_ADMIN_REVIEW}/${requestId}/review`,
      body,
      adminHeaders(),
    );
    return response.success;
  },

  async markGameRequestDuplicate(requestId: string, duplicateOfId: string): Promise<boolean> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.GAME_REQUEST_ADMIN_MARK_DUPLICATE}/${requestId}/mark-duplicate`,
      { duplicate_of: duplicateOfId },
      adminHeaders(),
    );
    return response.success;
  },

  // ─── Match Admin Override ─────────────────────────────────────────────────

  async getUserDetail(userId: string): Promise<ManagedUser | null> {
    const response = await apiGet(`${AUTH_ENDPOINTS.ADMIN_GET_USER_DETAILS}/${userId}`, adminHeaders());
    if (!response.success) return null;
    const data = response.data as Record<string, unknown>;
    return mapManagedUser((data.user ?? data) as Record<string, unknown>);
  },

  async adminOverrideMatch(matchId: string, winnerId: string, reason: string): Promise<boolean> {
    const response = await apiPost(
      `${TOURNAMENT_ENDPOINTS.MATCH_ADMIN_OVERRIDE}/${matchId}/override`,
      { winner_id: winnerId, reason },
      adminHeaders(),
    );
    return response.success;
  },

  async fetchMatchForAdmin(matchId: string): Promise<Record<string, unknown> | null> {
    const response = await apiGet(
      `${TOURNAMENT_ENDPOINTS.MATCHES}/${matchId}`,
      adminHeaders(),
    );
    if (!response.success) return null;
    const data = response.data as Record<string, unknown>;
    return (data.match ?? data) as Record<string, unknown>;
  },

  async fetchDisputedMatches(limit = 20): Promise<Record<string, unknown>[]> {
    const response = await apiGet(
      `${TOURNAMENT_ENDPOINTS.MATCH_ADMIN_DISPUTES}?limit=${limit}`,
      adminHeaders(),
    );
    if (!response.success) return [];
    const data = response.data as Record<string, unknown>;
    return (Array.isArray(data) ? data : (data.disputes ?? [])) as Record<string, unknown>[];
  },
};
