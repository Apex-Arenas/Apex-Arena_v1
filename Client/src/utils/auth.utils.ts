/**
 * Simple localStorage wrappers for authentication tokens.
 * These are used by the API client and can also be consumed by your AuthContext.
 */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const saveTokens = (tokens: { accessToken: string; refreshToken: string }): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const logout = (): void => {
  clearTokens();
  // Optionally redirect to login – but better to let the auth context handle navigation
  // window.location.hash = '/login';
};

/**
 * Check if user is authenticated (token exists and not expired)
 * Simple check – you can enhance with JWT decoding if needed.
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