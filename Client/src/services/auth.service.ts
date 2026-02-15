import {
  AUTH_ENDPOINTS,
  HTTP_METHODS,
  type ApiResponse,
} from "../config/api.config";
import { requestJson } from "../lib/http";

export type RegisterPayload = {
  name: string;
  username: string;
  email: string;
  password: string;
  role: "player" | "organizer" | string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type VerifyOtpPayload = {
  email: string;
  otp: string;
};

export type ResendOtpPayload = {
  email: string;
};

export type GoogleAuthStartResponse = {
  url?: string;
  redirectUrl?: string;
};

export async function registerUser<T = any>(
  payload: RegisterPayload,
): Promise<ApiResponse<T>> {
  return requestJson<T>(AUTH_ENDPOINTS.REGISTER, {
    method: HTTP_METHODS.POST,
    body: payload,
  });
}

export async function loginUser<T = any>(
  payload: LoginPayload,
): Promise<ApiResponse<T>> {
  return requestJson<T>(AUTH_ENDPOINTS.LOGIN, {
    method: HTTP_METHODS.POST,
    body: payload,
  });
}

export async function verifyOtp<T = any>(
  payload: VerifyOtpPayload,
): Promise<ApiResponse<T>> {
  return requestJson<T>(AUTH_ENDPOINTS.OTP_VERIFY, {
    method: HTTP_METHODS.POST,
    body: payload,
  });
}

export async function resendOtp<T = any>(
  payload: ResendOtpPayload,
): Promise<ApiResponse<T>> {
  return requestJson<T>(AUTH_ENDPOINTS.OTP_RESEND, {
    method: HTTP_METHODS.POST,
    body: payload,
  });
}

// Starts OAuth using POST (backend should respond with a redirect URL).
export async function startGoogleAuth(
  payload?: { next?: string },
): Promise<ApiResponse<GoogleAuthStartResponse>> {
  return requestJson<GoogleAuthStartResponse>(AUTH_ENDPOINTS.GOOGLE, {
    method: HTTP_METHODS.POST,
    body: payload ?? undefined,
  });
}
