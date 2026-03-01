import { getAccessToken, getRefreshToken, saveTokens, logout } from './auth.utils';
import { AUTH_ENDPOINTS } from '../config/api.config';
import type { ApiResponse } from '../config/api.config';
import { generateUniqueIdempotencyKey } from './idempotency.utils';

interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean;
  skipIdempotency?: boolean;
  skipCache?: boolean;
}

interface CacheEntry<T> {
  promise: Promise<ApiResponse<T>>;
  timestamp: number;
}

const requestCache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 100; // ms – very short, adjust as needed
const CACHE_CLEANUP_INTERVAL = 5000;

// Periodic cache cleanup
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  requestCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_DURATION) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => requestCache.delete(key));
  if (keysToDelete.length > 0) {
    console.log(`[API Cache] Cleaned up ${keysToDelete.length} stale entries`);
  }
}, CACHE_CLEANUP_INTERVAL);

function generateCacheKey(url: string, options: ApiFetchOptions): string {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.stringify(options.body) : '';
  return `${method}:${url}:${body}`;
}

function getCachedRequest<T>(
  cacheKey: string,
  requestFn: () => Promise<ApiResponse<T>>
): Promise<ApiResponse<T>> {
  const cached = requestCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log('[API Cache] Using cached request:', cacheKey);
    return cached.promise;
  }
  console.log('[API Cache] Creating new request:', cacheKey);
  const promise = requestFn().finally(() => {
    setTimeout(() => {
      requestCache.delete(cacheKey);
    }, CACHE_DURATION);
  });
  requestCache.set(cacheKey, { promise, timestamp: now });
  return promise;
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns true if successful, false otherwise.
 */
export const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      console.warn('[API] No refresh token available');
      return false;
    }

    console.log('[API] Refreshing access token...');
    const response = await fetch(AUTH_ENDPOINTS.TOKEN_REFRESH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      console.error('[API] Token refresh failed with status:', response.status);
      return false;
    }

    const data: ApiResponse = await response.json();
    if (!data.success) {
      console.error('[API] Token refresh failed:', data.error);
      return false;
    }

    saveTokens({
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken || refreshToken,
    });

    console.log('[API] Access token refreshed successfully');
    return true;
  } catch (error) {
    console.error('[API] Token refresh error:', error);
    return false;
  }
};

async function executeRequest<T = any>(
  url: string,
  options: ApiFetchOptions & { skipAuth: boolean; skipIdempotency: boolean }
): Promise<ApiResponse<T>> {
  const { skipAuth, skipIdempotency, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (fetchOptions.headers) {
    Object.entries(fetchOptions.headers).forEach(([key, value]) => {
      headers[key] = String(value);
    });
  }

  if (!skipAuth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      console.warn('[API] No access token available!');
    }
  }

  const method = (fetchOptions.method || 'GET').toUpperCase();
  const needsIdempotency = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (needsIdempotency && !skipIdempotency) {
    headers['X-Idempotency-Key'] = generateUniqueIdempotencyKey();
  }

  try {
    console.log('[API] Making request:', { url, method, hasBody: !!fetchOptions.body });

    let response = await fetch(url, { ...fetchOptions, headers });

    // Handle 401 by attempting token refresh once
    if (response.status === 401 && !skipAuth) {
      console.warn('[API] 401 Unauthorized - attempting token refresh');
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        console.error('[API] Token refresh failed - logging out');
        logout();
        // You might want to trigger navigation here – but keep it separate
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Session expired. Please login again.',
          },
        };
      }

      // Retry with new token
      const newToken = getAccessToken();
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { ...fetchOptions, headers });
    }

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error('[API] Non-JSON response:', { status: response.status, text: text.slice(0, 500) });
      return {
        success: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: `Server returned ${response.status} (not JSON)`,
        },
      };
    }

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      console.error('[API] Request failed:', { url, status: response.status, error: data.error });
    }

    return data;
  } catch (error) {
    console.error('[API] Fetch error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.',
      },
    };
  }
}

export const apiFetch = async <T = any>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<ApiResponse<T>> => {
  const { skipAuth = false, skipIdempotency = false, skipCache = false, ...fetchOptions } = options;

  const method = (fetchOptions.method || 'GET').toUpperCase();
  const isCacheable = method === 'GET' && !skipCache;

  if (isCacheable) {
    const cacheKey = generateCacheKey(url, options);
    return getCachedRequest(cacheKey, () =>
      executeRequest(url, { skipAuth, skipIdempotency, ...fetchOptions })
    );
  }

  return executeRequest(url, { skipAuth, skipIdempotency, ...fetchOptions });
};

// Convenience methods
export const apiGet = <T = any>(url: string, options?: ApiFetchOptions) =>
  apiFetch<T>(url, { ...options, method: 'GET', skipIdempotency: true });

export const apiPost = <T = any>(url: string, body: any, options?: ApiFetchOptions) =>
  apiFetch<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) });

export const apiPut = <T = any>(url: string, body: any, options?: ApiFetchOptions) =>
  apiFetch<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) });

export const apiPatch = <T = any>(url: string, body: any, options?: ApiFetchOptions) =>
  apiFetch<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T = any>(url: string, options?: ApiFetchOptions) =>
  apiFetch<T>(url, { ...options, method: 'DELETE' });

export const clearApiCache = () => {
  requestCache.clear();
  console.log('[API Cache] Cache cleared');
};