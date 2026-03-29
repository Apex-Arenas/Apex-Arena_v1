import { apiPost, apiGet } from '../utils/api.utils';
import { AUTH_ENDPOINTS } from '../config/api.config';
import type { ApiSuccessResponse } from '../config/api.config';
import type { User } from '../types/auth.types';

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
  return {
    id: String(raw.user_id ?? raw.id ?? ''),
    email: String(raw.email ?? ''),
    username: String(raw.username ?? ''),
    firstName: String(raw.first_name ?? raw.firstName ?? ''),
    lastName: String(raw.last_name ?? raw.lastName ?? ''),
    role: (raw.role as User['role']) ?? 'player',
    avatarUrl: raw.avatar_url as string | undefined ?? raw.avatarUrl as string | undefined,
    isEmailVerified: raw.is_email_verified as boolean | undefined ?? raw.isEmailVerified as boolean | undefined,
    isActive: raw.is_active as boolean | undefined ?? raw.isActive as boolean | undefined,
    createdAt: raw.created_at as string | undefined ?? raw.createdAt as string | undefined,
    updatedAt: raw.updated_at as string | undefined ?? raw.updatedAt as string | undefined,
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
};
