# Phase A — Local SQLite Backend + Expanded Insurance Data Model

## Context

Kenny's Client Book currently stores everything in Firebase (Auth,
Firestore, Storage). Two problems prompted this change:

1. **Speed.** Every read/write round-trips to Firestore over the
   internet even though the app runs entirely on one PC. This is the
   primary cause of the app feeling slow.
2. **Data model.** The current `Client` record is flat — one
   `carrier` string, one `lineOfBusiness` string — which doesn't match
   how a real household's insurance actually works: multiple policies
   (auto, home, umbrella), each with its own carrier, coverage
   details, vehicles, drivers, and property specifics.

This spec covers replacing Firebase entirely with a local SQLite
database owned by Electron's main process, plus redesigning the data
model to support real per-policy detail (Policy, Vehicle, Driver,
PropertyDetails). This is **Phase A: backend + schema only.** A
follow-on Phase B will redesign the client-detail UI so all these new
fields are actually enterheable/visible — Phase A's job is to get the
storage layer and data shape right and prove it end-to-end through the
*existing* UI (which will keep working against a subset of the new
schema, unchanged, since function signatures are preserved).

## Goals

- Replace Firebase (Auth + Firestore + Storage) with a local SQLite
  database (`better-sqlite3`) and local filesystem document storage,
  both owned by Electron's main process.
- Preserve every existing `db.js`/`storage.js`/`firebase-init.js`
  exported function name and signature so `views/*.js`, `icons.js`,
  and `utils.js` require **zero changes** in this phase.
- Replace the login screen's Firebase Auth call with a local
  password-hash check.
- Introduce the new relational schema (Client, Policy, Vehicle,
  Driver, PropertyDetails, Document, Interaction, Task) so Phase B can
  build UI against it, even though this phase's UI only exercises the
  Client/Interaction/Task/Document parts (Policy/Vehicle/
  Driver/PropertyDetails get created via IPC handlers and covered by
  Phase A's manual verification, but no UI screens yet — that's
  Phase B).
- Fix the root cause of "the app works so slow": eliminate all network
  I/O from every data operation.

## Non-goals (deferred to Phase B)

- No new UI screens for entering Policy/Vehicle/Driver/PropertyDetails
  data. Phase A proves the schema and IPC layer work; Phase B builds
  the multi-section client profile UI to actually use them.
- No data migration tool for existing Firebase data — the app has no
  real client records loaded yet (per the README's compliance note,
  real records were never loaded pending Wellcare sign-off), so there
  is nothing to migrate.
- No multi-user / multi-device sync. This is explicitly a single-PC,
  single-user local app now.
- No SIN, credit score, or medical data fields — consistent with the
  RIBO/PIPEDA compliance notes already in the README.

## Architecture

### Process model

Electron's **main process** (`main.js`) owns:
- The `better-sqlite3` database connection (one file,
  `app.getPath('userData')/crm-data.db`).
- A set of `ipcMain.handle(channel, handler)` registrations, one per
  data operation (e.g. `clients:list`, `clients:create`,
  `interactions:listForClient`, `documents:upload`, `auth:login`).
- Document file storage under
  `app.getPath('userData')/documents/{clientId}/{category}/{filename}`,
  read/written with Node's `fs` module.

A new **preload script** (`preload.js`), loaded via
`webPreferences.preload` in `main.js`'s `BrowserWindow` config,
exposes a `window.crmAPI` object via `contextBridge.exposeInMainWorld`,
with one async method per IPC channel (e.g.
`window.crmAPI.clients.list()` → `ipcRenderer.invoke('clients:list')`).
`contextIsolation` stays `true` and `nodeIntegration` stays `false` —
the renderer never gets direct Node/fs/sqlite access, only the
whitelisted `crmAPI` surface, preserving the existing security
posture.

The renderer's `db.js`, `storage.js`, and `firebase-init.js` are
rewritten to call `window.crmAPI.*` instead of Firestore/Storage SDKs,
**keeping their exact current exported function names and return
shapes** (e.g. `listClients()` still returns
`Promise<Array<{id, fullName, ...}>>`). This is what lets
`views/*.js` stay untouched.

Electron's static HTTP server in `main.js` (the one that serves
`app/` over `http://127.0.0.1:51837`) is unaffected — it still serves
the same static files. IPC works the same whether the renderer content
came from `http://` or `file://`.

### Why IPC instead of a local HTTP API

An earlier direction considered a local Express server the renderer
would call over `http://localhost`. IPC is simpler and faster for a
single-process desktop app: no HTTP parsing/serialization overhead, no
port management, and Electron's `ipcRenderer.invoke`/`ipcMain.handle`
already provides a clean async request/response contract that maps
1:1 onto the promise-based functions `db.js` already exposes.

### Auth

`firebase-init.js` is replaced with a small local-auth module:

- On first run (no password hash stored yet), the app prompts for a
  password to set (reusing the existing login screen, with a "Set
  password" mode when `auth:hasPassword` IPC call returns `false`).
- The hash (via `bcrypt`, matching the pattern already used in the
  user's other project, autopartsbid) is stored in a `settings` table
  in the same SQLite database.
- `login(password)` → IPC `auth:login` → compares against the stored
  hash, returns a success/failure boolean. No token is needed since
  there's no network boundary to cross — once the main process
  confirms the password, it holds an in-memory "unlocked" flag for the
  session, and every other IPC handler checks that flag before
  touching data (defense in depth against a compromised renderer, even
  though the renderer is already sandboxed).
- `logout()` clears the in-memory unlocked flag and re-shows the login
  screen (same UI flow as today).

## Data model (SQLite schema)

All tables use an `id` TEXT primary key (existing code already treats
IDs as opaque strings — e.g. `#/clients/${c.id}` in routes — so IDs
are generated as UUIDs via Node's built-in `crypto.randomUUID()`,
keeping that assumption true). Timestamps are stored as ISO 8601
strings (`createdAt`, `updatedAt`) to match how `fmtDate()` and
`daysUntil()` in `utils.js` already parse dates.

### `clients`

Existing columns (unchanged): `id, fullName, status, phone, email,
lineOfBusiness, carrier, renewalDate, referralSource, notes,
createdAt, updatedAt`.

New columns this phase adds (nullable, not yet surfaced in UI until
Phase B): `dateOfBirth, maritalStatus, occupation, employer,
secondaryPhone, mailingAddress, mailingCity, mailingProvince,
mailingPostalCode, propertyAddressSameAsMailing (0/1), propertyAddress,
propertyCity, propertyProvince, propertyPostalCode,
preferredContactMethod, preferredContactTime, language,
driversLicenseNumber, licenseProvince, licenseExpiry, yearsLicensed,
licenseClass`.

`lineOfBusiness` and `carrier` stay on `clients` for backward
compatibility with the existing UI (dashboard/list/detail views read
them directly) — they now represent a *summary* of the household's
policies, while the new `policies` table holds the authoritative
per-policy detail. Phase B's UI work will decide whether to keep
`lineOfBusiness`/`carrier` in sync automatically from `policies` or
retire them; out of scope for Phase A.

### `household_members` (new)

`id, clientId, fullName, dateOfBirth, relationship, createdAt`.
One client → many household members (dependents, spouse, etc.).

### `policies` (new)

`id, clientId, type (Auto|Home|Tenant|Condo|Umbrella|Business|Other),
carrier, policyNumber, status (Active|Pending|Lapsed|Cancelled),
effectiveDate, renewalDate, premium, paymentFrequency
(Annual|Monthly|EFT), priorCarrier, claimsFreeYears, liabilityLimit,
deductibles (TEXT, JSON-encoded — e.g.
{"comprehensive":500,"collision":1000} for auto or
{"overall":1000,"water":2500} for home), endorsements (TEXT,
JSON-encoded array of strings), additionalInsureds (TEXT,
JSON-encoded array of strings), notes, createdAt, updatedAt`.

JSON-encoded columns are used for `deductibles`/`endorsements`/
`additionalInsureds` because their shape genuinely varies by policy
type (auto vs. home deductibles are different shapes) — SQLite has no
native array/object column type, and forcing these into further
normalized tables would add join complexity Phase B's UI doesn't need
yet. The IPC layer parses/stringifies this JSON at the boundary so
`db.js` callers always see real JS objects/arrays, never raw JSON
strings.

### `vehicles` (new)

`id, policyId, year, make, model, trim, vin, bodyType, usage
(Pleasure|Commute|Business), annualKm, commuteKm, purchaseDate,
ownership (Owned|Financed|Leased), lienholder, antiTheftDevice (0/1),
winterTires (0/1), garagingAddress, createdAt`.
One auto policy → many vehicles.

### `drivers` (new)

`id, clientId, fullName, dateOfBirth, relationship
(Self|Spouse|Child|Other), licenseNumber, licenseProvince,
licenseExpiry, licenseClass, yearsLicensed, createdAt`.
One client → many drivers (a driver is a person; assignment to
specific vehicles is handled by `vehicle_drivers`).

### `vehicle_drivers` (new, join table)

`vehicleId, driverId` — many-to-many between vehicles and drivers
(a driver can be the primary operator of multiple vehicles; a vehicle
can have more than one regular driver).

### `driving_record_entries` (new)

`id, driverId, type (Violation|Claim), date, description, amount
(nullable — claim payout amount), atFault (0/1, nullable — claims
only), createdAt`.
Covers both the 3-year violation window and 6-year claims window from
the OAF 1 standard.

### `property_details` (new)

`id, policyId (unique — one property per Home/Condo/Tenant policy),
propertyType (House|Condo|Townhouse|Tenant), yearBuilt, squareFootage,
stories, constructionType, roofType, roofAge, heatingType,
electricalType, electricalAmps, electricalUpdatedYear, plumbingType,
plumbingUpdatedYear, foundationType, basementType, bedrooms,
bathrooms, waterSource (Municipal|Well), sewerType (Municipal|Septic),
distanceToFireHydrantKm, distanceToFireHallKm, hasPool (0/1),
hasTrampoline (0/1), hasPets (0/1), petDetails, securitySystem (0/1),
sumpPump (0/1), backwaterValve (0/1), priorWaterDamageClaims,
mortgageLienholder, replacementCostEstimate, createdAt, updatedAt`.

### `interactions`

Existing columns unchanged: `id, clientId, type, date, summary,
quoteAmount, quoteLOB, followUpDate, followUpDone, premiumAmount,
commissionRate, commissionAmount, createdAt`.

`type` gains three new allowed values in the shared type list (used by
both the interaction form's `<select>` and any future
validation): `Renewal Review`, `Claim Filed`, `Endorsement Request`,
`Cancellation` — alongside the existing Call/Quote/Email/Meeting/
Note/Bind/DASH Report.

New nullable column: `policyId` — lets a future interaction be tied to
a specific policy (e.g. "Claim Filed" naturally relates to one
policy), while staying optional so all existing interaction-creation
code (which doesn't know about policies yet) keeps working unchanged.

### `tasks`

Unchanged: `id, title, dueDate, done, notes, clientId, createdAt`.

### `documents` (new — replaces Firebase Storage's folder-listing
approach with a real table, since local disk doesn't give us "list
files with metadata" the way Storage's `listAll`/`getMetadata` did)

`id, clientId, policyId (nullable), category, name, filePath
(absolute path on disk), contentType, uploadedAt`.
`DOCUMENT_CATEGORIES` gains: `Policy Declaration Page`, `Home
Inspection Report`, `Prior Insurance Pink Slip` — alongside the
existing six categories.

### `settings` (new)

`key TEXT PRIMARY KEY, value TEXT` — single-row-per-key store, used
for the password hash (`key = 'passwordHash'`) and any future app
preferences.

## Migrations

`better-sqlite3` has no built-in migration framework. A small
hand-rolled migration runner in a new `db/migrations.js` applies
numbered `.sql` files (`001_initial_schema.sql`, etc.) in order,
tracked in a `schema_migrations` table (`version INTEGER PRIMARY KEY,
appliedAt TEXT`), run once at app startup before any IPC handler is
registered. This is the same pattern used by most lightweight SQLite
apps and gives a clean path for Phase B to add more migrations later
without a heavier ORM/migration library dependency.

## Error handling

- If the SQLite file is locked or corrupt on startup, the app shows
  the existing boot-error banner (`showBootError` in `index.html`)
  with a clear message rather than failing silently — this reuses
  infrastructure that already exists for catching module load
  failures.
- IPC handlers wrap their SQLite calls in try/catch and reject the
  promise with a plain `Error` (whose `.message` the renderer already
  surfaces via `toast(..., "error")` in the existing view code) —
  matching how Firestore errors were surfaced today, so error-handling
  call sites in `views/*.js` don't need to change.
- Document upload failures (disk full, permission denied) surface
  through the existing `docStatus`/toast error path in
  `client-detail.js`, unchanged.

## Testing / verification plan

No automated test suite exists in this repo (consistent with the
earlier Phase 1 spec's decision) — verification is manual, using
`npm start` directly since IPC/SQLite/local filesystem access only
work inside the real Electron process (unlike the static-file-only
frontend work in Phases 1-5, this cannot be verified via a plain
browser preview — there is no Electron main process or IPC bridge
outside Electron itself).

Verification steps:
1. `npm start`, confirm the first-run "set a password" flow appears
   (no `settings.passwordHash` row yet), set a password, confirm the
   app unlocks into the dashboard.
2. Quit and relaunch; confirm the login screen now asks for the
   existing password and accepts it.
3. Walk every existing view (dashboard, clients list/search/filter/
   sort/board, add/edit/delete client, log every interaction type,
   upload/view/delete a document, tasks, commissions, reports, global
   search, notifications) and confirm identical behavior to the
   Firebase-backed version, now backed by SQLite — this is the proof
   that `views/*.js` needed zero changes.
4. Confirm speed: opening the Clients list and Dashboard should feel
   instant (no visible network-wait), the concrete symptom this phase
   fixes.
5. Directly inspect `crm-data.db` with a SQLite browser (e.g. `DB
   Browser for SQLite`) to confirm the new `policies`, `vehicles`,
   `drivers`, `vehicle_drivers`, `driving_record_entries`,
   `property_details`, `household_members`, and `documents` tables
   exist with the right columns, and manually insert one test row per
   new table via IPC calls triggered from the DevTools console
   (`window.crmAPI.policies.create({...})`) to confirm the IPC layer
   round-trips correctly end-to-end, even though no UI exists yet to
   drive it (that's Phase B).
6. Confirm the app still works fully offline (no network requests at
   all) by checking the Network tab in DevTools while using every
   feature.

## Risks

- `better-sqlite3` is a native Node addon (compiled per Electron
  version/platform) — it needs to be rebuilt against Electron's Node
  ABI via `electron-rebuild` (or `@electron/rebuild`), which must run
  as a `postinstall` step and also needs to be accounted for in the
  GitHub Actions build workflow (`.github/workflows/build-windows.yml`)
  so the packaged `.exe` ships a correctly-built native binary, not
  just the dev machine's build. This is a real risk worth flagging
  before implementation — Phase A's plan must include verifying the
  GitHub Actions build still produces a working installer, not just
  that `npm start` works locally.
- Moving off Firebase Auth means the "safe if your PC/RDP session
  resets" property from the README no longer applies the way it did
  (data doesn't live in the cloud anymore). This is the direct,
  intended tradeoff of "keep everything on this PC" — worth being
  explicit that backups are now the user's responsibility (e.g.
  periodically copying `crm-data.db` and the `documents/` folder
  somewhere safe). Not building an automated backup feature in this
  phase — flagging it as a future consideration only.
