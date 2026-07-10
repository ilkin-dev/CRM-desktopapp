# Phase 1 — Foundation: Refactor + Visual Redesign

## Context

Kenny's Client Book is an Electron desktop CRM (clients, interaction timeline,
tasks, document uploads, commission tracking) built as vanilla HTML/CSS/JS
talking to Firebase (Auth, Firestore, Storage). The goal across several
phases is to make it feel like a professional CRM app. This is a
multi-phase effort; this spec covers **only Phase 1**:

1. **Phase 1 — Foundation: refactor + visual redesign** (this spec)
2. Phase 2 — Global search + richer client filters
3. Phase 3 — Pipeline/kanban view for clients
4. Phase 4 — Reporting/analytics (charts)
5. Phase 5 — Notifications (native desktop + in-app bell/panel)

Each later phase gets its own design doc once Phase 1 is built and verified.
Phase 1 changes structure and visuals only — **no behavior changes**. Every
existing feature (dashboard, clients CRUD, interaction timeline, documents,
tasks, commissions, auth) must work identically after this phase, just
better organized and better looking.

## Goals

- Split the 830-line `app/app.js` monolith into focused, single-purpose
  modules so future phases (kanban, reports, search, notifications) add new
  files instead of growing one file further.
- Replace all emoji (~40+ occurrences across headers, buttons, badges,
  toasts, empty states) with a single centralized SVG icon system, extending
  the visual language the sidebar nav already uses (24×24 viewBox, 2px
  stroke, `currentColor`).
- Tighten typography/label consistency (card headers, table columns, brand
  mark, login screen) using the *existing* color token system — no new
  palette, no bundled webfonts.

## Non-goals (deferred to later phases)

- No kanban/board view.
- No notifications (native or in-app).
- No charts/reporting.
- No new search or filter fields.
- No changes to the Firestore/Storage data model or security rules.
- No build step / bundler / framework adoption — stays plain ES modules
  loaded via `<script type="module">`, matching how Electron's `main.js`
  already serves `app/` over a local `http://127.0.0.1` origin.

## Architecture: module split

Current: everything lives in `app/app.js` (auth wiring, router, and all six
view renderers, plus shared utils).

New layout:

```
app/
  app.js                    — auth wiring + hash router only (thin)
  icons.js                  — centralized SVG icon registry: icon(name) -> markup string
  utils.js                  — escapeHtml, toast, fmtDate, daysUntil, todayStr,
                               currency/phone formatters, showSpinner
  views/
    dashboard.js             — renderDashboard
    clients-list.js          — renderClientsList
    client-form.js           — renderClientForm
    client-detail.js          — renderClientDetail + renderDocuments
    tasks.js                  — renderTasks
    commissions.js            — renderCommissions
  db.js, storage.js, firebase-init.js, firebase-config.js
                              — unchanged (already well-isolated)
```

Each `views/*.js` module exports a single `render*(container, ...)` function
matching its current signature/behavior in `app.js` today. `app.js`'s
router imports each view module and calls the right renderer based on the
current hash — same routing logic as today, just delegating instead of
inlining.

Shared helper functions currently at the bottom of `app.js` (`escapeHtml`,
`toast`, `showSpinner`, `attachPhoneFormatter`, `attachCurrencyFormatter`,
`currencyValue`, `applyFieldFormatters`, `fmtDate`, `daysUntil`, `todayStr`,
`buildLobCheckboxes`, `getLobCheckboxValues`) move to `utils.js` and get
imported by whichever view modules need them.

`index.html` stays as-is structurally (templates, login screen, app shell) —
only the emoji inside its markup/templates are removed in favor of icon
slots (see below), and `<script type="module" src="app.js">` continues to
work unchanged since `app.js` remains the entry point.

## Icon system

New file `app/icons.js` exports:

```js
export function icon(name, opts) // returns an SVG markup string
```

Backed by a single registry object mapping icon names to `<path>` data,
reusing the exact stroke/viewBox convention already established by the
sidebar nav icons in `index.html`. Consuming code does
`el.innerHTML = icon("plus") + " Add Client"` (or icons are placed via
template strings) instead of an emoji character. Icon size/stroke width are
controlled by CSS classes (`.icon`, `.icon-sm`) the same way `.nav-icon` is
styled today, so icons inherit color (e.g. red for danger buttons, colored
per badge type) automatically via `currentColor`.

Icon inventory needed (replacing the current emoji maps in `app.js`):

- **Nav** (already exist as inline SVG in `index.html` — move into the
  registry so they're defined once, not duplicated): dashboard, clients,
  add-client, tasks, commissions.
- **Status** (was `STATUS_EMOJI`): new-lead, quoted, bound, active-client,
  renewal-due, referral-source, lapsed.
- **Line of business** (was `LOB_EMOJI`): auto, home, bundle, tenant, condo,
  business, umbrella, other.
- **Interaction type** (was `TYPE_EMOJI`): call, quote, email, meeting,
  note, bind, dash-report.
- **Document category** (was `DOC_EMOJI`): license, vehicle-photo,
  bill-of-sale, finance-app, proof-of-insurance, other.
- **UI actions**: plus, edit, trash, save, upload, eye (view), search,
  filter, close, check-circle (success toast), alert-circle (error toast),
  info-circle (neutral toast), key (login), logout, folder (empty
  documents), clipboard (empty timeline/tasks).

`app.js`'s current `statusEmoji()`, `lobEmoji()`, `typeEmoji()`, `docEmoji()`
helper functions are replaced by thin lookup functions in `utils.js` (or
inlined at call sites) that map a value to an icon *name*, then call
`icon(name)` — same call-site shape as today (`statusEmoji(status)` →
`statusIcon(status)`), so the view modules barely change beyond the import.

## Visual refinements

- **Color tokens**: unchanged — the existing `:root` CSS variables (navy,
  accent blue, status colors, shadows) stay exactly as they are. They're
  already coherent and don't need replacing.
- **Font**: stays on the existing system stack (`"Segoe UI", -apple-system,
  Arial, Helvetica, sans-serif`). This is a Windows-only Electron app —
  Segoe UI already reads as the native, professional Windows app font.
  Bundling a webfont (e.g. Inter) was considered and rejected: it adds
  asset weight and a font-loading step for marginal visual gain over what's
  already a first-class Windows system font.
- **Card headers** (`.card h3`): move from mixed-case + emoji prefix to
  icon + label, matching the sidebar nav's icon+text pattern, for visual
  consistency across the whole app.
- **View headers** (`.view-header h2`): same treatment — icon replaces
  emoji glyph.
- **Table columns**: numeric (Premium, Commission, Rate) and date
  (Renewal, Last Contact) columns in `.data-table` right-align via a new
  `.num` / `.date-col` utility class, standard convention for scannable
  data tables.
- **Sidebar brand mark**: `🗂️ Client Book` becomes an icon (a simple
  folder/briefcase mark from the registry) + wordmark, same treatment on
  the login screen's `<h1>`.
- **Buttons**: `💾 Save Client`, `➕ Add Client`, `🗑️ Delete`, `✏️ Edit`,
  `🔑 Sign In`, `🚪 Sign Out`, `⬆️ Upload`, `👁️ View` all become
  icon + text using the same `.btn` classes (no layout/behavior change).
- **Toasts**: the `✅/⚠️/🔔` text prefix in `utils.js`'s `toast()` becomes a
  small icon (`check-circle` / `alert-circle` / `info-circle`) rendered
  before the message, colored via the existing `.toast.success` /
  `.toast.error` classes.
- **Empty states**: emoji removed from empty-state copy (e.g. "🎉 Nothing
  due" → "Nothing due" or paired with a small icon), copy otherwise
  unchanged.
- **Badges** (status, LOB tags): icon replaces emoji inside the badge,
  color classes (`.badge.status-*`) unchanged.

## Data flow / behavior

No changes. Every `db.js`/`storage.js`/`firebase-init.js` call site,
Firestore query, and event handler keeps identical logic — this phase only
moves code between files and swaps emoji for icons/spacing tweaks in the
DOM strings.

## Testing / verification plan

This app has no automated test suite today (small solo-maintained app;
adding one is out of scope for this phase). Verification is manual:

1. Serve `app/` via a plain static file server (same files Electron's
   `main.js` serves) so it can be driven directly in a browser with the
   preview tools for fast iteration.
2. Walk every view (login, dashboard, clients list + search/filter,
   add/edit/delete client, client detail + log interaction of each type +
   upload/delete a document, tasks add/complete/delete, commissions) and
   confirm behavior is unchanged and no emoji remain / icons render
   correctly in both normal and colored (badge/button) contexts.
3. Final check: `npm start` (real Electron shell) to confirm the app boots
   and looks correct in the actual native window, not just the browser
   preview.

## Risks

- Firebase Auth against a real Firebase project requires real credentials;
  browser-based preview testing may hit login unless test credentials
  exist. If login can't be exercised in the browser preview, the visual/
  structural review happens on the reachable screens (login screen itself,
  and any views reachable by temporarily stubbing `getCurrentUser`/auth
  state during manual testing only — not shipped code), with final
  confirmation via real Electron + real login.
