import { apiPost, apiGet } from '../utils/api.utils';
import { AUTH_ENDPOINTS } from '../config/api.config';
import type { ApiSuccessResponse } from '../config/api.config';
import type {
  AdminUser,
  AdminTokens,
  AdminLoginPayload,
  AdminLoginResult,
  Admin2FAVerifyPayload,
} from '../types/admin.types';

// ─── Error ───────────────────────────────────────────────────────────────────

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string = 'UNKNOWN_ERROR',
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

function codeToStatus(code: string): number {
  const map: Record<string, number> = {
    AUTHENTICATION_FAILED: 401,
    UNAUTHORIZED: 401,
    TOKEN_EXPIRED: 401,
    TOKEN_INVALID: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INVALID_ADMIN_SECRET: 403,
  };
  return map[code] ?? 400;
}

function assertSuccess<T>(
  response: { success: boolean; data?: unknown; error?: { code: string; message: string } },
): asserts response is ApiSuccessResponse<T> {
  if (!response.success) {
    const code = response.error?.code ?? 'REQUEST_FAILED';
    const message = response.error?.message ?? 'Request failed';
    throw new AdminApiError(message, codeToStatus(code), code);
  }
}

// ─── Mapping ─────────────────────────────────────────────────────────────────

function mapAdminUser(raw: Record<string, unknown>): AdminUser {
  return {
    id: String(raw.user_id ?? raw.id ?? raw._id ?? ''),
    email: String(raw.email ?? ''),
    username: String(raw.username ?? ''),
    firstName: String(raw.first_name ?? raw.firstName ?? ''),
    lastName: String(raw.last_name ?? raw.lastName ?? ''),
    role: (raw.role as AdminUser['role']) ?? 'admin',
    avatarUrl: (raw.avatar_url ?? raw.avatarUrl) as string | undefined,
    is2FAEnabled: (raw.is_2fa_enabled ?? raw.is2FAEnabled) as boolean | undefined,
    createdAt: (raw.created_at ?? raw.createdAt) as string | undefined,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const adminAuthService = {
  /**
   * Admin login — may return tokens directly, or require 2FA / 2FA setup.
   */
  async login(payload: AdminLoginPayload): Promise<AdminLoginResult> {
    const body: Record<string, string> = {
      email: payload.email,
      password: payload.password,
    };
    if (payload.adminSecret) body.admin_secret = payload.adminSecret;

    const response = await apiPost(AUTH_ENDPOINTS.ADMIN_LOGIN, body, { skipAuth: true });
    assertSuccess<Record<string, unknown>>(response);

    const data = response.data;

    // Case 1: 2FA setup required (first-time admin)
    // Backend shape: { requires_2fa_setup: true, user_id, setup: { qr_code_data_url, manual_entry_key, issuer } }
    if (data.requires_2fa_setup || data.requires2FASetup) {
      const setup = (data.setup ?? {}) as Record<string, unknown>;
      return {
        requires2FASetup: true,
        userId: String(data.user_id ?? data.userId ?? ''),
        qrCode: String(setup.qr_code_data_url ?? setup.qr_code ?? data.qr_code_data_url ?? data.qr_code ?? ''),
        secret: String(setup.manual_entry_key ?? setup.secret ?? data.manual_entry_key ?? data.secret ?? ''),
      };
    }

    // Case 2: 2FA verification required (returning admin)
    // Backend shape: { requires_2fa: true, user_id, two_factor_method }
    if (data.requires_2fa || data.requires2FA) {
      return {
        requires2FA: true,
        userId: String(data.user_id ?? data.userId ?? ''),
      };
    }

    // Case 3: Direct success
    const accessToken = String(data.access_token ?? data.accessToken ?? '');
    const refreshToken = (data.refresh_token ?? data.refreshToken) as string | undefined;
    const rawUser = (data.user ?? {}) as Record<string, unknown>;

    return {
      tokens: { accessToken, refreshToken: refreshToken ? String(refreshToken) : undefined },
      user: mapAdminUser(rawUser),
    };
  },

  /**
   * Verify 2FA code during admin login.
   */
  async verify2FA(payload: Admin2FAVerifyPayload): Promise<AdminLoginResult> {
    const body = { user_id: payload.userId, code: payload.code };
    const response = await apiPost(AUTH_ENDPOINTS.ADMIN_LOGIN_2FA, body, { skipAuth: true });
    assertSuccess<Record<string, unknown>>(response);

    const data = response.data;
    const accessToken = String(data.access_token ?? data.accessToken ?? '');
    const refreshToken = (data.refresh_token ?? data.refreshToken) as string | undefined;
    const rawUser = (data.user ?? {}) as Record<string, unknown>;

    return {
      tokens: { accessToken, refreshToken: refreshToken ? String(refreshToken) : undefined },
      user: mapAdminUser(rawUser),
    };
  },

  /**
   * Verify 2FA setup (first time — user scanned QR, enters code).
   * Backend returns { enabled: true, backup_codes, message } — NO tokens.
   * After this the admin must log in again with credentials + 2FA code.
   */
  async verify2FASetup(payload: Admin2FAVerifyPayload): Promise<AdminLoginResult> {
    const body = { user_id: payload.userId, code: payload.code };
    const response = await apiPost(AUTH_ENDPOINTS.ADMIN_2FA_SETUP_VERIFY, body, { skipAuth: true });
    assertSuccess<Record<string, unknown>>(response);

    const data = response.data;
    return {
      setupComplete: true,
      backupCodes: (data.backup_codes ?? []) as string[],
    };
  },

  /**
   * Refresh admin access token.
   */
  async refreshToken(refreshToken?: string): Promise<{ tokens?: AdminTokens }> {
    const body = refreshToken ? { refresh_token: refreshToken } : {};
    const response = await apiPost(AUTH_ENDPOINTS.ADMIN_TOKEN_REFRESH, body, { skipAuth: true });
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

  /**
   * Validate admin token by calling /admin/token/validate.
   */
  async validateToken(accessToken: string): Promise<{ user?: AdminUser }> {
    const response = await apiGet(AUTH_ENDPOINTS.ADMIN_TOKEN_VALIDATE, {
      headers: { Authorization: `Bearer ${accessToken}` },
      skipAuth: true,
    });
    if (!response.success) {
      const code = response.error?.code ?? 'TOKEN_INVALID';
      throw new AdminApiError(
        response.error?.message ?? 'Admin token validation failed',
        codeToStatus(code),
        code,
      );
    }

    const data = response.data as Record<string, unknown>;
    const rawUser = (data.user ?? data) as Record<string, unknown>;

    return { user: mapAdminUser(rawUser) };
  },

  /**
   * Logout admin session.
   */
  async logout(accessToken?: string): Promise<void> {
    try {
      const opts = accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` }, skipAuth: true as const }
        : undefined;
      await apiPost(AUTH_ENDPOINTS.ADMIN_LOGOUT, {}, opts);
    } catch {
      // logout failures are non-critical
    }
  },
};
