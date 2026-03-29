export interface AdminUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin';
  avatarUrl?: string;
  is2FAEnabled?: boolean;
  createdAt?: string;
}

export interface AdminTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AdminLoginPayload {
  email: string;
  password: string;
  adminSecret?: string;
}

export interface AdminLoginResult {
  /** Direct success — tokens + user returned */
  tokens?: AdminTokens;
  user?: AdminUser;
  /** 2FA required — need to call verify endpoint */
  requires2FA?: boolean;
  userId?: string;
  /** 2FA setup required — show QR code first */
  requires2FASetup?: boolean;
  qrCode?: string;
  secret?: string;
}

export interface Admin2FAVerifyPayload {
  userId: string;
  code: string;
}

/** A managed user as returned by GET /admin/users */
export interface ManagedUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface AdminStats {
  users: {
    total: number;
    active: number;
    banned: number;
    deactivated: number;
    unverified: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  security: {
    failedLogins24h: number;
    lockedAccounts: number;
    suspiciousActivities: number;
  };
  sessions: {
    activeSessions: number;
    averageSessionsPerUser: number;
  };
  system: {
    uptime?: string;
    version?: string;
  };
}
