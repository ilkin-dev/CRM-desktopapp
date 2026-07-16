# Kenny's Client Book — Windows Desktop App

A personal insurance broker CRM: households, policies, vehicles, drivers, property details, a call/quote/note timeline per client, standalone tasks, commission tracking, reports, and a dashboard for follow-ups and renewals. Runs as a native Windows app (Electron); **your data lives entirely on this PC** — a local SQLite database and a local documents folder, no cloud, no network calls of any kind. Backups are your responsibility (see below).

## How it's built
- `app/` — the renderer (HTML/CSS/JS), talks to the main process over IPC via `window.crmAPI`
- `main.js` — the Electron desktop shell: opens `app/` in a native window, owns the SQLite database, serves uploaded documents back to the UI
- `preload.js` — the secure bridge exposing `window.crmAPI` to the renderer (contextIsolation stays on, nodeIntegration stays off)
- `ipc.js` — registers every IPC channel the renderer calls
- `db/` — the SQLite schema (`db/migrations/`), migration runner, and one data-access module per table
- `.github/workflows/build-windows.yml` — automatically builds a Windows installer (`.exe`) every time code is pushed to `main`, and publishes it to this repo's **Releases** page

## One-time setup

### 1. Push this code to your GitHub repo
Repo: **https://github.com/ilkin-dev/CRM-desktopapp**

From a terminal, inside this folder:
```
git add .
git commit -m "Update"
git push origin main
```

### 2. Get your installer
1. On the repo page, click the **Actions** tab. You'll see "Build Windows Installer" running (takes 3-5 minutes).
2. Once it's green/complete, click **Releases** on the repo home page.
3. Download the `.exe` from the latest release, run it, follow the installer prompts.
4. Launch **Kenny's Client Book** from your Start menu. First launch asks you to **set a password** — this is a local lock screen only (no account, no cloud), so pick something you'll remember; there's no "forgot password" recovery since nothing is stored remotely.

### Updating the app later
Any time code changes and you `git push` to `main`, GitHub automatically builds a fresh installer and publishes a new release. Just download and reinstall — your data (the SQLite database and documents folder, both in your Windows user profile's app-data directory) is untouched by reinstalling.

### Backups — your responsibility now
Since nothing lives in the cloud anymore, back up periodically by copying:
- `%APPDATA%\Kenny's Client Book\crm-data.db` (all client/policy/task/interaction data)
- `%APPDATA%\Kenny's Client Book\documents\` (every uploaded document)

to an external drive or cloud-synced folder (OneDrive, Google Drive, etc.) every so often.

## Data model
- **clients**: household-level info — fullName, status, phone/email, mailing & property address, date of birth, marital status, occupation, driver's license, referral source, notes
- **household_members**: dependents/spouse linked to a client
- **policies**: one client → many — type (Auto/Home/Tenant/Condo/Umbrella/Business), carrier, policy #, status, effective/renewal dates, premium, deductibles, endorsements, additional insureds
- **vehicles**: one auto policy → many — year/make/model/VIN, usage, ownership, garaging address
- **drivers**: one client → many, assignable to vehicles — license info
- **driving_record_entries**: violations/claims per driver (3-yr/6-yr windows)
- **property_details**: one home/condo/tenant policy → one — construction, roof, heating, plumbing, water/sewer, pool/pets, security, prior water damage claims
- **interactions**: clientId, type (Call/Quote/Email/Meeting/Note/Bind/DASH Report/Renewal Review/Claim Filed/Endorsement Request/Cancellation), date, summary, quote/premium/commission amounts, optional policyId link
- **tasks**: title, dueDate, done, notes, optional clientId link
- **documents**: category, name, local file path, optional policyId link

## Compliance reminder
This app stores real client personal information. See the "CRM Setup Plan" document for what RIBO's Code of Conduct and PIPEDA expect (informed consent, no SIN/credit/medical data, confirm with Wellcare before loading real client records).
