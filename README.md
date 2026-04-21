# Apex Arenas — Esports Tournament Platform

A web-based esports tournament hosting and management platform designed to professionalize competitive gaming in Ghana and scale across West Africa. The platform provides secure tournament infrastructure, mandatory prize escrow, automated prize distribution, and player career-building tools.

---

## Overview

Apex Arenas is a **technology and infrastructure provider**, not a gaming or betting operator.  
Independent organizers use the platform to create and manage esports tournaments, while players compete in a trusted environment with **guaranteed prizes secured via escrow**.

The platform addresses major challenges in the local esports ecosystem, including unreliable prize payments, manual tournament administration, lack of player visibility, and limited trust.

---

## Core Value Proposition

- **Mandatory Prize Escrow** – All prizes are locked before tournaments go live
- **Automated Prize Distribution** – Winners are paid instantly after tournament completion
- **Organizer–Platform Separation** – Legal and regulatory protection
- **Local Payment Support** – Mobile Money and Ghana Cedis (GHS)
- **Player Career Growth** – Profiles, statistics, rankings, and highlights
- **Scalable Tournament Infrastructure** – Online, offline, and hybrid tournaments

---

## Platform Roles

### Players

- Discover verified tournaments
- Register for free or paid competitions
- Compete and track performance
- Receive and withdraw prizes securely

### Organizers (Verified)

- Create and manage tournaments
- Deposit prize funds into escrow
- Collect entry fees automatically
- Declare winners and run events professionally

### Platform (Apex Arenas)

- Provides tournament software
- Processes payments and escrow
- Distributes prizes automatically
- Enforces platform rules and dispute resolution
- Does **not** operate tournaments or fund prizes

---

## System Workflow

### Player Journey

1. Create account
2. Browse tournaments
3. Register (free or paid)
4. Compete
5. Receive prize (if winner)
6. Withdraw funds

### Organizer Journey

1. Register and apply for organizer status
2. Admin verification
3. Create tournament
4. Deposit prize escrow
5. Open registration
6. Run tournament
7. Declare winners
8. System distributes prizes automatically

---

## Tournament Lifecycle

- **Draft** – Tournament being created
- **Pending Escrow** – Awaiting prize deposit
- **Active** – Accepting registrations
- **Registration Closed**
- **In Progress**
- **Completed** – Prizes distributed automatically
- **Cancelled** – Refunds processed

---

## Money Flow

### Entry Fees (Paid Tournaments)

- 10% — Platform service fee
- 90% — Organizer earnings

### Prize Escrow

- Organizer deposits full prize amount
- 1% — Escrow service fee
- 99% — Locked escrow account

### Prize Distribution

- Triggered automatically when tournament is marked completed
- Funds sent directly to winners' Mobile Money or bank accounts

---

## Key Features

### Player Features

- Player profiles with stats and history
- Tournament discovery and filtering
- Secure payments and withdrawals
- Notifications (registration, matches, prizes)

### Organizer Features

- Tournament creation dashboard
- Automated registration management
- Match and bracket management
- Prize distribution automation
- Credibility scoring

### Admin Features

- Organizer verification
- Withdrawal approval
- Dispute resolution
- Financial reconciliation and audits

---

## Security and Compliance

- Mandatory prize escrow
- Role separation (platform vs organizer)
- Audit trails for all transactions
- Age verification (18+)
- Compliance with Ghana Gaming Act 721
- Data protection and secure storage

---

## Intelligent Features

- AI-assisted winner verification
- Fraud and anomaly detection
- Organizer credibility scoring
- Performance analytics and insights

---

## Tech Stack

- **Frontend:** React + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MongoDB
- **Payments:** Mobile Money (MTN, Vodafone, AirtelTigo)
- **Real-Time:** WebSockets / Socket.io
- **Automation:** Event-driven workflows for payouts and notifications

---

## Launch Strategy

- Closed beta with free tournaments
- Gradual introduction of paid tournaments
- Partnerships with gaming cafes and universities
- Influencer and community-driven growth
- Expansion across Ghana, then West Africa

---

## Legal Positioning

Apex Arenas operates strictly as a **technology service provider**:

- Does not run tournaments
- Does not act as a betting or gaming operator
- Does not guarantee prizes from its own funds

This structure ensures regulatory compliance and long-term scalability.

---

## License

MIT License

---

## Status

**In Active Development (MVP Phase)**  
Confidential — Internal and Partner Use Only

---

## Current Implementation

### Frontend Apps

- `Client/` — Main user app (players + organizers)
- `Admin/` — Admin interface (separate Vite app)

### Auth Flows Implemented

- Registration with role selection (`player` / `organizer`)
- Login with backend integration
- OTP verification and OTP resend
- Forgot password request flow
- Session persistence using local storage
- Token validation on app bootstrap
- Token refresh fallback handling
- Protected `/auth/*` routes
- Auth-aware navbar (guest vs authenticated actions)
- Dashboard fetches authenticated profile data

### API Configuration

- Auth API base URL configured via `VITE_AUTH_BASE_URL`
- Default fallback: `https://api-apexarenas.onrender.com/api/v1/auth`

---

## Deployment (Render)

### Frontend (Static Site)

- Service type: Static Site
- Root directory: `Client`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Required env var: `VITE_AUTH_BASE_URL=https://api-apexarenas.onrender.com/api/v1/auth`

### SPA Rewrite Rule

Add a rewrite rule in Render:

- Source: `/*`
- Destination: `/index.html`
- Action: Rewrite

### Backend CORS

Allow frontend origins in backend CORS config:

- `http://localhost:5173`
- `https://<your-render-frontend-domain>.onrender.com`

Ensure preflight responses include `Access-Control-Allow-Origin` and related CORS headers.

---

## Local Development

From `Client/`:

```bash
npm install
npm run dev
```

Optional `.env` for local frontend testing:

```env
VITE_AUTH_BASE_URL=http://localhost:4000/api/v1/auth
```
