import { getAccessToken } from './auth.utils';

let refreshTimer: number | null = null;

/**
 * Start a timer that checks token expiry every 60 seconds
 * and calls the provided refresh callback if less than 2 minutes remain.
 */
export const startTokenRefreshTimer = (refreshFn: () => Promise<string | null>) => {
  stopTokenRefreshTimer();

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
