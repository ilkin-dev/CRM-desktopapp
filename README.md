# Kenny's Client Book — Windows Desktop App

A personal client management app: contacts, a call/quote/note timeline per client, standalone tasks, commission tracking on bound policies, and a dashboard for follow-ups and renewals. Runs as a native Windows app (Electron); your data lives in Firebase (cloud), not on your machine, so it's safe if your PC or RDP session resets.

## How it's built
- `app/` — the actual app (HTML/CSS/JS), talks to Firebase for data
- `main.js` — the Electron desktop shell that opens `app/` in a native window
- `.github/workflows/build-windows.yml` — automatically builds a Windows installer (`.exe`) every time code is pushed to `main`, and publishes it to this repo's **Releases** page
- You never need to install Node.js, npm, or any build tools yourself for the *build* — GitHub Actions does that part. You do need `git` locally to push.

## One-time setup

### 1. Firebase (the cloud database)
1. console.firebase.google.com → **Add project**.
2. **Build → Firestore Database → Create database** → Production mode → pick a location (e.g. `northamerica-northeast1`) → Enable.
3. **Build → Authentication → Get started** → enable **Email/Password**.
4. Authentication → **Users** tab → **Add user** → your email + a password. This is your login for the app.
5. Gear icon → **Project settings** → scroll to "Your apps" → click **</>** → register a web app → copy the config values shown (`apiKey`, `authDomain`, etc.).
6. Open `app/firebase-config.js` in this project, replace the `REPLACE_ME` placeholders with your real values.
7. Firestore Database → **Rules** tab → replace everything with the contents of `app/firestore.rules.txt` → **Publish**.

### 2. Push this code to your GitHub repo
Repo: **https://github.com/ilkin-dev/CRM-desktopapp**

From a terminal, inside this folder (`C:\Users\User\Documents\Projects\CRM-desktopapp`):
```
git init
git remote add origin https://github.com/ilkin-dev/CRM-desktopapp.git
git add .
git commit -m "Initial desktop app"
git branch -M main
git push -u origin main
```
If the repo already has commits (e.g. an initial README from GitHub), pull first: `git pull origin main --allow-unrelated-histories`, resolve any conflicts, then push.

### 3. Get your installer
1. On the repo page, click the **Actions** tab. You'll see "Build Windows Installer" running (takes 3-5 minutes).
2. Once it's green/complete, click **Releases** on the repo home page (or `github.com/ilkin-dev/CRM-desktopapp/releases`).
3. Download the `.exe` from the latest release, run it, follow the installer prompts.
4. Launch **Kenny's Client Book** from your Start menu — log in with the email/password you created in Firebase step 4.

### Updating the app later
Any time code changes and you `git push` to `main`, GitHub automatically builds a fresh installer and publishes a new release. Just download and reinstall to update — your data stays in Firebase untouched, since the app itself doesn't store data locally.

## Data model
- **clients**: fullName, status, phone, email, lineOfBusiness, carrier, renewalDate, referralSource, notes
- **interactions**: clientId, type (Call/Quote/Email/Meeting/Note/Bind/DASH Report), date, summary, quoteAmount, quoteLOB, followUpDate, followUpDone, premiumAmount, commissionRate, commissionAmount
- **tasks**: title, dueDate, done, notes, clientId (optional link)

## Compliance reminder
This app stores real client personal information. See the "CRM Setup Plan" document for what RIBO's Code of Conduct and PIPEDA expect (informed consent, no SIN/credit/medical data, confirm with Wellcare before loading real client records).
