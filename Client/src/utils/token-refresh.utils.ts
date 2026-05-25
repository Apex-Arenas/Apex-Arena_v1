import { getAccessToken } from './auth.utils';

let refreshTimer: number | null = null;

const LAST_ACTIVE_KEY = 'apex_last_active';
// 30 minutes of inactivity → session expired
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

/** Call on every meaningful user interaction to reset the inactivity clock. */
export const touchLastActive = () => {
  localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
};

/** Returns true if the user has been inactive longer than INACTIVITY_TIMEOUT_MS. */
export const isSessionInactive = (): boolean => {
  const raw = localStorage.getItem(LAST_ACTIVE_KEY);
  if (!raw) return false; // no record yet — treat as active (first visit)
  return Date.now() - Number(raw) > INACTIVITY_TIMEOUT_MS;
};

/** Clear the last-active timestamp (call on logout). */
export const clearLastActive = () => {
  localStorage.removeItem(LAST_ACTIVE_KEY);
};

/**
 * Start a timer that checks token expiry every 60 seconds
 * and calls the provided refresh callback if less than 2 minutes remain.
 */
export const startTokenRefreshTimer = (refreshFn: () => Promise<string | null>) => {
  stopTokenRefreshTimer();

  // Record activity now so the clock starts from when the session begins
  touchLastActive();

  refreshTimer = window.setInterval(async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const timeLeft = expiryTime - Date.now();

      if (timeLeft < 120_000) {
        const result = await refreshFn();
        if (!result) {
          stopTokenRefreshTimer();
        }
      }
    } catch {
      // Token decode failed — let the next API call handle the 401
    }
  }, 60_000);
};

export const stopTokenRefreshTimer = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};
