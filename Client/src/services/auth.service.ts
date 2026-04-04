import { apiPost, apiGet, apiPut } from '../utils/api.utils';
import { AUTH_ENDPOINTS } from '../config/api.config';
import type { ApiSuccessResponse } from '../config/api.config';
import type {
  User,
  OrganizerVerificationInfo,
  OrganizerVerificationPayload,
  UpdateProfilePayload,
} from '../types/auth.types';

// ─── Error ───────────────────────────────────────────────────────────────────

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string = 'UNKNOWN_ERROR',
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

function codeToStatus(code: string): number {
  const map: Record<string, number> = {
    AUTHENTICATION_FAILED: 401,
    UNAUTHORIZED: 401,
    TOKEN_EXPIRED: 401,
    TOKEN_INVALID: 401,
    FORBIDDEN: 403,
    EMAIL_NOT_VERIFIED: 403,
    NOT_FOUND: 404,
  };
  return map[code] ?? 400;
}

function assertSuccess<T>(
  response: { success: boolean; data?: unknown; error?: { code: string; message: string } },
): asserts response is ApiSuccessResponse<T> {
  if (!response.success) {
    const code = response.error?.code ?? 'REQUEST_FAILED';
    const message = response.error?.message ?? 'Request failed';
    throw new ApiRequestError(message, codeToStatus(code), code);
  }
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

/** Map a snake_case user object from the backend to our camelCase User type */
function mapUser(raw: Record<string, unknown>): User {
  const profile = (raw.profile ?? {}) as Record<string, unknown>;
  const social = (profile.social_links ?? raw.social_links ?? {}) as Record<string, unknown>;
  const games = (profile.game_profiles ?? raw.game_profiles ?? []) as Record<string, unknown>[];
  const gameProfiles = games
    .map((g) => {
      const nestedGame = (g.game ?? {}) as Record<string, unknown>;
      const gameId = String(g.game_id ?? g.gameId ?? nestedGame._id ?? nestedGame.id ?? '');
      const inGameId = String(g.in_game_id ?? g.inGameId ?? '');

      if (!gameId && !inGameId) return null;

      return {
        gameId,
        gameName: (g.game_name ?? g.gameName ?? nestedGame.name) as string | undefined,
        inGameId,
        skillLevel: (g.skill_level ?? g.skillLevel) as User['gameProfiles'] extends (infer T)[] ? (T extends { skillLevel?: infer S } ? S : never) : never,
      };
    })
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  return {
    id: String(raw.user_id ?? raw._id ?? raw.id ?? ''),
    email: String(raw.email ?? ''),
    username: String(raw.username ?? ''),
    firstName: String(profile.first_name ?? raw.first_name ?? raw.firstName ?? ''),
    lastName: String(profile.last_name ?? raw.last_name ?? raw.lastName ?? ''),
    role: (raw.role as User['role']) ?? 'player',
    avatarUrl: (profile.avatar_url ?? raw.avatar_url ?? raw.avatarUrl) as string | undefined,
    bio: (profile.bio ?? raw.bio) as string | undefined,
    country: (profile.country ?? raw.country) as string | undefined,
    phone: (profile.phone_number ?? profile.phone ?? raw.phone_number ?? raw.phone) as string | undefined,
    socialLinks: {
      discord: social.discord as string | undefined,
      twitter: social.twitter as string | undefined,
      twitch: social.twitch as string | undefined,
      youtube: social.youtube as string | undefined,
    },
    gameProfiles: gameProfiles.length > 0 ? gameProfiles : undefined,
    organizerVerified: (raw.organizer_verified ?? raw.organizerVerified) as boolean | undefined,
    isEmailVerified: (raw.is_email_verified ?? raw.isEmailVerified) as boolean | undefined,
    isActive: (raw.is_active ?? raw.isActive) as boolean | undefined,
    createdAt: (raw.created_at ?? raw.createdAt) as string | undefined,
    updatedAt: (raw.updated_at ?? raw.updatedAt) as string | undefined,
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuthUser = User;

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthResult {
  tokens?: AuthTokens;
  user?: AuthUser;
  message?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  role: 'player' | 'organizer';
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResult> {
    const response = await apiPost(AUTH_ENDPOINTS.LOGIN, payload, { skipAuth: true });
    assertSuccess<Record<string, unknown>>(response);

    const data = response.data;
    const accessToken = String(data.access_token ?? data.accessToken ?? '');
    const refreshToken = (data.refresh_token ?? data.refreshToken) as string | undefined;
    const rawUser = (data.user ?? {}) as Record<string, unknown>;

    return {
      tokens: { accessToken, refreshToken: refreshToken ? String(refreshToken) : undefined },
      user: mapUser(rawUser),
    };
  },

  async register(payload: RegisterPayload): Promise<AuthResult> {
    // Map camelCase frontend fields to snake_case backend fields
    const body = {
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      username: payload.username,
      password: payload.password,
      role: payload.role,
    };
    const response = await apiPost(AUTH_ENDPOINTS.REGISTER, body, { skipAuth: true });
    assertSuccess<Record<string, unknown>>(response);

    const data = response.data;
    const rawUser = data.user as Record<string, unknown> | undefined;
    const message = data.message as string | undefined;

    return {
      user: rawUser ? mapUser(rawUser) : undefined,
      message,
    };
  },

  async logout(accessToken?: string): Promise<void> {
    try {
      const opts = accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` }, skipAuth: true as const }
        : undefined;
      await apiPost(AUTH_ENDPOINTS.LOGOUT, {}, opts);
    } catch {
      // logout failures are non-critical
    }
  },

  async refreshToken(refreshToken?: string): Promise<AuthResult> {
    const body = refreshToken
      ? { refresh_token: refreshToken }
      : {};
    const response = await apiPost(
      AUTH_ENDPOINTS.TOKEN_REFRESH,
      body,
      { skipAuth: true },
    );
    assertSuccess<Record<string, unknown>>(response);

    const data = response.data;
    const newAccessToken = String(data.access_token ?? data.accessToken ?? '');
    const newRefreshToken = (data.refresh_token ?? data.refreshToken ?? refreshToken) as string | undefined;

    return {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken ? String(newRefreshToken) : undefined,
      },
    };
  },

  async validateToken(accessToken: string): Promise<AuthResult> {
    const response = await apiGet(AUTH_ENDPOINTS.ME, {
      headers: { Authorization: `Bearer ${accessToken}` },
      skipAuth: true,
    });
    if (!response.success) {
      const code = response.error?.code ?? 'TOKEN_INVALID';
      throw new ApiRequestError(
        response.error?.message ?? 'Token validation failed',
        codeToStatus(code),
        code,
      );
    }
    assertSuccess<Record<string, unknown>>(response);

    // /me may return the user directly as data, or nested under data.user
    const data = response.data;
    const rawUser = (data.user ?? data) as Record<string, unknown>;

    return { user: mapUser(rawUser) };
  },

  async getProfile(accessToken: string): Promise<AuthResult> {
    const response = await apiGet(AUTH_ENDPOINTS.ME, {
      headers: { Authorization: `Bearer ${accessToken}` },
      skipAuth: true,
    });
    if (!response.success) {
      const code = response.error?.code ?? 'UNAUTHORIZED';
      throw new ApiRequestError(
        response.error?.message ?? 'Failed to load profile',
        codeToStatus(code),
        code,
      );
    }
    assertSuccess<Record<string, unknown>>(response);

    const data = response.data;
    const rawUser = (data.user ?? data) as Record<string, unknown>;

    return { user: mapUser(rawUser) };
  },

  async verifyOtp(data: { email: string; otp: string }): Promise<AuthResult> {
    const response = await apiPost(AUTH_ENDPOINTS.VERIFY_EMAIL, data, { skipAuth: true });
    assertSuccess<Record<string, unknown>>(response);

    const respData = response.data;
    const accessToken = (respData.access_token ?? respData.accessToken) as string | undefined;
    const refreshToken = (respData.refresh_token ?? respData.refreshToken) as string | undefined;
    const rawUser = respData.user as Record<string, unknown> | undefined;
    const message = respData.message as string | undefined;

    return {
      user: rawUser ? mapUser(rawUser) : undefined,
      tokens: accessToken ? { accessToken, refreshToken } : undefined,
      message,
    };
  },

  async resendOtp(email: string): Promise<{ message?: string }> {
    const response = await apiPost(
      AUTH_ENDPOINTS.RESEND_VERIFICATION,
      { email, type: 'email_verification' },
      { skipAuth: true },
    );
    assertSuccess<{ message?: string }>(response);
    return { message: response.data.message };
  },

  async requestPasswordReset(email: string): Promise<{ message?: string }> {
    const response = await apiPost(AUTH_ENDPOINTS.PASSWORD_RESET, { email }, { skipAuth: true });
    assertSuccess<{ message?: string }>(response);
    return { message: response.data.message };
  },

  async googleAuth(idToken: string, role?: 'player' | 'organizer'): Promise<AuthResult> {
    const body: Record<string, string> = { id_token: idToken };
    if (role) body.role = role;

    const response = await apiPost(AUTH_ENDPOINTS.GOOGLE_AUTH, body, { skipAuth: true });
    assertSuccess<Record<string, unknown>>(response);

    const data = response.data;
    const accessToken = String(data.access_token ?? data.accessToken ?? '');
    const refreshToken = (data.refresh_token ?? data.refreshToken) as string | undefined;
    const rawUser = (data.user ?? {}) as Record<string, unknown>;

    return {
      tokens: { accessToken, refreshToken: refreshToken ? String(refreshToken) : undefined },
      user: mapUser(rawUser),
    };
  },

  async googleLink(idToken: string, password: string): Promise<AuthResult> {
    const response = await apiPost(
      AUTH_ENDPOINTS.GOOGLE_LINK,
      { id_token: idToken, password },
      { skipAuth: true },
    );
    assertSuccess<Record<string, unknown>>(response);

    const data = response.data;
    const accessToken = String(data.access_token ?? data.accessToken ?? '');
    const refreshToken = (data.refresh_token ?? data.refreshToken) as string | undefined;
    const rawUser = (data.user ?? {}) as Record<string, unknown>;

    return {
      tokens: { accessToken, refreshToken: refreshToken ? String(refreshToken) : undefined },
      user: mapUser(rawUser),
    };
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<AuthResult> {
    const body: Record<string, unknown> = {};
    if (payload.firstName !== undefined) body.first_name = payload.firstName;
    if (payload.lastName !== undefined) body.last_name = payload.lastName;
    if (payload.bio !== undefined) body.bio = payload.bio;
    if (payload.country !== undefined) body.country = payload.country;
    if (payload.phone !== undefined) body.phone_number = payload.phone;
    if (payload.avatarUrl !== undefined) body.avatar_url = payload.avatarUrl;
    if (payload.discord !== undefined || payload.twitter !== undefined || payload.twitch !== undefined || payload.youtube !== undefined) {
      body.social_links = {
        ...(payload.discord !== undefined && { discord: payload.discord }),
        ...(payload.twitter !== undefined && { twitter: payload.twitter }),
        ...(payload.twitch !== undefined && { twitch: payload.twitch }),
        ...(payload.youtube !== undefined && { youtube: payload.youtube }),
      };
    }
    if (payload.gameProfiles !== undefined) {
      body.game_profiles = payload.gameProfiles.map((g) => ({
        game_id: g.gameId,
        in_game_id: g.inGameId,
        skill_level: g.skillLevel,
      }));
    }

    const response = await apiPut(AUTH_ENDPOINTS.UPDATE_PROFILE, body);
    assertSuccess<Record<string, unknown>>(response);

    const data = response.data;
    const rawUser = (data.user ?? data) as Record<string, unknown>;
    return { user: mapUser(rawUser) };
  },

  async requestOrganizerVerification(payload: OrganizerVerificationPayload): Promise<{ message?: string }> {
    const { getAccessToken } = await import('../utils/auth.utils');

    const form = new FormData();
    form.append('business_name', payload.businessName);
    form.append('business_type', payload.businessType);
    if (payload.registrationNumber) form.append('registration_number', payload.registrationNumber);
    if (payload.taxId) form.append('tax_id', payload.taxId);
    if (payload.contactPerson) form.append('contact_person', payload.contactPerson);
    if (payload.address) form.append('address', payload.address);
    form.append('id_front', payload.idFront);
    form.append('id_back', payload.idBack);
    form.append('selfie_with_id', payload.selfieWithId);
    if (payload.businessRegistration) form.append('business_registration', payload.businessRegistration);

    const token = getAccessToken();
    const res = await fetch(AUTH_ENDPOINTS.ORGANIZER_VERIFICATION_REQUEST, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });

    const raw = await res.json() as Record<string, unknown>;
    if (!raw.success) {
      const code = (raw.error_code ?? (raw.error as Record<string, unknown>)?.code ?? 'REQUEST_FAILED') as string;
      const message = (raw.message ?? raw.details ?? (raw.error as Record<string, unknown>)?.message ?? 'Submission failed') as string;
      throw new ApiRequestError(message, res.status, code);
    }

    const data = raw.data as Record<string, unknown> | undefined;
    return { message: data?.message as string | undefined };
  },

  async getVerificationStatus(): Promise<OrganizerVerificationInfo | null> {
    const response = await apiGet(AUTH_ENDPOINTS.ORGANIZER_VERIFICATION_STATUS);
    if (!response.success) return null;

    const data = response.data as Record<string, unknown>;
    const hasRequest = data.has_request as boolean | undefined;
    if (hasRequest === false) return null;

    const req = (data.request ?? data) as Record<string, unknown>;
    if (!req.status) return null;

    return {
      status: req.status as OrganizerVerificationInfo['status'],
      requestId: (req.request_id ?? req._id) as string | undefined,
      submittedAt: (req.submitted_at ?? req.created_at) as string | undefined,
      reviewedAt: req.reviewed_at as string | undefined,
      rejectionReasons: req.rejection_reasons as string[] | undefined,
      reviewNotes: (req.admin_notes ?? req.review_notes) as string | undefined,
    };
  },
};
