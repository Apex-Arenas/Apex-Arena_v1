import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  setSession: (tokens: AuthTokens | null, user?: AuthUser | null) => void;
}

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

const saveSession = (session: StoredSession | null): void => {
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, toStorageValue(session));
};

const readSession = (): StoredSession | null => {
  return fromStorageValue(localStorage.getItem(AUTH_STORAGE_KEY));
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const setSession = useCallback(
    (nextTokens: AuthTokens | null, nextUser?: AuthUser | null) => {
      if (!nextTokens?.accessToken) {
        setTokens(null);
        setUser(null);
        saveSession(null);
        return;
      }

      const resolvedUser = nextUser ?? null;
      setTokens(nextTokens);
      setUser(resolvedUser);
      saveSession({
        tokens: nextTokens,
        user: resolvedUser ?? undefined,
      });
    },
    [],
  );

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

  const logout = useCallback(async () => {
    try {
      await authService.logout(tokens?.accessToken);
    } finally {
      setSession(null, null);
    }
  }, [setSession, tokens?.accessToken]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!tokens?.refreshToken && !tokens?.accessToken) {
      return null;
    }

    try {
      const result = await authService.refreshToken(tokens?.refreshToken);
      const nextTokens = result.tokens;

      if (!nextTokens?.accessToken) {
        setSession(null, null);
        return null;
      }

      setSession(
        {
          accessToken: nextTokens.accessToken,
          refreshToken: nextTokens.refreshToken ?? tokens?.refreshToken,
        },
        result.user ?? user,
      );

      return nextTokens.accessToken;
    } catch {
      setSession(null, null);
      return null;
    }
  }, [setSession, tokens?.accessToken, tokens?.refreshToken, user]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const stored = readSession();

      if (!stored?.tokens.accessToken) {
        if (active) setIsInitializing(false);
        return;
      }

      setTokens(stored.tokens);
      setUser(stored.user ?? null);

      try {
        const validateResult = await authService.validateToken(
          stored.tokens.accessToken,
        );

        if (!active) return;

        if (validateResult.user || validateResult.tokens) {
          setSession(
            {
              accessToken:
                validateResult.tokens?.accessToken ?? stored.tokens.accessToken,
              refreshToken:
                validateResult.tokens?.refreshToken ??
                stored.tokens.refreshToken,
            },
            validateResult.user ?? stored.user ?? null,
          );
        }
      } catch (error) {
        if (!active) return;

        if (
          error instanceof ApiRequestError &&
          (error.status === 401 || error.status === 403)
        ) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            setSession(null, null);
          }
        } else {
          setSession(null, null);
        }
      } finally {
        if (active) setIsInitializing(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [refreshAccessToken, setSession]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      tokens,
      isAuthenticated: Boolean(tokens?.accessToken),
      isInitializing,
      login,
      register,
      logout,
      refreshAccessToken,
      setSession,
    };
  }, [
    isInitializing,
    login,
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
