# Apply the expense-sharing update

These changes are local only; no code has been pushed or deployed. You previously
confirmed applying migrations 001 and 002 to Neon and Supabase.

## Latest update: any-amount payments (004)

Run **`004_payment_credits.sql`** in Neon and Supabase, then restart the API.
This adds an auditable credit ledger for advances and overpayments. It preserves
existing splits and payments. Any group member can record payments between two
members; either friend can record payments in either direction. Amounts above the
balance become credit, and undo reverses the selected payment, its credit, and
its allocations together. Friend-level payments also clear advances inside groups.
This records payments only; Blip does not transfer money.

A read-only check of the configured Neon database confirmed that monthly budgets
and the Wallet activity trigger are installed; only the new payment credit table
and balance view were missing. This update has **not** been applied to a hosted
database by Codex. The full `neon-manual.sql` includes all four migrations and is
also safe to rerun if you are unsure which migrations Supabase has.

## Monthly budgets (003)

Run **`003_monthly_budgets.sql`** in both the Neon SQL Editor and the Supabase
development SQL Editor, then restart the API. This latest migration has been
tested against isolated local PostgreSQL, but has not been applied to either
hosted database by this work.

It stores a separate budget and check-in timestamp for each account and calendar
month. Existing onboarded accounts start with the current budget already checked
in, so the update does not ask again this month. Future months carry forward the
last chosen amount and allow one automatic check-in, shared across browsers and
devices. Closing the prompt keeps the current budget. Edits in Profile remain
available anytime and update only the current month. Earlier monthly values were
not stored, so history begins with this migration; old values are not fabricated.

The group activity UNION fix, immediate Activity refresh, and totals date filters
are code changes. The latest any-amount payment controls require migration 004.

## Full manual database migration

For a database without earlier migrations, `neon-manual.sql` combines 001, 002,
003, and 004 in a single transaction. It contains no credentials and is safe to rerun.
Existing installations with 001–003 can run just 004 for this update.

Existing ten-digit Indian phone numbers remain unchanged for compatibility with
the old app. New numbers use international format. A canonical unique index
prevents duplicate accounts across both formats; existing collisions abort the
migration instead of merging identities. Existing history is preserved.

An optional CLI remains available: `npm run migrate` uses `DATABASE_URL`;
`npm run migrate:neon` uses `NEON_DATABASE_URL`. Add `-- --check` to inspect the
schema first. Connection strings belong only in ignored environment files or
hosted secrets. The manual SQL is the preferred handoff for this update.

## Diagnose a localhost database connection

The running API uses `DATABASE_URL`. `NEON_DATABASE_URL` is only used by the
optional Neon migration command; adding it does not switch the API database.
From `blip-api`, run `npm run check:db` for a read-only connectivity and required
schema check. It prints the provider and result without connection credentials.
Restart `node index.js` after changing `.env` or backend connection code.

The connection configuration normalizes pg's deprecated `require`, `prefer`, and
`verify-ca` aliases to explicit `verify-full`, preserving certificate verification.
A connection timeout is separate from that SSL warning: the SQL migration cannot
repair network reachability. If DNS resolves but connection attempts time out,
compare a different network (for example a phone hotspot), check local VPN/firewall
rules, and check the Neon compute/access restrictions. Do not rerun migrations
just to address a timeout. A successful Neon SQL Editor run does not verify the
network path from your laptop to the database host.

## Frontend startup and deployment settings

For development, `blip-web/.env` uses `VITE_API_URL=/api`. Vite forwards `/api`
requests to `http://127.0.0.1:3000`, so both localhost and phone testing use the
same frontend origin without hardcoded Wi-Fi/hotspot IP addresses. Run both processes in separate terminals from the repository root:

```sh
npm start --prefix blip-api
```

```sh
npm run dev --prefix blip-web
```

Keep the API terminal running. `ECONNREFUSED 127.0.0.1:3000` means the proxy could
not connect to that process, not a missing notification permission or SQL table.
`http://localhost:3000/api/health` should return `{"status":"ok"}`. If it does not,
check the API terminal's startup error. Restart the API after backend changes and
restart Vite after changing its configuration. Requests have a
20-second overall deadline, including authentication and response parsing. Reads
can retry transient failures within that deadline; writes are never replayed.
Startup failures show an error with a retry action instead of an endless loader.

The development proxy is not part of the production build. Before deployment:

| Host | Setting |
| --- | --- |
| Frontend (root `blip-web`) | Build `npm run build`, output `dist`; set `VITE_API_URL` to the deployed HTTPS backend URL and `VITE_CLERK_PUBLISHABLE_KEY` to the matching Clerk application key. |
| Backend (root `blip-api`) | Install with `npm ci`, start with `npm start`; set `DATABASE_URL`, Clerk keys, and `ALLOWED_ORIGIN` to the exact deployed frontend origin (no trailing slash). |
| Backend push | Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` as described below. |

Do not use `/api`, `localhost`, or a private LAN address for the hosted frontend's
`VITE_API_URL` with the current Vercel configuration: its catch-all rewrite serves
the frontend HTML, not the backend API. Vite environment values are embedded at
build time, so rebuild after changing them. Ignored local `.env` files are not
copied to either host by GitHub. The frontend and backend must deploy together;
the new frontend needs the new activity, totals, and settlement endpoints.

## Background notifications

The Activity tab replaces Investments and records wallet expense changes, shared
bill creation/edit/deletion, settlements/undo, friend connections, and group
creation/settings/membership/archive events. Historical bills and settlements are
backfilled as already seen; past edits/deletes cannot be reconstructed. Your own
actions are marked seen and do not push to your devices.

Device notifications use standard Web Push, a service worker, and a durable
PostgreSQL delivery queue. They do not require the recipient to keep Blip open.
To activate them after deploying this code:

1. Run the database migration above.
2. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` in the
   backend host's environment. A keypair has been generated locally in the ignored
   `blip-api/.env`; copy those values privately. Keep the private key secret and
   preserve the same keys across deployments. `npm run setup:push` generates keys
   only if none exist. The subject is an HTTPS contact URL or `mailto:` address.
3. Serve the frontend over HTTPS and deploy `public/sw.js` with it. The frontend
   gets the public VAPID key from the authenticated API; no frontend key is needed.
4. Open Activity and enable device notifications on each desired device. Have a friend add a bill to verify delivery. On iOS/iPadOS 16.4+, install Blip
   using Share → Add to Home Screen, open that installed app, then enable alerts.
   Browser/device permission is always required.

The API sends after committed changes. On Vercel, `waitUntil` keeps delivery work
alive after the response. Failed deliveries stay queued and retry on later API
mutations or Activity reads. Locally, a persistent Node process also retries every
30 seconds. Vercel does not run that timer between requests; guaranteed scheduled
retries during zero traffic require a separate scheduled job/worker. Expired subscriptions
are removed. Logging out unsubscribes that browser. Open-app activity also
refreshes every 15 seconds and on focus. The landing page offers the native
Android install prompt when available and manual iOS installation guidance.
This update does not add offline expense entry.

References: [Apple Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
and [browser install prompts](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event).

## Accounting behavior

- Friends is the default tab; Home is named Wallet; Activity replaces Investments.
  Investment data and backend routes are preserved.
- Wallet statistics follow the current local calendar month. History and the
  configured monthly spending limit are retained across month boundaries.
- Shared entry has separate description/amount inputs, exact cent-based splitting,
  participant breakdowns, trip totals, each member's paid/share/settlement totals,
  and partial settlement amounts. Settlements never add to trip spending totals.
- Payments are transactional, serialize concurrent settlements between a pair,
  and preserve overpayments as credits. Undo affects only the selected payment and allocations.
  Optional wallet entries use Income when receiving, Social when paying.
- Settled shares must be undone before editing/deleting a bill. Group archival
  and member removal are blocked while relevant pair balances remain outstanding.
- Old settlement rows do not reliably identify their allocations. Their balances
  remain intact, but automatic undo is blocked to avoid corrupting unrelated
  bills. Existing historical accounting mistakes require reconciling real payment
  history; the migration cannot infer money that actually changed hands.

## Verification

- `npm test`, `npm run lint`, and `npm run build` in `blip-web`.
- `npm test` in `blip-api` runs units; database integration tests skip unless
  `BLIP_TEST_DATABASE_URL` points to an isolated local PostgreSQL database.
- `BLIP_TEST_DATABASE_URL='postgresql://USER@127.0.0.1:PORT/DB?sslmode=disable' npm test`
  creates a disposable schema, runs the exact manual migration twice, exercises
  partial/concurrent settlements, undo, access controls, totals, activity, recurring
  payment duplication, and queued push delivery, then drops only that schema.
  Push transport and Clerk authentication are stubbed in this isolated harness.
- `blip-web/tests/preview.html` is a development-only visual fixture with fake data
  and no real account/API writes. It is not included in the production build.
- Actual iOS/Android push delivery and real Clerk sign-in still need a device smoke
  test after deployment and database/environment setup.

## Rupees and Activity

Amounts use the neutral **Rs. / Rupees** label. There is no conversion or exchange
rate: use one rupee denomination consistently within each group or friend balance.
Personal expenses, edits, deletes, income, and recurring payments refresh Activity
as soon as the save succeeds. Shared Activity has Friends and Groups filters plus
event details. New shared bill events store a snapshot of each person's share;
older events retain the details available when they were recorded.

On iPhone, open the HTTPS site in Safari, use Share (or More → Share) → Add to
Home Screen, keep Open as Web App on if shown, and launch the new icon. On iOS
16.4+ the Enable device notifications button is then available in Activity once
the backend is configured. On Android use an up-to-date Chrome over HTTPS. LAN
HTTP addresses cannot enable Web Push. Localhost's desktop exception does not
extend to a phone accessing your computer's IP address.

## Latest UI and friend-history refinement

No additional SQL is required for this refinement (migration 004 is still needed
for the any-amount settlements introduced earlier). Restart the API for the friend
history query fix: shared bills now appear when a third group member paid them,
with the actual payer's name. Unrelated bills remain excluded. Saving a friend
expense refreshes that friend's detail view directly, and older requests cannot
replace a newer friend's results.

Activity now has one notification toggle; installation or connection guidance is
shown only after tapping it when necessary. HTTPS and iPhone Home Screen Web Push
requirements still apply. Save confirmations are brief, nonblocking, and respect
reduced-motion preferences.


## Transaction corrections and loading

No new migration is required for these corrections. Restart the API after updating
its code; migration 004 remains required for the earlier payment-credit feature.

- Bills with payments applied stay locked for both edit and delete. The UI explains
  the lock and payment rows expose **Undo payment** with confirmation. Undo the
  related payments, correct the bill, then re-record the money already paid.
  For a Rs. 600 bill split 250/350 with Rs. 300 paid, undoing that payment, changing
  the shares to 300/300, and recording Rs. 300 again leaves no balance.
- Zero-value shares do not lock a bill. Old payments whose allocations cannot be
  safely identified still cannot be undone automatically (see safeguards above).
- Shared bill history sorts and groups by recording time, newest first, for both
  bills and settlements. Backdated bills still appear at the top when added; their
  expense dates remain unchanged for totals and are shown under View split. Owing balances use a warm red tone; receivables remain green.
- Wallet transaction editing uses the same compact panels as adding money.
- Startup no longer waits for the timed splash. Independent startup reads run
  together, and routine authentication object updates do not restart account loading.
  Actual server/database response time still affects the initial load.


## Pull-to-refresh and Vercel deployment

The refresh control now needs about 112 pixels of downward finger movement at the
very top of the screen. It ignores horizontal swipes, form fields, nested scroll
areas, and cancelled or multi-finger gestures. It shows Pull / Release / Refreshing,
then success or retry feedback, without shifting the content or reloading the
page. Concurrent pulls share one refresh, independent reads run together, and
Activity is included. Failed requests always release the refresh lock.

Both the frontend and API are hosted as separate Vercel projects connected to
`shashank-modi/Blip`, production branch `main`. Configure before pushing:

| Setting | Frontend project | API project |
| --- | --- | --- |
| Root Directory | `blip-web` | `blip-api` |
| Framework | Vite | Express (auto-detected) |
| Install Command | `npm ci` | `npm ci` |
| Build Command | `npm run build` | Framework default; no Vite build |
| Output Directory | `dist` | Framework default; do not set `dist` |
| Node.js | `22.x` | `22.x` |

Set these in **Settings → Environment Variables → Production**:

Frontend:
- `VITE_API_URL`: the existing HTTPS **API project** domain, without a trailing
  slash (for example `https://YOUR-API-PROJECT.vercel.app`). Do not use the frontend
  domain, localhost, or `/api`. The client appends `/api` automatically.
- `VITE_CLERK_PUBLISHABLE_KEY`: the current Clerk application's publishable key.

API:
- `DATABASE_URL`: your Neon connection string (the pooled URL is suitable). The
  running server uses this name, not `NEON_DATABASE_URL`.
- `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY`: the matching existing Clerk app.
- `ALLOWED_ORIGIN`: `https://get-blip.vercel.app` (or your exact current frontend
  domain, without a trailing slash).
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`: copy your existing local
  API values privately. Reuse the keypair; do not regenerate it per deploy.

Vercel sets `VERCEL` automatically. The API exports its Express app; local
`npm start` still listens on a port. Production uses Vercel's Express integration,
not a permanent `npm start` process. No extra backend catch-all rewrite is needed
for this integration. Keep the frontend's existing `vercel.json` SPA rewrite.
Do not copy it to the API project.

Ensure migrations 001–004 have run on Neon **before** deploying these accumulated
changes. No additional migration is needed for pull-to-refresh or Vercel support.

From the repository root, review and push:

```sh
git status
git add blip-api blip-web .gitignore README.md
git diff --cached --stat
git diff --cached --name-only
# Confirm no .env files or logs are listed, then:
git commit -m "Polish Blip 3.0 expense sharing and refresh"
git push origin main
```

Both projects deploy from the Git push when automatic deployments are enabled.
Environment changes only affect new deployments: after saving any later change,
redeploy the relevant project. Deploy both projects from the same commit. If a push
is rejected because the remote moved, fetch/reconcile first; do not force-push.

After both deployments finish:
1. Open `https://YOUR-API-PROJECT.vercel.app/health` and `/health/db`; expect OK
   and `db: connected` respectively.
2. Open the frontend; check sign-in, add one real test bill, refresh, and verify
   totals/history. Test notifications between two consenting users/devices.
3. On iPhone, launch the HTTPS app from its Home Screen icon to enable Web Push.
   Android uses a supported HTTPS browser/PWA. Actual device delivery has not
   been validated from this development environment.

Official references: [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite),
[Vercel Express](https://vercel.com/docs/frameworks/backend/express),
[environment variables](https://vercel.com/docs/environment-variables),
[Git deployments](https://vercel.com/docs/git), and
[background work with waitUntil](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package).
