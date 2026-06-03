# Apex Arenas — Client

Frontend for **Apex Arenas**, a Ghana-focused esports tournament platform. Built with React 19, TypeScript, and Vite. Supports two user roles — **player** and **organizer** — with role-gated dashboards, real-time notifications, tournament management, and a direct-pay financial system.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Routing Architecture](#routing-architecture)
- [Pages Reference](#pages-reference)
- [Authentication Flow](#authentication-flow)
- [State Management](#state-management)
- [API Layer](#api-layer)
- [Services Reference](#services-reference)
- [Key Components](#key-components)
- [Real-time Notifications](#real-time-notifications)
- [Financial System](#financial-system)
- [Styling](#styling)
- [TypeScript Conventions](#typescript-conventions)
- [Testing](#testing)

---

## Tech Stack

| Category | Package | Version |
|----------|---------|---------|
| UI Framework | React | 19.2.0 |
| Language | TypeScript | 5.9.3 |
| Build Tool | Vite | 7.2.4 |
| Routing | React Router | 7.12.0 |
| Styling | Tailwind CSS | 4.1.18 |
| Animation | Framer Motion | 12.34.0 |
| Icons | Lucide React | 0.562.0 |
| Toasts | React Toastify | 11.1.0 |
| Real-time | Socket.IO Client | 4.8.3 |
| Date Picker | React Day Picker | 9.14.0 |
| File Upload | React Dropzone | 15.0.0 |
| QR Code | React QR Code | 2.0.18 |
| Testing | Vitest + RTL + MSW | latest |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server with HMR
npm run dev

# Type-check + production build
npm run build

# Preview production build locally
npm run preview

# Lint
npm run lint

# Run tests
npm run test
```

> **API base URL** is hardcoded in `src/config/api.config.ts` pointing to `https://api-apexarenas.onrender.com`. There is no `.env` file — update `api.config.ts` directly to change environments.

---

## Project Structure

```
src/
├── components/                 # Reusable UI + layout components
│   ├── dashboard/              # Dashboard widgets (StatCard, CalendarWidget, etc.)
│   ├── join-tournament/        # Browse & register tournament components
│   ├── league/                 # League table, matchweek fixtures, match modals
│   ├── tournament-detail/      # Bracket, result submission, dispute modals
│   ├── ui/                     # Generic UI (FadeImage, DateTimePicker, etc.)
│   ├── DashboardLayout.tsx     # Authenticated shell: sidebar + header + outlet
│   ├── Sidebar.tsx             # Left nav with role-specific menu items + badges
│   ├── Navbar.tsx              # Public header
│   ├── Footer.tsx              # Site footer
│   ├── PageTransition.tsx      # Framer Motion page fade wrapper
│   ├── ProtectedRoute.tsx      # Auth gate — redirects to /login if unauthenticated
│   ├── RoleRoute.tsx           # Role gate — redirects to /auth if wrong role
│   └── modal.ts                # Imperative vanilla-JS modal utility
│
├── pages/
│   ├── public/                 # Pages accessible without login
│   └── auth/                   # Protected pages (require login)
│       ├── player/             # Player-only pages
│       └── organizer/          # Organizer-only pages
│
├── services/                   # API client layer (one file per domain)
├── lib/                        # React contexts + socket setup
│   ├── auth-context.tsx        # AuthProvider — session, tokens, user
│   ├── notification-context.tsx # NotificationProvider — list, unread, socket
│   └── socket.ts               # Socket.IO singleton factory
│
├── config/
│   └── api.config.ts           # All API endpoint strings + base URLs
│
├── utils/
│   ├── api.utils.ts            # Fetch wrapper with auth, cache, idempotency, retry
│   ├── auth.utils.ts           # Token read/write from localStorage
│   ├── token-refresh.utils.ts  # Background 60s token refresh timer
│   ├── dom.utils.ts            # Imperative DOM helpers (forms, errors)
│   ├── idempotency.utils.ts    # UUID idempotency key generation
│   └── toast.utils.ts          # Toast helper wrappers
│
├── types/
│   └── auth.types.ts           # User, AuthTokens, roles, verification types
│
├── test/                       # Vitest tests + MSW mocks
├── App.tsx                     # Full route tree
└── main.tsx                    # React root entry
```

---

## Routing Architecture

The app uses React Router v7 with two top-level layouts:

**Public layout** (`/`) — `Navbar` + `PageTransition` + `Footer`

**Authenticated layout** (`/auth`) — `ProtectedRoute` → `DashboardLayout` (sidebar + header)

Role restriction is applied per-group via `RoleRoute`:

```
/auth
├── (all authenticated users)
│   ├── /                   → Dashboard
│   ├── /leaderboard        → Leaderboard
│   ├── /notifications      → Notifications
│   ├── /prizes             → Prizes (winnings + refunds tabs)
│   ├── /contact-us         → Contact form
│   └── /transactions       → Transaction history
│
├── (player routes — RoleRoute role="player")
│   ├── /player/profile
│   ├── /player/join-tournament
│   ├── /tournaments/:id    → Tournament detail + bracket
│   └── /become-organizer
│
└── (organizer routes — RoleRoute role="organizer")
    ├── /organizer/profile
    ├── /organizer/create-tournament
    ├── /organizer/tournaments
    ├── /organizer/tournaments/:id         → Tournament management
    ├── /organizer/tournaments/:id/edit
    ├── /organizer/analytics
    ├── /organizer/finance                 → Payouts + Earnings tabs
    └── /organizer/disputes
```

> Organizers also have access to shared routes (Prizes, Leaderboard, etc.) since they can participate as players.

---

## Pages Reference

### Public Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page — CTA, platform features |
| `/login` | Email + password login |
| `/signup` | Registration — choose player or organizer role |
| `/forgot` | Password reset request |
| `/verify-otp` | Email OTP verification |
| `/tournaments` | Public tournament listing (filterable) |
| `/leaderboard` | Public player leaderboard |
| `/about` | About the platform |
| `/careers` | Job listings |
| `/support` | Support hub |
| `/support/help-center` | FAQ / knowledge base |
| `/support/rules` | Tournament rules |
| `/support/dispute-resolution` | Dispute process documentation |
| `/support/contact-us` | Contact form |
| `/privacy-policy` | Privacy policy |
| `/terms-of-service` | Terms of service |

### Authenticated Pages (All Roles)

| Route | Purpose |
|-------|---------|
| `/auth` | Dashboard — role-specific widgets and stats |
| `/auth/leaderboard` | Ranked leaderboard |
| `/auth/notifications` | Notifications list, mark read/delete |
| `/auth/prizes` | **Tabbed:** Tournament Winnings \| Entry Fee Refunds |
| `/auth/transactions` | Full transaction history |
| `/auth/contact-us` | Authenticated support form |

### Player-Only Pages

| Route | Purpose |
|-------|---------|
| `/auth/player/profile` | Edit profile, game IDs, socials, security |
| `/auth/player/join-tournament` | Browse and register for tournaments |
| `/auth/tournaments/:id` | Tournament detail — bracket, results, disputes |
| `/auth/become-organizer` | Submit organizer verification request |

### Organizer-Only Pages

| Route | Purpose |
|-------|---------|
| `/auth/organizer/profile` | Business profile, bank details |
| `/auth/organizer/create-tournament` | Create new tournament (multi-step form) |
| `/auth/organizer/tournaments/:id/edit` | Edit existing tournament |
| `/auth/organizer/tournaments` | All tournaments you've created |
| `/auth/organizer/tournaments/:id` | Manage tournament — check-ins, bracket, match results |
| `/auth/organizer/analytics` | Tournament performance analytics |
| `/auth/organizer/finance` | **Tabbed:** Payouts \| Earnings (fee share + refunds) |
| `/auth/organizer/disputes` | Review and resolve disputed match results |

---

## Authentication Flow

### Login

```
POST /api/v1/auth/login
  → { access_token, refresh_token, user }
  → Stored in localStorage under "apex_arenas_auth"
  → Token refresh timer starts (60s interval)
  → Redirect to /auth or ?next= return URL
```

### Session Bootstrap (on app mount)

```
1. Read stored session from localStorage
2. Hydrate state with cached user (instant UI)
3. GET /api/v1/auth/me to validate token
4. If 401: POST /api/v1/auth/token/refresh
   → Success: Update tokens + user, continue
   → Failure: Clear session, redirect to /login
5. Set isInitializing = false (unblock UI)
```

### Token Refresh (Background)

- Timer runs every 60 seconds via `token-refresh.utils.ts`
- If token expires in < 2 minutes: automatically refresh
- On failure: stop timer (user gets logged out on next 401)
- 30-minute inactivity auto-clears session on next bootstrap
- Inactivity tracked via `mousedown`, `keydown`, `touchstart`, `scroll`

### 401 Handling (API Level)

The fetch wrapper intercepts 401 responses, attempts one token refresh, retries the original request. If the refresh fails, the error propagates and `AuthContext` handles the logout.

### Google OAuth

- `POST /api/v1/auth/google` — Login or register with Google ID token
- `POST /api/v1/auth/google/link` — Link Google to an existing email account

---

## State Management

The app uses React Context for shared global state — no Redux or Zustand.

### `useAuth()` — `lib/auth-context.tsx`

Central authentication state. Available throughout the app via `useAuth()`.

**State:**
- `user: AuthUser | null` — Current user (firstName, lastName, role, avatarUrl, etc.)
- `tokens: AuthTokens | null` — Access + refresh tokens
- `isAuthenticated: boolean`
- `isInitializing: boolean` — True during bootstrap validation

**Methods:**
- `login(payload)` — Email + password
- `register(payload)` — New account
- `loginWithGoogle(idToken, role?)` — OAuth
- `linkGoogle(idToken, password)` — Link Google to existing account
- `logout()` — Clear session everywhere
- `refreshAccessToken()` — Manual refresh
- `setSession(tokens, user?)` — Programmatic session update

### `useNotifications()` — `lib/notification-context.tsx`

Notification list + real-time socket listener. Consumed by `Sidebar` (unread badge) and `DashboardLayout` (bell dropdown).

**State:**
- `notifications: NotificationItem[]` — Paginated list (20 per page)
- `unreadCount: number` — Badge count
- `isLoading: boolean`
- `hasMore: boolean`

**Methods:**
- `fetchMore()` — Load next page (appends to list)
- `refresh()` — Reload from page 1
- `markRead(id)` — Mark single read (decrements `unreadCount`)
- `markAllRead()` — Clear all unread (sets `unreadCount` to 0)
- `deleteNotification(id)` — Remove from list

---

## API Layer

### Fetch Wrapper — `utils/api.utils.ts`

All HTTP requests go through `apiFetch` (or the convenience wrappers). It handles:

| Feature | Detail |
|---------|--------|
| **Auth injection** | Adds `Authorization: Bearer {token}` automatically |
| **GET caching** | 100ms TTL deduplicates rapid identical GET calls |
| **Idempotency** | `X-Idempotency-Key` UUID on all mutations (POST/PUT/PATCH/DELETE) |
| **401 retry** | Refreshes token once, retries original request |
| **Response shape** | Normalizes all responses to `{ success: boolean, data?, error? }` |

**Convenience methods:**
```typescript
apiGet<T>(url, options?)
apiPost<T>(url, body, options?)
apiPut<T>(url, body, options?)
apiPatch<T>(url, body, options?)
apiDelete<T>(url, body?, options?)
```

**Options:**
```typescript
{
  skipAuth?: boolean        // Don't inject Bearer token
  skipIdempotency?: boolean // Don't add idempotency key
  skipCache?: boolean       // Bypass 100ms GET cache
  // ...standard RequestInit
}
```

### Response Type

```typescript
type ApiResponse<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: { code: string; message: string } }
```

### Error Handling in Services

Services use `assertSuccess<T>()` — a type guard that throws `ApiRequestError` on failure, narrowing the type to the success branch:

```typescript
const res = await apiPost(AUTH_ENDPOINTS.LOGIN, payload, { skipAuth: true });
assertSuccess<LoginData>(res); // throws ApiRequestError if !success
const { access_token } = res.data; // safe, TypeScript knows this is success
```

Pages/components catch `ApiRequestError` and show `toast.error(err.message)`.

### API Endpoints — `config/api.config.ts`

All endpoint strings are centralized here. Base URL: `https://api-apexarenas.onrender.com/api/v1`

Endpoint groups: `AUTH_ENDPOINTS`, `TOURNAMENT_ENDPOINTS`, `FINANCE_ENDPOINTS`, `SUPPORT_ENDPOINTS`, `NOTIFICATION_ENDPOINTS`

---

## Services Reference

### `auth.service.ts`
Login, register, profile, sessions, password, Google OAuth, organizer verification.

Key methods: `login`, `register`, `logout`, `refreshToken`, `validateToken`, `updateProfile`, `changePassword`, `getSessions`, `revokeSession`, `requestOrganizerVerification`, `googleAuth`, `googleLink`

### `tournament.service.ts`
Tournament CRUD, registration, bracket generation, match results, disputes, league fixtures, winnings, refunds.

Key methods: `getTournaments`, `createTournament`, `updateTournament`, `publishTournament`, `registerForTournament`, `getBracket`, `generateBracket`, `submitMatchResult`, `confirmMatchResult`, `disputeMatch`, `getLeagueTable`, `getMatchweeks`, `getWinnings`, `claimWinning`, `getRefunds`, `claimRefund`

### `organizer.service.ts`
Organizer-only tournament and match management (check-in, score entry, dispute resolution).

Key methods: `getOrganizerTournaments`, `bulkCheckIn`, `forceCheckIn`, `startMatch`, `submitScore`, `getDisputedMatches`, `resolveDispute`, `getMyDisputes`

### `notification.service.ts`
Notification REST API (Socket.IO handles push in `notification-context.tsx`).

Key methods: `getNotifications`, `getUnreadCount`, `markRead`, `markAllRead`, `deleteNotification`

### `dashboard.service.ts`
Aggregated data for the dashboard page (player stats, organizer stats, recent activity).

### `team.service.ts`
Team creation, membership, invitations, leave.

### `media-upload.service.ts`
Multipart file upload for tournament banners and profile images.

### `support.service.ts`
Contact form submission.

---

## Key Components

### Layout

| Component | Purpose |
|-----------|---------|
| `DashboardLayout.tsx` | Authenticated shell — sidebar, top header with notification bell dropdown, page outlet |
| `ProtectedRoute.tsx` | Redirects to `/login?next={path}` if not authenticated |
| `RoleRoute.tsx` | Redirects to `/auth` if authenticated user has wrong role |
| `Sidebar.tsx` | Left navigation with role-specific items, unread notification badge, dispute badge |
| `PageTransition.tsx` | Framer Motion page fade-in on route change |

### Tournament

| Component | Purpose |
|-----------|---------|
| `join-tournament/TournamentCard.tsx` | Browse card — game, prize pool, player count, format |
| `join-tournament/RegisterModal.tsx` | Registration modal — in-game ID input, team selection |
| `tournament-detail/BracketView.tsx` | Single/double elimination bracket renderer |
| `tournament-detail/SubmitResultModal.tsx` | Submit match score + screenshot proof |
| `tournament-detail/DisputeResultModal.tsx` | Open dispute with reason |

### League

| Component | Purpose |
|-----------|---------|
| `league/LeagueTable.tsx` | Standings table (position, W-D-L, GD, points, form) |
| `league/MatchweekFixtures.tsx` | Fixtures per matchweek with scores |
| `league/MatchActionModal.tsx` | Player: submit score, report result |
| `league/OrganizerMatchModal.tsx` | Organizer: start match, end match, lock results |

### Dashboard Widgets

| Component | Purpose |
|-----------|---------|
| `dashboard/StatCard.tsx` | KPI card — wins, prize total, tournament count |
| `dashboard/TournamentCard.tsx` | Joined tournament summary with next match |
| `dashboard/OrganizerTournamentCard.tsx` | Organizer view — registrant count, status |
| `dashboard/CalendarWidget.tsx` | Calendar showing upcoming tournament dates |

### Forms & Upload

| Component | Purpose |
|-----------|---------|
| `ImageUploadDropzone.tsx` | Drag-and-drop image uploader for tournaments/profiles |
| `DocumentDropzoneField.tsx` | ID and business document upload for organizer verification |
| `DateTimePicker.tsx` | Custom date + time picker (registration deadlines, start times) |

### Modal System

`components/modal.ts` — A vanilla-JS imperative modal utility (not a React component). Used for one-off confirmations and simple dialogs without React overhead.

```typescript
import { showModal, closeModal } from './components/modal';

const overlay = showModal({
  title: 'Confirm withdrawal',
  content: 'Are you sure you want to withdraw from this tournament?',
  showCloseButton: true,
});
closeModal(overlay);
```

---

## Real-time Notifications

Notifications use a dual approach: **Socket.IO** for push delivery, **REST API** for history.

**Socket connection** — `lib/socket.ts` creates a singleton `io` connection to the `/community` namespace, authenticated with the user's access token.

**Event:** `notification:new` — Server pushes a new notification object; the context prepends it to the list, increments `unreadCount`, and shows a toast.

**Notification bell dropdown** (in `DashboardLayout`) shows the 6 most recent notifications with:
- Left color bar (bright when unread, 20% opacity when read)
- Icon with color-coded background
- Title + unread dot indicator
- Relative timestamp
- Click-outside to close
- "Mark all read" and "View all" actions

**Notification colors** are inferred from the notification type string. A static `TYPE_META` map covers known types; an `inferBarFromType` keyword fallback covers dynamic backend type strings (e.g. `tournament_published`, `escrow_deposit_confirmed`).

---

## Financial System

Apex Arenas uses a **direct-pay** model — no internal wallet.

### Player Flow (Prizes Page — `/auth/prizes`)

**Tournament Winnings tab:**
- Lists prize allocations with status: `allocated` → `pending_claim` → `claimed` → `paid`
- Player submits MoMo (Mobile Money) account details to claim
- Admin reviews and triggers actual transfer

**Entry Fee Refunds tab:**
- Lists entry fee refunds for cancelled/incomplete tournaments
- Same claim flow as winnings

### Organizer Flow (Finance Page — `/auth/organizer/finance`)

**Payouts tab:**
- Request withdrawal of available balance
- Provide amount, MoMo network, account number, name
- View payout history with status and cancellation option

**Earnings tab (2-column):**
- **Entry Fee Share** — Organizer's cut of tournament entry fees (gross → 10% platform fee → net)
- **Prize Pool Refund** — Organizer-contributed prize pool returned on cancellation
- Each column shows a record list with claim modal and fee breakdown table

---

## Styling

- **Framework:** Tailwind CSS v4 (Vite plugin, JIT)
- **Theme:** Dark only — `bg-slate-950` base, `bg-slate-900` section backgrounds
- **Accents:** Cyan (`cyan-400/500`) + Indigo (`indigo-400/500`) for player UI; Orange (`orange-400/500`) + Amber for organizer UI
- **Fonts:**
  - `font-display` → Rajdhani (headings, stats, numbers)
  - Body → Space Grotesk (paragraphs, UI labels)
- **Animations:** Framer Motion for page transitions and modal entrances; Tailwind utilities for micro-interactions
- **Motion preference:** Animations respect `prefers-reduced-motion`
- **Responsive:** Mobile-first; sidebar collapses to drawer on `< md`; stats toggle behind button on mobile

---

## TypeScript Conventions

**Strict mode** is enabled (`tsconfig.app.json`):
```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

**snake_case ↔ camelCase mapping** — Backend returns `snake_case`; all services map to `camelCase` for frontend use and back to `snake_case` on outgoing requests.

**`assertSuccess<T>()`** — Type guard used in every service method. Throws `ApiRequestError` if the response is a failure, otherwise narrows the type to the success branch so `response.data` is safe to access without casting.

**`ApiRequestError`** — Custom error class with `.message`, `.status` (HTTP), and `.code` (backend error code). Services throw it; components catch it for toast display.

---

## Testing

**Framework:** Vitest + React Testing Library + MSW (Mock Service Worker)

```bash
npm run test           # Run all tests
npm run test:coverage  # Coverage report
```

**Test files:**
- `test/lib/auth-context.test.tsx` — Bootstrap, logout, token refresh
- `test/services/dispute.test.ts` — Dispute API calls
- `test/utils/api.utils.test.ts` — 401 retry, caching, idempotency
- `test/components/ProtectedRoute.test.tsx` — Route guarding

**Mocks:**
- `test/mocks/server.ts` — MSW server setup
- `test/mocks/handlers.ts` — API endpoint stubs for auth, tournaments, notifications
