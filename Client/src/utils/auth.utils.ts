/**
 * Simple localStorage wrappers for authentication tokens.
 * These are used by the API client (api.utils.ts) and kept in sync
 * with the session object that AuthProvider reads on startup.
 */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_STORAGE_KEY = 'apex_arenas_auth';
const ADMIN_ACCESS_TOKEN_KEY = 'admin_accessToken';
const ADMIN_STORAGE_KEY = 'apex_arenas_admin_auth';

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const saveTokens = (tokens: { accessToken: string; refreshToken?: string }): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  // Keep the session object in sync so AuthProvider reads fresh tokens on reload
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      session.tokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? session.tokens?.refreshToken,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // If the session object is corrupt, leave it — AuthProvider will handle it
  }
};

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

// ─── Admin token helpers ──────────────────────────────────────────────────────

export const getAdminAccessToken = (): string | null => {
  // Always read from the session object first — it's always up to date
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const session = JSON.parse(raw) as { tokens?: { accessToken?: string } };
      const token = session?.tokens?.accessToken;
      if (token) return token;
    }
  } catch {
    // fall through
  }
  // Secondary: dedicated key
  return localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY);
};

export const saveAdminTokens = (tokens: { accessToken: string; refreshToken?: string }): void => {
  localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, tokens.accessToken);
};

export const clearAdminTokens = (): void => {
  localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
  localStorage.removeItem(ADMIN_STORAGE_KEY);
};

/**
 * Check if user is authenticated (token exists and not expired).
 */
export const isAuthenticated = (): boolean => {
  const token = getAccessToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000;
    return expiry > Date.now();
  } catch {
    return false;
  }
};
