import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  ApiRequestError,
  authService,
  type AuthResult,
  type AuthTokens,
  type AuthUser,
  type LoginPayload,
  type RegisterPayload,
} from "../services/auth.service";
import { saveTokens, clearTokens } from "../utils/auth.utils";
import {
  startTokenRefreshTimer,
  stopTokenRefreshTimer,
} from "../utils/token-refresh.utils";

const AUTH_STORAGE_KEY = "apex_arenas_auth";

interface StoredSession {
  tokens: AuthTokens;
  user?: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (payload: LoginPayload) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<AuthResult>;
  loginWithGoogle: (
    idToken: string,
    role?: "player" | "organizer",
  ) => Promise<AuthResult>;
  linkGoogle: (idToken: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  setSession: (tokens: AuthTokens | null, user?: AuthUser | null) => void;
}

const mergeUserData = (
  previous: AuthUser | null | undefined,
  incoming: AuthUser | null | undefined,
): AuthUser | null => {
  if (!previous && !incoming) return null;
  if (!previous) return incoming ?? null;
  if (!incoming) return previous;

  return {
    ...previous,
    ...incoming,
    socialLinks:
      incoming.socialLinks && Object.keys(incoming.socialLinks).length > 0
        ? incoming.socialLinks
        : previous.socialLinks,
    gameProfiles:
      incoming.gameProfiles && incoming.gameProfiles.length > 0
        ? incoming.gameProfiles
        : previous.gameProfiles,
  };
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const toStorageValue = (session: StoredSession): string => {
  return JSON.stringify(session);
};

const fromStorageValue = (raw: string | null): StoredSession | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const record = parsed as Record<string, unknown>;
    const tokensRecord = record.tokens as Record<string, unknown> | undefined;
    const accessToken =
      typeof tokensRecord?.accessToken === "string"
        ? tokensRecord.accessToken.trim()
        : "";

    if (!accessToken) return null;

    const refreshTokenValue =
      typeof tokensRecord?.refreshToken === "string"
        ? tokensRecord.refreshToken.trim()
        : "";
    const refreshToken = refreshTokenValue || undefined;

    const userRecord =
      record.user &&
      typeof record.user === "object" &&
      !Array.isArray(record.user)
        ? (record.user as AuthUser)
        : undefined;

    return {
      tokens: {
        accessToken,
        refreshToken,
      },
      user: userRecord,
    };
  } catch {
    return null;
  }
};

const persistSession = (session: StoredSession | null): void => {
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    clearTokens();
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, toStorageValue(session));
  saveTokens({
    accessToken: session.tokens.accessToken,
    refreshToken: session.tokens.refreshToken,
  });
};

const readSession = (): StoredSession | null => {
  return fromStorageValue(localStorage.getItem(AUTH_STORAGE_KEY));
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Refs mirror state so callbacks have stable identities (no state in dep arrays)
  const tokensRef = useRef(tokens);
  const userRef = useRef(user);
  tokensRef.current = tokens;
  userRef.current = user;

  const setSession = useCallback(
    (nextTokens: AuthTokens | null, nextUser?: AuthUser | null) => {
      if (!nextTokens?.accessToken) {
        setTokens(null);
        setUser(null);
        persistSession(null);
        return;
      }

      const resolvedUser = nextUser ?? null;
      setTokens(nextTokens);
      setUser(resolvedUser);
      persistSession({
        tokens: nextTokens,
        user: resolvedUser ?? undefined,
      });
    },
    [],
  );

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const currentTokens = tokensRef.current;
    if (!currentTokens?.refreshToken && !currentTokens?.accessToken) {
      return null;
    }

    try {
      const result = await authService.refreshToken(
        currentTokens?.refreshToken,
      );
      const nextTokens = result.tokens;

      if (!nextTokens?.accessToken) {
        setSession(null, null);
        return null;
      }

      setSession(
        {
          accessToken: nextTokens.accessToken,
          refreshToken: nextTokens.refreshToken ?? currentTokens?.refreshToken,
        },
        mergeUserData(userRef.current, result.user),
      );

      return nextTokens.accessToken;
    } catch {
      setSession(null, null);
      return null;
    }
  }, [setSession]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const result = await authService.login(payload);
      if (result.tokens?.accessToken) {
        setSession(result.tokens, result.user ?? null);
      }
      return result;
    },
    [setSession],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    return authService.register(payload);
  }, []);

  const loginWithGoogle = useCallback(
    async (idToken: string, role?: "player" | "organizer") => {
      const result = await authService.googleAuth(idToken, role);
      if (result.tokens?.accessToken) {
        setSession(result.tokens, result.user ?? null);
      }
      return result;
    },
    [setSession],
  );

  const linkGoogle = useCallback(
    async (idToken: string, password: string) => {
      const result = await authService.googleLink(idToken, password);
      if (result.tokens?.accessToken) {
        setSession(result.tokens, result.user ?? null);
      }
      return result;
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    const accessToken = tokensRef.current?.accessToken;
    try {
      await authService.logout(accessToken);
    } finally {
      setSession(null, null);
    }
  }, [setSession]);

  // Bootstrap: validate stored session on mount — runs exactly once
  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const stored = readSession();

      if (!stored?.tokens.accessToken) {
        if (active) setIsInitializing(false);
        return;
      }

      // Hydrate state immediately so the UI shows the cached user while we validate
      setTokens(stored.tokens);
      setUser(stored.user ?? null);
      tokensRef.current = stored.tokens;
      userRef.current = stored.user ?? null;

      try {
        const validateResult = await authService.validateToken(
          stored.tokens.accessToken,
        );

        if (!active) return;

        if (validateResult.user || validateResult.tokens) {
          const freshTokens: AuthTokens = {
            accessToken:
              validateResult.tokens?.accessToken ?? stored.tokens.accessToken,
            refreshToken:
              validateResult.tokens?.refreshToken ?? stored.tokens.refreshToken,
          };
          const freshUser = mergeUserData(
            stored.user ?? null,
            validateResult.user,
          );

          setTokens(freshTokens);
          setUser(freshUser);
          persistSession({
            tokens: freshTokens,
            user: freshUser ?? undefined,
          });
        }
      } catch (error) {
        if (!active) return;

        const isAuthError =
          error instanceof ApiRequestError &&
          (error.status === 401 || error.status === 403);

        if (isAuthError && stored.tokens.refreshToken) {
          // Token expired — try refreshing directly (don't go through the
          // callback so we avoid any state-timing issues during init)
          try {
            const refreshResult = await authService.refreshToken(
              stored.tokens.refreshToken,
            );

            if (!active) return;

            if (refreshResult.tokens?.accessToken) {
              const freshTokens: AuthTokens = {
                accessToken: refreshResult.tokens.accessToken,
                refreshToken:
                  refreshResult.tokens.refreshToken ??
                  stored.tokens.refreshToken,
              };
              const freshUser = mergeUserData(
                stored.user ?? null,
                refreshResult.user,
              );

              setTokens(freshTokens);
              setUser(freshUser);
              persistSession({
                tokens: freshTokens,
                user: freshUser ?? undefined,
              });
            } else {
              setTokens(null);
              setUser(null);
              persistSession(null);
            }
          } catch {
            if (!active) return;
            setTokens(null);
            setUser(null);
            persistSession(null);
          }
        } else {
          setTokens(null);
          setUser(null);
          persistSession(null);
        }
      } finally {
        if (active) setIsInitializing(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  // Start / stop the background token-refresh timer based on auth state
  useEffect(() => {
    if (tokens?.accessToken) {
      startTokenRefreshTimer(refreshAccessToken);
    } else {
      stopTokenRefreshTimer();
    }
    return () => stopTokenRefreshTimer();
  }, [tokens?.accessToken, refreshAccessToken]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      tokens,
      isAuthenticated: Boolean(tokens?.accessToken),
      isInitializing,
      login,
      register,
      loginWithGoogle,
      linkGoogle,
      logout,
      refreshAccessToken,
      setSession,
    };
  }, [
    isInitializing,
    linkGoogle,
    login,
    loginWithGoogle,
    logout,
    refreshAccessToken,
    register,
    setSession,
    tokens,
    user,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
