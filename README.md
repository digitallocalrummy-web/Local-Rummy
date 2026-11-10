# Local Rummy

Indian 13-card rummy with **virtual chips only** (no real money): an Android app, an admin panel and the game server that connects them.

```
local-rummy/
├── server/          ← API + live game server (Node.js, Fastify, Socket.io, PostgreSQL)
├── admin-panel/     ← Admin website (React + Vite): players, game settings, live tables, chips, reports, banners, support
├── mobile-app/      ← Android rummy app (React Native + Expo): sign-in, lobby, live tables, bonuses
├── client/          ← Web game (browser version, static files; today a click-through demo with sample data)
├── shared/rummy/    ← Rummy rules (sets, sequences, jokers, scoring) used by the server and the AI players
└── deploy/          ← Nginx, PM2 and the VPS guide
```

How the parts talk:

```
Android app ──REST + websocket──▶ server ◀──REST── admin panel
                                    │
                                PostgreSQL
```

The server runs the game: it shuffles with a cryptographic RNG, deals, keeps every hand secret, runs turn timers,
checks declarations and settles chips. The app only shows what the server allows each player to see, so a
modified app cannot cheat.

## What works today

- **Players:** guest sign-in per device, welcome chips, daily bonus with a 7-day streak, a free refill when broke, profile and stats.
- **Tables:** Points rummy for 1–10 players (3 decks above 6 players), entry tiers or free practice, AI players fill empty seats, turn timer with auto-play and auto-drop, drop penalties, wrong-show penalty, reconnecting to a running table.
- **Admin:** sign-in with roles (super, moderator, support), overview, players (search, block, give or remove chips), game setup (modes, players per table, entries, timers, penalties, maintenance, minimum app version), live tables (seats, skip turn, message table, end and refund), chips and the chip log, reports (daily players, returning players, busiest hours, top players, CSV export), lobby banners, push notifications, support tickets and cheating reports.
- **Admin → app:** publishing game settings reaches every connected phone instantly; chip changes and blocks apply immediately.

**Not yet:** Pool 101 and Deals currently play as a single Points-style deal; private tables with friend codes; phone/Google sign-in. These are the next steps.

## Run it on your computer

Needs only **Node.js 22+**. The server uses a built-in test database (saved in `server/.data`), so there is no Docker or PostgreSQL to install.

```bash
npm install -g pnpm
pnpm install
pnpm db:seed          # creates the tables, settings and the admin admin@localrummy.app / change-me-now
pnpm dev:server       # terminal 1 · API on http://localhost:4000
pnpm dev:admin        # terminal 2 · admin on http://localhost:5173
pnpm simulate 4 50    # terminal 3 (optional) · plays a 4-player game with a 50-chip entry
```

To use real PostgreSQL instead, copy `server/.env.example` to `server/.env` and set `DATABASE_URL=postgres://…`
(`docker compose up -d db` starts one).

Mobile app (on a phone on the same Wi-Fi):

```bash
cp mobile-app/.env.example mobile-app/.env   # set EXPO_PUBLIC_API_URL to your computer's LAN IP, e.g. http://192.168.1.10:4000
pnpm dev:mobile
```

The app uses native modules (secure storage), so use a development build rather than Expo Go:
`cd mobile-app && npx eas-cli build --profile development --platform android`.

## Build the APK

1. In `mobile-app/eas.json`, set `EXPO_PUBLIC_API_URL` in the `apk` profile to your server, e.g. `http://82.112.45.10` (behind Nginx) or `https://api.yourdomain.com`.
2. `cd mobile-app && npx eas-cli login && npx eas-cli build --profile apk --platform android`
3. EAS gives you a download link for the `.apk`. Install it on Android (allow “Install unknown apps”).

Bump `version` and `android.versionCode` in `app.json` for each new APK. If you raise “Minimum app version” in the admin, older APKs are asked to update.

## Deploy on a VPS (Hostinger or any Ubuntu server)

See [deploy/DEPLOY.md](deploy/DEPLOY.md).

## Checks

```bash
pnpm test                          # rummy rules tests
pnpm typecheck                     # all packages
pnpm simulate 4 50                 # plays a full 4-player game against the running server
```
