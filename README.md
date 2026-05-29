# Apex Arenas

> Esports tournament infrastructure for Ghana and West Africa — prize escrow, automated payouts, and competitive career tools built for the local ecosystem.

---

## What It Is

Apex Arenas is a platform that lets independent organizers run professional esports tournaments while players compete in a trusted environment with **guaranteed prize money secured via escrow**. The platform handles registration, payments, bracket/league management, dispute resolution, and automated prize distribution — organizers just run the events.

---

## Monorepo Structure

```
Apex-Arena_v1/
├── Client/                 # Player + Organizer web app (React 19 + Vite)
├── Admin/                  # Admin dashboard (React 19 + Vite, separate app)
└── Apex-Arenas-Server/
    └── server/             # REST API + WebSocket server (Node.js + TypeScript)
```

---

## Tech Stack

| Layer      | Technology                                                   |
|------------|--------------------------------------------------------------|
| Frontend   | React 19, React Router 7, Tailwind CSS v4, Framer Motion    |
| Admin UI   | React 19, Tailwind CSS v4, Lucide Icons                     |
| Backend    | Node.js, Express, TypeScript                                 |
| Database   | MongoDB                                                      |
| Payments   | Mobile Money — MTN, Vodafone, AirtelTigo (GHS)              |
| Real-Time  | WebSockets / Socket.io                                       |
| Hosting    | Render (frontend + backend)                                  |

---

## Platform Roles

**Players** — Browse and join tournaments, track career stats, receive and withdraw prize money.

**Organizers** — Create and manage tournaments, deposit prize escrow, handle registrations and brackets, declare winners.

**Admins** — Verify organizers, approve withdrawals, resolve disputes, run financial audits.

---

## Key Features

- **Prize Escrow** — Prize pool locked before a tournament goes live; players are guaranteed payment
- **Automated Payouts** — Winners paid automatically on tournament completion
- **Bracket & League Management** — Elimination brackets and full league fixtures with standings
- **Mobile Money Payments** — Native GHS support via MTN MoMo, Vodafone Cash, AirtelTigo
- **Dispute Resolution** — Built-in evidence submission and moderator resolution flow
- **Player Profiles** — Stats, tournament history, rankings, and check-in system
- **Organizer Analytics** — Fill rates, completion rates, revenue estimates per tournament

---

## Money Flow

```
Entry Fees (paid tournaments)
  └── 10%  Platform fee
  └── 90%  Organizer earnings

Prize Pool (escrow)
  └── 1%   Escrow service fee
  └── 99%  Locked until winner declaration → distributed automatically
```

---

## Tournament Lifecycle

`Draft` → `Awaiting Deposit` → `Open` → `In Progress` → `Completed` → *(prizes sent)*

Cancellations trigger automatic refunds.

---

## Local Development

### Prerequisites

- Node.js ≥ 18
- pnpm (server), npm (client + admin)

### Client (Player + Organizer UI)

```bash
cd Client
npm install
npm run dev       # http://localhost:5173
```

### Admin Dashboard

```bash
cd Admin
npm install
npm run dev       # http://localhost:5174
```

### Server

```bash
cd Apex-Arenas-Server/server
pnpm install
pnpm dev          # http://localhost:4000
```

### Available Scripts

| Location | Command           | Description                          |
|----------|-------------------|--------------------------------------|
| Client   | `npm run dev`     | Vite dev server with HMR             |
| Client   | `npm run build`   | TypeScript check + production build  |
| Client   | `npm run lint`    | ESLint                               |
| Admin    | `npm run dev`     | Vite dev server                      |
| Admin    | `npm run build`   | Production build                     |
| Server   | `pnpm dev`        | Nodemon + ts-node                    |
| Server   | `pnpm build`      | Compile TypeScript to `dist/`        |
| Server   | `pnpm start`      | Run compiled server                  |

---

## Deployment (Render)

### Client / Admin — Static Site

| Setting           | Value                                  |
|-------------------|----------------------------------------|
| Root directory    | `Client` or `Admin`                    |
| Build command     | `npm install && npm run build`         |
| Publish directory | `dist`                                 |

Add a rewrite rule: `/*` → `/index.html` (Rewrite) for SPA routing.

### Server — Web Service

| Setting     | Value                          |
|-------------|--------------------------------|
| Start       | `node dist/server.js`          |
| Build       | `pnpm install && pnpm build`   |
| Node        | ≥ 18                           |

### CORS Origins to Allow

```
http://localhost:5173
http://localhost:5174
https://<your-client-domain>.onrender.com
https://<your-admin-domain>.onrender.com
```

---

## Auth Flow

1. Register with role (`player` / `organizer`)
2. Email OTP verification
3. Login → JWT access + refresh token pair
4. Token validated on app bootstrap via `/api/v1/auth/me`
5. Background refresh every 60 seconds when token has < 2 min remaining
6. Protected `/auth/*` routes redirect unauthenticated users to `/login?next=<path>`

---

## Legal

Apex Arenas operates as a **technology service provider only** — it does not run tournaments, act as a gaming operator, or fund prizes from its own capital. This structure aligns with Ghana Gaming Act 721.

---

## Status

**Active Development — MVP Phase**
Internal and partner use only.

---

*Built for Ghana. Scaling West Africa.*
