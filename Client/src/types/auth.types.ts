/**
 * Authentication related TypeScript types
 *
 * Field names use camelCase in the frontend. The auth service maps
 * from the backend's snake_case responses when needed.
 */

// User roles – player and organizer are the primary frontend roles (admin omitted)
export type UserRole = 'player' | 'organizer';

export interface UserSocialLinks {
  discord?: string;
  twitter?: string;
  twitch?: string;
  youtube?: string;
}

export interface UserGameProfile {
  gameId: string;
  gameName?: string;
  inGameId: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'pro';
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  phone?: string;
  socialLinks?: UserSocialLinks;
  gameProfiles?: UserGameProfile[];
  organizerVerified?: boolean;
  isEmailVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;      // ISO date string
  updatedAt?: string;      // ISO date string
}

export type OrganizerVerificationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'needs_resubmission';

export interface OrganizerVerificationInfo {
  status: OrganizerVerificationStatus;
  requestId?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReasons?: string[];
  reviewNotes?: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  bio?: string;
  country?: string;
  phone?: string;
  avatarUrl?: string;
  discord?: string;
  twitter?: string;
  twitch?: string;
  youtube?: string;
  gameProfiles?: { gameId: string; inGameId: string; skillLevel?: string }[];
}

export interface OrganizerVerificationPayload {
  businessName: string;
  businessType: string;
  registrationNumber?: string;
  taxId?: string;
  contactPerson?: string;
  address?: string;
  idFrontUrl: string;
  idBackUrl: string;
  selfieWithIdUrl: string;
  businessRegistrationUrl?: string;
}

/** Helper to get a display name from a User */
export const getDisplayName = (user: User): string => {
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full || user.username;
};

// ----------------------------------------------------------------------
// Login
// ----------------------------------------------------------------------
export interface LoginRequest {
  email: string;  // backend only supports email-based login
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ----------------------------------------------------------------------
// Registration
// ----------------------------------------------------------------------
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  role: 'player' | 'organizer';   // frontend cannot register as admin
}

export interface RegisterResponse {
  user: User;
  message: string;
}

// ----------------------------------------------------------------------
// Email verification
// ----------------------------------------------------------------------
export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

// ----------------------------------------------------------------------
// Resend verification OTP
// ----------------------------------------------------------------------
export interface ResendVerificationRequest {
  email: string;
}

// ----------------------------------------------------------------------
// OTP types (if you ever use the generic OTP endpoints)
// ----------------------------------------------------------------------
export enum OTPType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  TWO_FACTOR = 'two_factor',
}

// ----------------------------------------------------------------------
// Availability checks (used during registration)
// ----------------------------------------------------------------------
export interface CheckEmailRequest {
  email: string;
}

export interface CheckEmailResponse {
  available: boolean;
  message?: string;
}

export interface CheckUsernameRequest {
  username: string;
}

export interface CheckUsernameResponse {
  available: boolean;
  message?: string;
}

// ----------------------------------------------------------------------
// Password management (optional – if you need them)
// ----------------------------------------------------------------------
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
