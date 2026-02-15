import { AUTH_ENDPOINTS, REQUEST_TIMEOUT } from "../config/api.config";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonRecord = Record<string, JsonValue>;

const SESSION_HEADER = "Authorization";

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthUser {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  verified?: boolean;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface OtpVerifyPayload {
  email: string;
  otp: string;
}

export interface AuthResult {
  tokens?: AuthTokens;
  user?: AuthUser;
  message?: string;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const getRecord = (value: unknown): JsonRecord | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as JsonRecord;
};

const getString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim() ? value : undefined;
};

const getNested = (obj: JsonRecord | undefined, key: string): unknown => {
  if (!obj) return undefined;
  return obj[key];
};

const extractMessage = (payload: unknown): string | undefined => {
  const root = getRecord(payload);
  const directMessage = getString(root?.message);
  if (directMessage) return directMessage;

  const directError = getString(root?.error);
  if (directError) return directError;

  const error = getRecord(root?.error);
  const errorMessage = getString(error?.message);
  if (errorMessage) return errorMessage;

  const data = getRecord(root?.data);
  return getString(data?.message);
};

const extractErrorCode = (payload: unknown): string | undefined => {
  const root = getRecord(payload);
  const error = getRecord(root?.error);

  return (
    getString(error?.code) ??
    getString(root?.error_code) ??
    getString(root?.code)
  );
};

const isExplicitFailurePayload = (payload: unknown): boolean => {
  const root = getRecord(payload);
  return root?.success === false;
};

const extractUser = (payload: unknown): AuthUser | undefined => {
  const root = getRecord(payload);
  const data = getRecord(root?.data);

  const source =
    getRecord(root?.user) ??
    getRecord(data?.user) ??
    (data ?? undefined);

  if (!source) return undefined;

  return {
    id: getString(source.id) ?? getString(source._id),
    name: getString(source.name),
    username: getString(source.username),
    email: getString(source.email),
    role: getString(source.role),
    verified:
      typeof source.verified === "boolean"
        ? source.verified
        : typeof source.isVerified === "boolean"
          ? source.isVerified
          : undefined,
  };
};

const extractTokens = (payload: unknown): AuthTokens | undefined => {
  const root = getRecord(payload);
  const data = getRecord(root?.data);
  const tokensContainer = getRecord(root?.tokens) ?? getRecord(data?.tokens) ?? data;

  const accessToken =
    getString(getNested(tokensContainer, "accessToken")) ??
    getString(getNested(tokensContainer, "access_token")) ??
    getString(root?.accessToken) ??
    getString(root?.token);

  if (!accessToken) return undefined;

  const refreshToken =
    getString(getNested(tokensContainer, "refreshToken")) ??
    getString(getNested(tokensContainer, "refresh_token")) ??
    getString(root?.refreshToken);

  return {
    accessToken,
    refreshToken,
  };
};

const normalizeAuthResult = (payload: unknown): AuthResult => {
  return {
    tokens: extractTokens(payload),
    user: extractUser(payload),
    message: extractMessage(payload),
  };
};

const request = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });

    const rawText = await response.text();
    const payload = rawText ? (JSON.parse(rawText) as unknown) : undefined;

    if (!response.ok || isExplicitFailurePayload(payload)) {
      throw new ApiRequestError(
        extractMessage(payload) ?? "Request failed.",
        response.status,
        extractErrorCode(payload),
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiRequestError("Request timed out.", 408, "REQUEST_TIMEOUT");
    }

    if (error instanceof SyntaxError) {
      throw new ApiRequestError("Invalid server response.", 500, "BAD_RESPONSE");
    }

    throw new ApiRequestError("Network error. Please try again.", 0, "NETWORK_ERROR");
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const withAuthHeader = (accessToken?: string): Record<string, string> => {
  if (!accessToken) return {};
  return { [SESSION_HEADER]: `Bearer ${accessToken}` };
};

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResult> {
    const response = await request<unknown>(AUTH_ENDPOINTS.REGISTER, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeAuthResult(response);
  },

  async login(payload: LoginPayload): Promise<AuthResult> {
    const identifier = payload.identifier.trim();
    const isEmail = identifier.includes("@");

    const response = await request<unknown>(AUTH_ENDPOINTS.LOGIN, {
      method: "POST",
      body: JSON.stringify({
        identifier,
        email: isEmail ? identifier : undefined,
        username: !isEmail ? identifier : undefined,
        password: payload.password,
      }),
    });
    return normalizeAuthResult(response);
  },

  async logout(accessToken?: string): Promise<void> {
    await request<unknown>(AUTH_ENDPOINTS.LOGOUT, {
      method: "POST",
      headers: withAuthHeader(accessToken),
    });
  },

  async verifyOtp(payload: OtpVerifyPayload): Promise<AuthResult> {
    const response = await request<unknown>(AUTH_ENDPOINTS.OTP_VERIFY, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeAuthResult(response);
  },

  async resendOtp(email: string): Promise<AuthResult> {
    const response = await request<unknown>(AUTH_ENDPOINTS.OTP_RESEND, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return normalizeAuthResult(response);
  },

  async requestPasswordReset(email: string): Promise<AuthResult> {
    const response = await request<unknown>(AUTH_ENDPOINTS.PASSWORD_RESET, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return normalizeAuthResult(response);
  },

  async refreshToken(refreshToken?: string): Promise<AuthResult> {
    const response = await request<unknown>(AUTH_ENDPOINTS.TOKEN_REFRESH, {
      method: "POST",
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
    return normalizeAuthResult(response);
  },

  async validateToken(accessToken: string): Promise<AuthResult> {
    const response = await request<unknown>(AUTH_ENDPOINTS.TOKEN_VALIDATE, {
      method: "POST",
      headers: withAuthHeader(accessToken),
    });
    return normalizeAuthResult(response);
  },

  async getProfile(accessToken: string): Promise<AuthResult> {
    const response = await request<unknown>(AUTH_ENDPOINTS.PROFILE, {
      method: "GET",
      headers: withAuthHeader(accessToken),
    });
    return normalizeAuthResult(response);
  },
};
