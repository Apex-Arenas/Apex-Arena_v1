const DEFAULT_AUTH_BASE_URL = "https://api-apexarenas.onrender.com/api/v1/auth";

// Optional Vite env override for local/dev:
// `VITE_AUTH_BASE_URL=http://localhost:4000/api/v1/auth`
export const API_BASE_URLS = (
  (import.meta.env.VITE_AUTH_BASE_URL as string | undefined) ??
  DEFAULT_AUTH_BASE_URL
).replace(/\/+$/, "");

export const AUTH_ENDPOINTS = {
    REGISTER: `${API_BASE_URLS}/register`,
    REGISTER_OTP: `${API_BASE_URLS}/resend-verification`,
    LOGIN: `${API_BASE_URLS}/login`,
    LOGOUT: `${API_BASE_URLS}/logout`,
    GOOGLE: `${API_BASE_URLS}/google`,
    OTP_GENERATE: `${API_BASE_URLS}/otp/generate`,
    OTP_VERIFY: `${API_BASE_URLS}/otp/verify`,
    OTP_RESEND: `${API_BASE_URLS}/otp/resend`,
    PASSWORD_CHANGE: `${API_BASE_URLS}/password/change`,
    PASSWORD_RESET: `${API_BASE_URLS}/password/reset`,
    PASSWORD_RESET_CONFIRM: `${API_BASE_URLS}/password/reset/confirm`,
    TOKEN_REFRESH: `${API_BASE_URLS}/token/refresh`,
    TOKEN_VALIDATE:`${API_BASE_URLS}/token/validate`,
    TOKEN_REVOKE_OTHERS: `${API_BASE_URLS}/sessions/revoke-others`,
    PROFILE: `${API_BASE_URLS}/profile`,
} as const;

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;


export const REQUEST_TIMEOUT = 30000;

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

export const isApiError = (response: ApiResponse): response is ApiErrorResponse => {
  return !response.success;
};

export const isApiSuccess = <T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> => {
  return response.success === true;
};