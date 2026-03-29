import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { adminAuthService, AdminApiError } from '../services/admin-auth.service';
import type { AdminUser, AdminTokens } from '../types/admin.types';

const ADMIN_STORAGE_KEY = 'apex_arenas_admin_auth';

interface StoredAdminSession {
  tokens: AdminTokens;
  user?: AdminUser;
}

interface AdminAuthContextValue {
  admin: AdminUser | null;
  tokens: AdminTokens | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setSession: (tokens: AdminTokens | null, user?: AdminUser | null) => void;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

const persistSession = (session: StoredAdminSession | null): void => {
  if (!session) {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
};

const readSession = (): StoredAdminSession | null => {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAdminSession;
    if (!parsed?.tokens?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const AdminAuthProvider = ({ children }: PropsWithChildren) => {
  const [tokens, setTokens] = useState<AdminTokens | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  const setSession = useCallback(
    (nextTokens: AdminTokens | null, nextUser?: AdminUser | null) => {
      if (!nextTokens?.accessToken) {
        setTokens(null);
        setAdmin(null);
        persistSession(null);
        return;
      }
      const resolvedUser = nextUser ?? null;
      setTokens(nextTokens);
      setAdmin(resolvedUser);
      persistSession({ tokens: nextTokens, user: resolvedUser ?? undefined });
    },
    [],
  );

  const logout = useCallback(async () => {
    const accessToken = tokensRef.current?.accessToken;
    try {
      await adminAuthService.logout(accessToken);
    } finally {
      setSession(null, null);
    }
  }, [setSession]);

  // Bootstrap: validate stored admin session on mount
  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const stored = readSession();

      if (!stored?.tokens.accessToken) {
        if (active) setIsInitializing(false);
        return;
      }

      // Hydrate immediately
      setTokens(stored.tokens);
      setAdmin(stored.user ?? null);
      tokensRef.current = stored.tokens;

      try {
        const result = await adminAuthService.validateToken(stored.tokens.accessToken);
        if (!active) return;

        if (result.user) {
          setAdmin(result.user);
          persistSession({ tokens: stored.tokens, user: result.user });
        }
      } catch (error) {
        if (!active) return;

        const isAuthError =
          error instanceof AdminApiError &&
          (error.status === 401 || error.status === 403);

        if (isAuthError && stored.tokens.refreshToken) {
          try {
            const refreshResult = await adminAuthService.refreshToken(stored.tokens.refreshToken);
            if (!active) return;

            if (refreshResult.tokens?.accessToken) {
              const freshTokens: AdminTokens = {
                accessToken: refreshResult.tokens.accessToken,
                refreshToken: refreshResult.tokens.refreshToken ?? stored.tokens.refreshToken,
              };
              setTokens(freshTokens);
              persistSession({ tokens: freshTokens, user: stored.user ?? undefined });
            } else {
              setSession(null, null);
            }
          } catch {
            if (active) setSession(null, null);
          }
        } else {
          setSession(null, null);
        }
      } finally {
        if (active) setIsInitializing(false);
      }
    };

    void bootstrap();
    return () => { active = false; };
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      admin,
      tokens,
      isAuthenticated: Boolean(tokens?.accessToken),
      isInitializing,
      setSession,
      logout,
    }),
    [admin, tokens, isInitializing, setSession, logout],
  );

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextValue => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within <AdminAuthProvider>');
  return ctx;
};
