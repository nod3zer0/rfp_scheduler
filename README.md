# RFP Squad

Coordinate Rock for People 2026 festival plans with your friend group.  
Track the full schedule, pick the bands you want to see, and see what your friends are going to.

## Tech Stack

- **SvelteKit** with `adapter-node`
- **SQLite** via `better-sqlite3` + **Drizzle ORM**
- **Tailwind CSS** (v4, `@tailwindcss/vite`)
- `node-cron` — schedule sync every 6 hours
- `cheerio` — HTML scraping from rockforpeople.cz
- `bcrypt` — password hashing
- `nanoid` — ID generation
- `arctic` — OAuth 2.0 (Facebook login)

## Setup

```bash
npm install
cp .env.example .env
# Edit .env — set DATABASE_PATH, ADMIN_PASSWORD, and optionally FACEBOOK_APP_ID/SECRET
```

Push the schema to SQLite:

```bash
npx drizzle-kit push
```

## Development

```bash
npm run dev
```

## Testing

**Unit and integration tests** (Vitest — files matching `src/**/*.test.ts`):

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with V8 coverage
```

**End-to-end tests** (Playwright — specs in `tests/`):

1. Install browsers once (after `npm install`):

   ```bash
   npx playwright install chromium
   ```

2. Run E2E (automatically builds the app, creates a separate `rfpsquad-test.db`, and starts a preview server on port **4173**):

   ```bash
   npm run test:e2e
   ```

   After a run: `npx playwright show-report` to open the HTML report.

**Type-check only:**

```bash
npm run check
```

## Build & Run

```bash
npm run build
node -r dotenv/config build/index.js
```

## PM2

```bash
pm2 start build/index.js --name rfpsquad \
  --interpreter node -- -r dotenv/config
pm2 save && pm2 startup
```

## Caddy

```caddyfile
yourdomain.com {
  reverse_proxy localhost:3000
}
```

## First Run

1. Register an account at `/account/register` — the first user can immediately create a group.
2. Go to `/groups/new` to create your group and share the invite link.
3. Friends can join via the invite link; they can use the app as a guest or register an account.
4. The server scrapes `rockforpeople.cz` automatically on startup and every 6 hours.
5. Go to `/admin` (password from `.env`) for schedule management and snapshot history.

**Safety:** If the scraper returns 0 results (e.g. the site changed), it aborts without touching the database.  
**Recovery:** If schedule data looks wrong, go to `/admin` → Snapshot History → Restore an earlier snapshot.

## Identity Model

Users can participate as **guests** or **registered accounts**:

- **Guests** join via an invite link and pick a display name — identity is stored in a browser cookie. Guest access can be disabled per group by a registered member.
- **Registered users** log in with a password (or Facebook OAuth). Their band picks are shared across all groups they belong to. Registered identities cannot be claimed by other users.

Use the **"👤 Your Name ▾"** button in the nav to switch identity or access account settings.
