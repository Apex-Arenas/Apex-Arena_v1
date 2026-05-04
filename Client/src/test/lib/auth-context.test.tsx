import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { AuthProvider, useAuth } from '../../lib/auth-context';
import { AUTH_ENDPOINTS } from '../../config/api.config';
import { TEST_USER, TEST_TOKENS } from '../mocks/handlers';
import { clearApiCache } from '../../utils/api.utils';

// ── Auth utils mock (localStorage-backed token storage) ──────────────────────

const tokenStore = { access: '', refresh: '' };

vi.mock('../../utils/auth.utils', () => ({
  getAccessToken: vi.fn(() => tokenStore.access),
  getRefreshToken: vi.fn(() => tokenStore.refresh),
  saveTokens: vi.fn(({ accessToken, refreshToken }: { accessToken: string; refreshToken?: string }) => {
    tokenStore.access = accessToken;
    tokenStore.refresh = refreshToken ?? tokenStore.refresh;
  }),
  clearTokens: vi.fn(() => {
    tokenStore.access = '';
    tokenStore.refresh = '';
  }),
}));

vi.mock('../../utils/token-refresh.utils', () => ({
  startTokenRefreshTimer: vi.fn(),
  stopTokenRefreshTimer: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const AUTH_STORAGE_KEY = 'apex_arenas_auth';

function setStoredSession(tokens = TEST_TOKENS, user = TEST_USER) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ tokens, user }));
  tokenStore.access = tokens.accessToken;
  tokenStore.refresh = tokens.refreshToken;
}

function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  tokenStore.access = '';
  tokenStore.refresh = '';
}

// A component that surfaces auth state for assertions
function AuthDisplay() {
  const { isAuthenticated, isInitializing, user } = useAuth();
  if (isInitializing) return <div>Initializing</div>;
  if (!isAuthenticated) return <div>Not authenticated</div>;
  // username is reliably mapped by mapUser(); displayName is not
  return <div>Authenticated as {user?.username}</div>;
}

// A component that triggers login / logout
function AuthActions() {
  const { login, logout } = useAuth();
  return (
    <>
      <button onClick={() => login({ email: 'player@test.com', password: 'pass' })}>
        Login
      </button>
      <button onClick={() => logout()}>Logout</button>
    </>
  );
}

function renderWithAuth(ui: React.ReactNode) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

beforeEach(() => {
  clearStoredSession();
  clearApiCache(); // prevent GET /auth/me cache leaking between tests
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthProvider — bootstrap (no stored session)', () => {
  it('finishes as not authenticated when no session is stored', async () => {
    renderWithAuth(<AuthDisplay />);

    // With no stored session bootstrap completes synchronously — just assert final state
    await waitFor(() =>
      expect(screen.getByText('Not authenticated')).toBeInTheDocument(),
    );
  });
});

describe('AuthProvider — bootstrap (valid stored session)', () => {
  it('validates stored token via /auth/me and becomes authenticated', async () => {
    setStoredSession();

    // Default handler returns TEST_USER for GET /auth/me
    renderWithAuth(<AuthDisplay />);

    await waitFor(() =>
      expect(screen.getByText(`Authenticated as ${TEST_USER.username}`)).toBeInTheDocument(),
    );
  });
});

describe('AuthProvider — bootstrap (expired token, refresh succeeds)', () => {
  it('refreshes the token silently and stays authenticated', async () => {
    setStoredSession();

    server.use(
      // /auth/me rejects with a proper JSON 401 so validateToken throws ApiRequestError(401)
      http.get(AUTH_ENDPOINTS.ME, () =>
        HttpResponse.json(
          { success: false, error_code: 'TOKEN_EXPIRED', message: 'Token expired' },
          { status: 401 },
        ),
      ),
      // /auth/token/refresh succeeds with flat tokens
      http.post(AUTH_ENDPOINTS.TOKEN_REFRESH, () =>
        HttpResponse.json({
          success: true,
          data: {
            access_token: 'new-token',
            refresh_token: 'new-refresh',
            user: TEST_USER,
          },
        }),
      ),
    );

    renderWithAuth(<AuthDisplay />);

    await waitFor(() =>
      expect(screen.getByText(`Authenticated as ${TEST_USER.username}`)).toBeInTheDocument(),
    );
  });
});

describe('AuthProvider — bootstrap (expired token, refresh fails)', () => {
  it('clears the session and becomes not authenticated', async () => {
    setStoredSession();

    server.use(
      http.get(AUTH_ENDPOINTS.ME, () =>
        HttpResponse.json(
          { success: false, error_code: 'TOKEN_EXPIRED', message: 'Token expired' },
          { status: 401 },
        ),
      ),
      http.post(AUTH_ENDPOINTS.TOKEN_REFRESH, () =>
        HttpResponse.json(
          { success: false, error_code: 'TOKEN_INVALID', message: 'Refresh token invalid' },
          { status: 401 },
        ),
      ),
    );

    renderWithAuth(<AuthDisplay />);

    await waitFor(() =>
      expect(screen.getByText('Not authenticated')).toBeInTheDocument(),
    );

    // Session should be cleared from localStorage
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});

describe('AuthProvider — login', () => {
  it('sets authenticated state after a successful login', async () => {
    const user = userEvent.setup();

    renderWithAuth(
      <>
        <AuthDisplay />
        <AuthActions />
      </>,
    );

    // Wait for initializing to finish
    await waitFor(() =>
      expect(screen.getByText('Not authenticated')).toBeInTheDocument(),
    );

    await user.click(screen.getByText('Login'));

    await waitFor(() =>
      expect(screen.getByText(`Authenticated as ${TEST_USER.username}`)).toBeInTheDocument(),
    );
  });

  it('persists the session to localStorage after login', async () => {
    const user = userEvent.setup();

    renderWithAuth(<AuthActions />);

    await waitFor(() => screen.getByText('Login'));
    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.tokens.accessToken).toBe(TEST_TOKENS.accessToken);
    });
  });
});

describe('AuthProvider — logout', () => {
  it('clears authenticated state and removes session from localStorage', async () => {
    setStoredSession();
    const user = userEvent.setup();

    renderWithAuth(
      <>
        <AuthDisplay />
        <AuthActions />
      </>,
    );

    await waitFor(() =>
      expect(screen.getByText(`Authenticated as ${TEST_USER.username}`)).toBeInTheDocument(),
    );

    await act(async () => {
      await user.click(screen.getByText('Logout'));
    });

    await waitFor(() =>
      expect(screen.getByText('Not authenticated')).toBeInTheDocument(),
    );

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('clears session even when the logout API call fails', async () => {
    setStoredSession();
    const user = userEvent.setup();

    server.use(
      http.post(AUTH_ENDPOINTS.LOGOUT, () => new HttpResponse(null, { status: 500 })),
    );

    renderWithAuth(
      <>
        <AuthDisplay />
        <AuthActions />
      </>,
    );

    await waitFor(() =>
      expect(screen.getByText(`Authenticated as ${TEST_USER.username}`)).toBeInTheDocument(),
    );

    await act(async () => {
      await user.click(screen.getByText('Logout'));
    });

    await waitFor(() =>
      expect(screen.getByText('Not authenticated')).toBeInTheDocument(),
    );
  });
});
