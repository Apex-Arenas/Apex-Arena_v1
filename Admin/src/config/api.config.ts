export const GOOGLE_CLIENT_ID =
  '741961090257-2jlbfq9ovv99bvcqpu01m4cf04qm0en4.apps.googleusercontent.com';

export const API_BASE_URLS = {
  AUTH: "https://api-apexarenas.onrender.com/api/v1/auth",
  TOURNAMENT: "https://api-apexarenas.onrender.com/api/v1/tournament",
  FINANCE: "https://api-apexarenas.onrender.com/api/v1/finance",
  WEBHOOKS: "https://api-apexarenas.onrender.com/api/v1/webhooks",
} as const;

export const AUTH_ENDPOINTS = {
  // Registration & Email Verification
  REGISTER: `${API_BASE_URLS.AUTH}/register`,
  VERIFY_EMAIL: `${API_BASE_URLS.AUTH}/verify-email`,
  RESEND_VERIFICATION: `${API_BASE_URLS.AUTH}/resend-verification`,
  CHECK_EMAIL: `${API_BASE_URLS.AUTH}/check-email`,
  CHECK_USERNAME: `${API_BASE_URLS.AUTH}/check-username`,

  // Login & 2FA
  LOGIN: `${API_BASE_URLS.AUTH}/login`,
  LOGIN_2FA: `${API_BASE_URLS.AUTH}/login/2fa`,
  ADMIN_LOGIN: `${API_BASE_URLS.AUTH}/admin/login`,
  ADMIN_LOGIN_2FA: `${API_BASE_URLS.AUTH}/admin/login/2fa`,
  ADMIN_2FA_SETUP_VERIFY: `${API_BASE_URLS.AUTH}/admin/2fa/setup/verify`,

  // Google OAuth
  GOOGLE_AUTH: `${API_BASE_URLS.AUTH}/google`,
  GOOGLE_LINK: `${API_BASE_URLS.AUTH}/google/link`,

  // OTP Management
  OTP_GENERATE: `${API_BASE_URLS.AUTH}/otp/generate`,
  OTP_VERIFY: `${API_BASE_URLS.AUTH}/otp/verify`,
  OTP_RESEND: `${API_BASE_URLS.AUTH}/otp/resend`,
  OTP_CAN_REQUEST: `${API_BASE_URLS.AUTH}/otp/can-request/:type`, // + /:type
  OTP_ATTEMPTS: `${API_BASE_URLS.AUTH}/otp/attempts/:type`,       // + /:type

  // Password Management
  PASSWORD_CHANGE: `${API_BASE_URLS.AUTH}/password/change`,
  PASSWORD_RESET: `${API_BASE_URLS.AUTH}/password/reset`,
  PASSWORD_RESET_CONFIRM: `${API_BASE_URLS.AUTH}/password/reset/confirm`,
  PASSWORD_VALIDATE: `${API_BASE_URLS.AUTH}/password/validate`,
  ADMIN_PASSWORD_RESET: `${API_BASE_URLS.AUTH}/admin/password/reset`,
  ADMIN_PASSWORD_RESET_CONFIRM: `${API_BASE_URLS.AUTH}/admin/password/reset/confirm`,

  // Token & Session Management
  TOKEN_REFRESH: `${API_BASE_URLS.AUTH}/token/refresh`,
  TOKEN_VALIDATE: `${API_BASE_URLS.AUTH}/token/validate`,
  ADMIN_TOKEN_REFRESH: `${API_BASE_URLS.AUTH}/admin/token/refresh`,
  ADMIN_TOKEN_VALIDATE: `${API_BASE_URLS.AUTH}/admin/token/validate`,
  SESSIONS: `${API_BASE_URLS.AUTH}/sessions`,                // GET /sessions,
  SESSION_REVOKE_SPECIFIC: `${API_BASE_URLS.AUTH}/sessions`, //  delete sessions/:sessionId
  SESSIONS_REVOKE_OTHERS: `${API_BASE_URLS.AUTH}/sessions/revoke-others`,
  ADMIN_SESSIONS: `${API_BASE_URLS.AUTH}/admin/sessions`,    // GET /admin/sessions, DELETE /admin/sessions/:sessionId
  LOGOUT: `${API_BASE_URLS.AUTH}/logout`,
  LOGOUT_ALL: `${API_BASE_URLS.AUTH}/logout-all`,
  ADMIN_LOGOUT: `${API_BASE_URLS.AUTH}/admin/logout`,
  ADMIN_LOGOUT_ALL: `${API_BASE_URLS.AUTH}/admin/logout-all`,
  ADMIN_SESSION_SPECIFIC: `${API_BASE_URLS.AUTH}/admin/sessions`, // Deleting specific admin sesiion /:sessionId
  // User Profile & Account
  PROFILE: `${API_BASE_URLS.AUTH}/user/profile`,
  UPDATE_PROFILE: `${API_BASE_URLS.AUTH}/user/profile`,      // PUT
  ADMIN_MEDIA_UPLOAD: `${API_BASE_URLS.AUTH}/admin/media/upload`,
  DEACTIVATE_ACCOUNT: `${API_BASE_URLS.AUTH}/user/deactivate`,
  ORGANIZER_VERIFICATION_REQUEST: `${API_BASE_URLS.AUTH}/user/request-organizer-verification`,
  ORGANIZER_VERIFICATION_STATUS: `${API_BASE_URLS.AUTH}/user/verification-status`,
  ADD_PASSWORD: `${API_BASE_URLS.AUTH}/user/add-password`,
  AUTH_METHODS: `${API_BASE_URLS.AUTH}/user/auth-methods`,

  // Admin (Super Admin) Routes
  ADMIN_UPDATE_PROFILE: `${API_BASE_URLS.AUTH}/admin/profile`,
  ADMIN_PASSWORD_CHANGE: `${API_BASE_URLS.AUTH}/admin/password/change`,

  ADMIN_BOOTSTRAP: `${API_BASE_URLS.AUTH}/admin/bootstrap`,
  ADMIN_GET_USERS: `${API_BASE_URLS.AUTH}/admin/users`,          // + filters, /:userId, etc.
  ADMIN_GET_USER_DETAILS: `${API_BASE_URLS.AUTH}/admin/users`,  // +/:userId
  ADMIN_USER_BAN: `${API_BASE_URLS.AUTH}/admin/users`,       // + /:userId/ban
  ADMIN_USER_UNBAN: `${API_BASE_URLS.AUTH}/admin/users`,     // + /:userId/unban
  ADMIN_USER_DEACTIVATE: `${API_BASE_URLS.AUTH}/admin/users`,// + /:userId/deactivate
  ADMIN_USER_REACTIVATE: `${API_BASE_URLS.AUTH}/admin/users`,// + /:userId/reactivate
  ADMIN_USER_ROLE: `${API_BASE_URLS.AUTH}/admin/users`,      // + /:userId/role
  ADMIN_USER_VERIFY_ORGANIZER: `${API_BASE_URLS.AUTH}/admin/users`, // + /:userId/verify-organizer
  ADMIN_USER_FORCE_VERIFY_EMAIL: `${API_BASE_URLS.AUTH}/admin/users`, // + /:userId/verify-email
  ADMIN_USER_FORCE_LOGOUT: `${API_BASE_URLS.AUTH}/admin/users`, // + /:userId/force-logout
  ADMIN_USER_SESSIONS: `${API_BASE_URLS.AUTH}/admin/users`,   // + /:userId/sessions
  ADMIN_USER_SESSION_REVOKE: `${API_BASE_URLS.AUTH}/admin/users`, // + /:userId/sessions/:sessionId
  ADMIN_USER_UNLOCK: `${API_BASE_URLS.AUTH}/admin/users`,     // + /:userId/unlock
  ADMIN_USER_FORCE_PASSWORD_RESET: `${API_BASE_URLS.AUTH}/admin/users`, // + /:userId/force-password-reset
  ADMIN_VERIFICATIONS_DETAILS: `${API_BASE_URLS.AUTH}/admin/verifications`, // + /:requestId/
  ADMIN_VERIFICATIONS_MARK_UNDER_REVIEW: `${API_BASE_URLS.AUTH}/admin/verifications`, // +/:requestId/review-start
  ADMIN_APPROVE_OR_REJECT_VERIFICATIONS: `${API_BASE_URLS.AUTH}/admin/verifications`, // +/:requestId/review,
  ADMIN_SEARCH_AUDIT_LOGS: `${API_BASE_URLS.AUTH}/admin/audit`,
  ADMIN_USER_AUDIT_TRAIL: `${API_BASE_URLS.AUTH}/admin/users`, // +/:userId/audit
  ADMIN_SYSTEM_STATS: `${API_BASE_URLS.AUTH}/admin/stats`,
  ADMIN_SECURITY_SUSPICIOUS: `${API_BASE_URLS.AUTH}/admin/security/suspicious`,
  
  // Auth Status
  ME: `${API_BASE_URLS.AUTH}/me`,
} as const;

export const TOURNAMENT_ENDPOINTS = {
  // Tournaments
  TOURNAMENTS: `${API_BASE_URLS.TOURNAMENT}/tournaments`,                 // GET, POST
  TOURNAMENT_DETAIL: `${API_BASE_URLS.TOURNAMENT}/tournaments`,           // + /:tournamentId (GET, PATCH, DELETE)
  TOURNAMENT_PUBLISH: `${API_BASE_URLS.TOURNAMENT}/tournaments`,          // + /:tournamentId/publish
  TOURNAMENT_CANCEL: `${API_BASE_URLS.TOURNAMENT}/tournaments`,           // + /:tournamentId/cancel
  TOURNAMENT_CAPACITY: `${API_BASE_URLS.TOURNAMENT}/tournaments`,         // + /:tournamentId/capacity

  // Registration
  REGISTER: `${API_BASE_URLS.TOURNAMENT}/tournaments`,                    // + /:tournamentId/register
  UNREGISTER: `${API_BASE_URLS.TOURNAMENT}/tournaments`,                  // + /:tournamentId/unregister
  TOURNAMENT_REGISTRATIONS: `${API_BASE_URLS.TOURNAMENT}/tournaments`,    // + /:tournamentId/registrations
  MY_REGISTRATIONS: `${API_BASE_URLS.TOURNAMENT}/tournaments/my-registrations`,
  UPDATE_IN_GAME_ID: `${API_BASE_URLS.TOURNAMENT}/registrations`,         // + /:registrationId/in-game-id

  // Bracket
  BRACKET: `${API_BASE_URLS.TOURNAMENT}/tournaments`,                     // GET + /:tournamentId/bracket | POST for generate /:tournamentId/bracket/generate
  BRACKET_CURRENT_ROUND: `${API_BASE_URLS.TOURNAMENT}/tournaments`,       // + /:tournamentId/bracket/current-round

  // Check-in
  CHECK_IN: `${API_BASE_URLS.TOURNAMENT}/tournaments`,                    // + /:tournamentId/check-in
  CHECK_IN_STATUS: `${API_BASE_URLS.TOURNAMENT}/tournaments`,             // + /:tournamentId/check-in/status
  CHECKED_IN_PLAYERS: `${API_BASE_URLS.TOURNAMENT}/tournaments`,          // + /:tournamentId/check-in/players

  // Results
  RESULTS: `${API_BASE_URLS.TOURNAMENT}/tournaments`,                     // + /:tournamentId/results (GET, POST)
  RESULTS_VERIFY: `${API_BASE_URLS.TOURNAMENT}/tournaments`,              // + /:tournamentId/results/verify

  // Matches
  MATCHES: `${API_BASE_URLS.TOURNAMENT}/matches`,                         // + /:matchId
  MATCH_RESULT: `${API_BASE_URLS.TOURNAMENT}/matches`,                    // + /:matchId/result
  MATCH_CONFIRM: `${API_BASE_URLS.TOURNAMENT}/matches`,                   // + /:matchId/confirm
  MATCH_DISPUTE: `${API_BASE_URLS.TOURNAMENT}/matches`,                   // + /:matchId/dispute
  MATCH_DISPUTE_RESOLVE: `${API_BASE_URLS.TOURNAMENT}/matches`,           // + /:matchId/dispute/resolve
  MATCH_ADMIN_OVERRIDE: `${API_BASE_URLS.TOURNAMENT}/matches/admin`,      // + /matches/:matchId/override
  MATCH_ADMIN_DISPUTES: `${API_BASE_URLS.TOURNAMENT}/matches/admin/disputes`, // GET list of disputed matches
  MATCH_START: `${API_BASE_URLS.TOURNAMENT}/matches`,                     // + /:matchId/start
  MATCH_READY: `${API_BASE_URLS.TOURNAMENT}/matches`,                     // + /:matchId/ready
  MATCH_FORFEIT: `${API_BASE_URLS.TOURNAMENT}/matches`,                   // + /:matchId/forfeit
  MATCH_CANCEL: `${API_BASE_URLS.TOURNAMENT}/matches`,                    // + /:matchId/cancel

  // Match Sessions
  MATCH_SESSION: `${API_BASE_URLS.TOURNAMENT}/matches`,                   // + /:matchId/session
  MATCH_SESSION_MESSAGES: `${API_BASE_URLS.TOURNAMENT}/matches`,          // + /:matchId/session/messages
  MATCH_SESSION_EVIDENCE: `${API_BASE_URLS.TOURNAMENT}/matches`,          // + /:matchId/session/evidence
  MATCH_SESSION_HISTORY: `${API_BASE_URLS.TOURNAMENT}/matches`,           // + /:matchId/session/history
  MATCH_SESSION_ARCHIVE: `${API_BASE_URLS.TOURNAMENT}/matches`,           // + /:matchId/session/archive

  // Teams
  TEAMS: `${API_BASE_URLS.TOURNAMENT}/teams`,                             // GET, POST
  TEAM_DETAIL: `${API_BASE_URLS.TOURNAMENT}/teams`,                       // + /:teamId (GET, PATCH, DELETE)
  TEAM_INVITE: `${API_BASE_URLS.TOURNAMENT}/teams`,                       // + /:teamId/invite
  TEAM_INVITE_RESPOND: `${API_BASE_URLS.TOURNAMENT}/teams`,               // + /:teamId/invite/respond
  TEAM_JOIN_REQUEST: `${API_BASE_URLS.TOURNAMENT}/teams`,                 // + /:teamId/join-request
  TEAM_JOIN_REQUEST_RESPOND: `${API_BASE_URLS.TOURNAMENT}/teams`,         // + /:teamId/join-request/respond
  TEAM_MEMBER_REMOVE: `${API_BASE_URLS.TOURNAMENT}/teams`,                // + /:teamId/members/:userId
  TEAM_LEAVE: `${API_BASE_URLS.TOURNAMENT}/teams`,                        // + /:teamId/leave

  // Team Recruitment
  RECRUITMENT_POSTS: `${API_BASE_URLS.TOURNAMENT}/team-recruitment`,      // GET, POST for a team (use /teams/:teamId/recruitment)
  RECRUITMENT_POST_DETAIL: `${API_BASE_URLS.TOURNAMENT}/recruitment`,     // + /:postId (GET, PATCH, DELETE)
  RECRUITMENT_APPLY: `${API_BASE_URLS.TOURNAMENT}/recruitment`,           // + /:postId/apply
  RECRUITMENT_APPLICATIONS: `${API_BASE_URLS.TOURNAMENT}/recruitment`,    // + /:postId/applications
  RECRUITMENT_APPLICATION_RESPOND: `${API_BASE_URLS.TOURNAMENT}/recruitment`, // + /:postId/applications/:applicationId/respond

  // Games
  GAMES_LIST: `${API_BASE_URLS.TOURNAMENT}/games`,                         // GET GAMES
  GAME_CREATE: `${API_BASE_URLS.TOURNAMENT}/games`,                        // GET, POST (admin)
  GAME_DETAIL: `${API_BASE_URLS.TOURNAMENT}/games`,                       // + /:gameId (GET, PATCH, DELETE)
  GAME_TOGGLE_ACTIVE: `${API_BASE_URLS.TOURNAMENT}/games`,                // + /:gameId/toggle-active
  GAME_UPDATE_STATS: `${API_BASE_URLS.TOURNAMENT}/games`,                 // + /:gameId/stats

  // Game Requests
  GAME_REQUESTS: `${API_BASE_URLS.TOURNAMENT}/game-requests`,             // GET, POST
  GAME_REQUEST_DETAIL: `${API_BASE_URLS.TOURNAMENT}/game-requests`,       // + /:requestId
  GAME_REQUEST_UPVOTE: `${API_BASE_URLS.TOURNAMENT}/game-requests`,       // + /:requestId/upvote
  GAME_REQUEST_ADMIN_REVIEW: `${API_BASE_URLS.TOURNAMENT}/game-requests/admin`, // + /:requestId/review
  GAME_REQUEST_ADMIN_MARK_DUPLICATE: `${API_BASE_URLS.TOURNAMENT}/game-requests/admin`, // + /:requestId/mark-duplicate

  // Scheduler (Admin)
  SCHEDULER_STATUS: `${API_BASE_URLS.TOURNAMENT}/scheduler/status`,
  SCHEDULER_AUTO_LOCK: `${API_BASE_URLS.TOURNAMENT}/scheduler/auto-lock`,
  SCHEDULER_AUTO_START: `${API_BASE_URLS.TOURNAMENT}/scheduler/auto-start`,
  SCHEDULER_CHECK_IN_REMINDERS: `${API_BASE_URLS.TOURNAMENT}/scheduler/check-in-reminders`,
  SCHEDULER_DISQUALIFY_NO_SHOWS: `${API_BASE_URLS.TOURNAMENT}/scheduler/disqualify-no-shows`,
  SCHEDULER_AUTO_FORFEIT: `${API_BASE_URLS.TOURNAMENT}/scheduler/auto-forfeit`,
  SCHEDULER_MATCH_READY_CHECKS: `${API_BASE_URLS.TOURNAMENT}/scheduler/match-ready-checks`,

  // Validation
  VALIDATION_CAN_REGISTER: `${API_BASE_URLS.TOURNAMENT}/validation/tournaments`, // + /:tournamentId/can-register
  VALIDATION_CAN_CANCEL: `${API_BASE_URLS.TOURNAMENT}/validation/tournaments`,   // + /:tournamentId/can-cancel
  VALIDATION_CAN_GENERATE_BRACKET: `${API_BASE_URLS.TOURNAMENT}/validation/tournaments`, // + /:tournamentId/can-generate-bracket
  VALIDATION_PRIZE_DISTRIBUTION: `${API_BASE_URLS.TOURNAMENT}/validation/validate/prize-distribution`,
  VALIDATION_SCHEDULE: `${API_BASE_URLS.TOURNAMENT}/validation/validate/schedule`,

  // Check-in Admin (Organizer)
  ADMIN_CHECK_IN_BULK: `${API_BASE_URLS.TOURNAMENT}/admin/checkin/tournaments`, // + /:tournamentId/check-in/bulk
  ADMIN_CHECK_IN_FORCE: `${API_BASE_URLS.TOURNAMENT}/admin/checkin/tournaments`, // + /:tournamentId/check-in/force/:userId
  ADMIN_CHECK_IN_UNDO: `${API_BASE_URLS.TOURNAMENT}/admin/checkin/tournaments`, // + /:tournamentId/check-in/undo/:userId

  // Admin Tournament Management
  ADMIN_TOURNAMENTS: `${API_BASE_URLS.TOURNAMENT}/admin/tournaments`, // GET (list), DELETE + /:tournamentId
} as const;


export const FINANCE_ENDPOINTS = {

  //  Wallet 
  WALLET: `${API_BASE_URLS.FINANCE}/wallet`,                        // GET
  DEPOSIT: `${API_BASE_URLS.FINANCE}/deposit`,                      // POST
  DEPOSIT_VERIFY: `${API_BASE_URLS.FINANCE}/deposit/verify`,        // GET — TheTeller redirect callback (no JWT)
  TRANSACTIONS: `${API_BASE_URLS.FINANCE}/transactions`,            // GET

  //  Escrow (User) 
  ESCROW_DEPOSIT: `${API_BASE_URLS.FINANCE}/escrow/deposit`,        // POST — organizer records prize pool deposit
  ESCROW_STATUS: `${API_BASE_URLS.FINANCE}/escrow`,                 // + /:tournamentId (GET)
  ESCROW_SUBMIT_WINNERS: `${API_BASE_URLS.FINANCE}/escrow`,         // + /:tournamentId/winners (POST)

  // Escrow (Admin) 
  ADMIN_ESCROW_PROCESSOR_RUN: `${API_BASE_URLS.FINANCE}/admin/escrow/processor/run`, // POST — manually trigger escrow processor
  ADMIN_ESCROW_STATUS: `${API_BASE_URLS.FINANCE}/admin/escrow`,     // + /:tournamentId (GET)
  ADMIN_ESCROW_CANCEL: `${API_BASE_URLS.FINANCE}/admin/escrow`,     // + /:tournamentId/cancel (POST)

  //  Payouts (User)
  PAYOUT_REQUEST: `${API_BASE_URLS.FINANCE}/payouts/request`,       // POST — submit withdrawal request
  PAYOUT_MY_REQUESTS: `${API_BASE_URLS.FINANCE}/payouts/my-requests`, // GET — own requests
  PAYOUT_DETAIL: `${API_BASE_URLS.FINANCE}/payouts`,                // + /:id (GET, DELETE)

  // Payouts (Admin) 
  ADMIN_PAYOUTS_PENDING: `${API_BASE_URLS.FINANCE}/admin/payouts/pending`, // GET — all pending requests
  ADMIN_PAYOUT_DETAIL: `${API_BASE_URLS.FINANCE}/admin/payouts`,    // + /:id (GET)
  ADMIN_PAYOUT_APPROVE: `${API_BASE_URLS.FINANCE}/admin/payouts`,   // + /:id/approve (PATCH)
  ADMIN_PAYOUT_REJECT: `${API_BASE_URLS.FINANCE}/admin/payouts`,    // + /:id/reject (PATCH)

} as const;

export const WEBHOOK_ENDPOINTS = {
  PAYSTACK: `${API_BASE_URLS.WEBHOOKS}/paystack`,                   // POST — called by Paystack gateway
  FLUTTERWAVE: `${API_BASE_URLS.WEBHOOKS}/flutterwave`,             // POST — called by Flutterwave gateway
} as const;

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

export const REQUEST_TIMEOUT = 30000; // 30 seconds

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