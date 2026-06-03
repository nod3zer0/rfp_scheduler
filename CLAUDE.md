# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RFP Squad** is a festival planning coordination app for Rock for People 2026. It allows friend groups to track the festival schedule, pick bands they want to see, and coordinate custom group events. Built with SvelteKit and SQLite.

**Progressive Web App (PWA)** — The app includes a manifest and service worker for installation on mobile/desktop devices. Users can "Add to Home Screen" for an app-like experience.

## Development Commands

```bash
npm run dev                # Start dev server (http://localhost:5173)
npm run build              # Production build (output: build/)
npm run preview            # Preview production build (port 4173)
npm run check              # Type-check without building
npm run check:watch        # Type-check in watch mode
```

### Database

```bash
npx drizzle-kit push       # Push schema to SQLite
npx drizzle-kit studio     # Launch Drizzle Studio GUI (db browser)
```

Database location is controlled by `DATABASE_PATH` in `.env` (default: `./rfpsquad.db`).

### Testing

**Unit/integration tests** (Vitest):
```bash
npm test                   # Run once
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
```

**E2E tests** (Playwright):
```bash
npx playwright install chromium    # First-time setup
npm run test:e2e                   # Run all E2E tests
npx playwright show-report         # View HTML report after run
```

E2E tests automatically create a separate test database (`rfpsquad-test.db`) and run against a preview build on port 4173.

**Running a single test:**
- Unit: `npm test -- src/lib/time.test.ts`
- E2E: `npx playwright test register-login.spec.ts`

## Architecture

### Identity & Authentication

The app supports **dual identity modes**:

1. **Registered users** (`users` table) — persistent accounts with password or Facebook OAuth
2. **Guest members** (`members` table without `userId`) — ephemeral, cookie-based identity

**Key invariant:** Registered users' band picks are **shared across all groups** they belong to (via `picks.userId`). Guest picks are scoped to a single member/group (via `picks.memberId` only).

Identity is stored in `rfp_identity` cookie (JSON: `{userId?, memberId?, groupId?}`). See `src/hooks.server.ts` for how `event.locals.{user, member, group}` are hydrated.

**Auth helpers** in `src/lib/server/auth.ts`:
- `requireMember(locals)` — throws 401 if no member (use in API routes)
- `requireMemberAndGroup(locals)` — throws 401 if no member+group
- `requireGroupPage(locals)` — redirects to `/` if no group (use in page loads)
- `requireUserPage(locals)` — redirects to `/account/login` if no user

### Data Model (Drizzle ORM)

Schema: `src/lib/server/schema.ts`

**Core relationships:**
- `users` ← `members.userId` (nullable — guests have no userId)
- `groups` ← `members.groupId`
- `members.id` ← `picks.memberId` (always set)
- `users.id` ← `picks.userId` (set for registered users → picks shared across groups)
- `schedule.id` ← `picks.scheduleId`
- `groups.id` ← `groupEvents.groupId`
- `groupEvents.id` ← `groupEventAttendees.eventId`

**Picks helper** (`src/lib/server/picksHelper.ts`):
- `getMyPickIds(memberId, userId)` — returns scheduleIds the member/user has picked
- `buildPicksMap(scheduleIds, groupMembers)` — builds `Record<scheduleId, Array<{id, name}>>` for "who picked this band"

For registered members, `buildPicksMap` queries by `userId` to include picks from other groups.

### Festival Map Feature

**GPS-enabled map pins** (`/map` route):
- Users can place pins on festival maps (venue, sanitation, parking)
- Pins can be placed via GPS ("I'm here now") or manual click on map
- Each pin has: label, optional note, optional expiration time
- Shows distance/bearing to pins when user location is available
- Members can only delete their own pins

**Map configuration** (`src/lib/mapConfig.ts`):
- `gpsToImageCoords()` — converts GPS lat/lng to image x/y percentage
- `imageCoordsToGPS()` — inverse conversion
- `calculateDistance()`, `calculateBearing()`, `formatDistance()` — GPS utilities
- `MAP_BOUNDS` — geographic bounds for the venue map

**Map calibration**:
- Download GeoTIFF from MapWarper (https://mapwarper.net/maps/107468 → Export → GeoTiff)
- Run `npm run map:calibrate path/to/map.tif` to extract bounds and update `mapConfig.ts`
- See `MAP_CALIBRATION.md` for detailed instructions

**Database**: `mapPins` table stores both GPS coordinates (lat/lng) and image coordinates (x%, y%). GPS coordinates are nullable for manually-placed pins. Pins also have customizable `icon` (emoji) and `color` (hex) fields.

### Schedule Scraping

`src/lib/server/scraper.ts` scrapes `rockforpeople.cz/harmonogram/` with Cheerio.

- Runs on app startup and every 6 hours via `node-cron` (`src/lib/server/cron.ts`)
- **Safety:** If scrape returns 0 results, it aborts without touching the database
- Each successful scrape creates a snapshot in `scheduleSnapshots` table
- Admin can restore previous snapshots at `/admin` → Snapshot History

The scraper extracts: band name, day, stage, date, time range, and RFP URL.

**Stage mapping:** Dynamically scrapes stage names from `.timetable__stage-button[data-stage]` elements. Falls back to hardcoded `STAGE_ID_MAP` if scraping fails.

### Routes & Pages

**File-based routing** (SvelteKit):
- `/` — main schedule view (redirects to `/account/groups` or `/account/login` if no group set)
- `/overview` — grid view of all days
- `/friends` — list all group members + their pick counts
- `/friends/[id]` — detail view of one member's picks
- `/groups/new` — create a new group
- `/groups/[id]/manage` — manage group settings, invite links, members
- `/join/[token]` — join a group via invite link
- `/account/login`, `/account/register` — auth flows
- `/account/groups` — switch between groups (registered users only)
- `/account/settings` — account settings (delete account, etc.)
- `/admin` — admin panel (global password from `.env`, manages all groups + schedule snapshots)

**API routes** (`/api/*`):
- `POST /api/picks` — toggle a pick for current member/user
- `POST /api/group-events` — create/delete custom group events
- `POST /api/group-events/attend` — toggle attendance at a group event
- `POST /api/invite-links` — create/deactivate invite links
- `POST /api/group-members` — remove a member from group

All API routes use `requireMember` or `requireMemberAndGroup` from auth helpers.

### Days & Time Utilities

`src/lib/days.ts`:
- `DAYS: Day[]` — array of festival days (`'thu' | 'fri' | 'sat' | 'sun'`)
- `DAY_LABELS: Record<Day, string>` — display labels
- `SLUG_TO_DAY` — maps URL slugs from scraper to Day
- `getCurrentDay()` — returns current day based on real dates (defaults to first day)

`src/lib/time.ts`:
- `timeToMinutes(time: string)` — converts "HH:MM" to minutes since midnight
- `formatTime(time: string)` — formats time for display

### Deployment

**Production build:**
```bash
npm run build
node -r dotenv/config build/index.js
```

**With PM2:**
```bash
pm2 start build/index.js --name rfpsquad --interpreter node -- -r dotenv/config
pm2 save && pm2 startup
```

**Docker:**
- `Dockerfile` — production build
- `Dockerfile.dev` — dev container
- `docker-compose.yml` — complete stack (uncomment postgres if needed, currently uses SQLite)

The app uses `adapter-node` and listens on the port set by SvelteKit (default 3000).

## Environment Variables

Required in `.env`:
- `DATABASE_PATH` — path to SQLite database file
- `ADMIN_PASSWORD` — password for `/admin` panel
- `ORIGIN` — public URL (used by adapter-node and OAuth callbacks)

Optional (Facebook OAuth):
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`

Copy `.env.example` to `.env` and fill in values before first run.

## First Run Setup

1. `npm install`
2. Copy `.env.example` to `.env` and edit values
3. `npx drizzle-kit push` to initialize database
4. `npm run dev`
5. Register first account at `/account/register`
6. Create a group at `/groups/new`
7. Schedule auto-scrapes on startup and every 6 hours (check `/admin` for snapshot history)

## Admin Panel

The `/admin` panel requires the password set in `ADMIN_PASSWORD` environment variable. Features:

- **Schedule Sync** — manually trigger a scrape of rockforpeople.cz
- **Snapshot History** — view all schedule snapshots, restore previous versions, add labels
- **Groups** — view all groups, delete groups
- **Registered Users** — view all registered users, reset user passwords
- **Members** — view all members across all groups, remove members

Password reset functionality allows admins to set a new password for any registered user without database changes.

## Testing Notes

- Unit tests live alongside source files (`*.test.ts`)
- Integration tests are in `src/tests/api/*.test.ts` and use `db.test-helpers.ts` to create isolated test databases
- E2E tests are in `tests/*.spec.ts` and use Playwright with a separate `rfpsquad-test.db`
- Test helpers in `tests/helpers.ts` provide utilities for E2E test setup (register user, create group, etc.)
