# Athenaeum — Smart Digital Library

A full-stack library management **prototype** built from the supplied Google Stitch design
set (`stitch_smart_digital_library_landing.zip`). The ten Stitch screens were consolidated
into a single React + Vite application with an Express/MongoDB backend: real persistence,
working circulation and inventory workflows, and authentication.

The **"Warm Academic Archive"** visual identity from the Stitch export is preserved —
palette, typography, spacing scale, border radii and component styling are carried over
verbatim as Tailwind theme tokens.

> Not a finished product. See [Known limitations](#known-limitations) before putting
> anything real behind it.

---

## Running the app

### Requirements

- **Node.js 20 or newer** — check with `node -v`
- **MongoDB 6 or newer**, installed but *not* necessarily running: the launcher starts it
  for you if it is not already up

```bash
# macOS, only if you do not have MongoDB yet
brew tap mongodb/brew && brew install mongodb-community
```

### Start it

```bash
npm start
```

That is the whole thing. On the first run it:

1. installs dependencies
2. creates `server/.env` and fills in a freshly generated `JWT_SECRET`
3. reuses a MongoDB already listening on port 27017, or starts one
4. seeds the catalogue, disciplines, accounts and loan history — **only when the database is empty**
5. starts the API and the web client together

You will see:

```
  Athenaeum is starting up

    Web app   http://localhost:5180
    API       http://localhost:4110/api/health
    MongoDB   mongodb://127.0.0.1:27017/athenaeum

    Scholar   v.sterling@athenaeum-fellows.edu / Athenaeum#2024
    Staff     curator@athenaeum.edu / Athenaeum#2024
```

Open **http://localhost:5180**. The home page should show the Curator's Selection, a
disciplines grid and recent acquisitions. If you see those, everything is wired up.

### Stop it

`Ctrl-C` in that terminal. It stops both servers, and stops MongoDB too if it was the one
that started it. A MongoDB that was already running is left alone.

### Sign in

| Role | Email | Password | Unlocks |
| --- | --- | --- | --- |
| Scholar | `v.sterling@athenaeum-fellows.edu` | `Athenaeum#2024` | Borrowing, circulation ledger, saved titles |
| Librarian | `curator@athenaeum.edu` | `Athenaeum#2024` | + Inventory and Analytics |
| Administrator | `admin@athenaeum.edu` | `Athenaeum#2024` | Everything |

You can also register a new scholar at `/register`. These are prototype credentials —
change them before any shared deployment.

### Ports

Athenaeum deliberately avoids the usual Vite (5173) and API (4000) ports so it can run
alongside another project:

| Service | Default | Override |
| --- | --- | --- |
| Web client | `5180` | `WEB_PORT=5200 npm start` |
| API | `4110` | `API_PORT=4200 npm start` |
| MongoDB | `27017` | `MONGO_PORT=27018 npm start` |

The launcher checks these before starting and tells you what to do if one is taken, rather
than dying with a stack trace.

---

## Troubleshooting

**`port 4110 is busy` / `port 5180 is busy`**
Something else is on that port. Stop it, or move Athenaeum:

```bash
API_PORT=4200 WEB_PORT=5200 npm start
```

**`MongoDB is not installed`**
Install it (see above). Or, if you already have a MongoDB elsewhere, put its connection
string in `server/.env` as `MONGODB_URI` — the launcher will use that server instead of
starting its own.

**The app loads but the catalogue is empty**

```bash
npm run reset      # wipe and re-seed
```

**I want a completely clean slate**

```bash
npm run reset      # clears the data
rm -rf .data       # also deletes the local MongoDB data directory
```

**Where is my data actually stored?**
Wherever `MONGODB_URI` points. If the launcher started MongoDB itself, that is
`.data/mongodb` inside the project. If it reused a MongoDB that was already running, the
data lives in that server's own directory — so `rm -rf .data` will not clear it; `npm run
reset` will.

**The API printed `EADDRINUSE`**
That only happens if you bypassed the launcher and ran `npm run dev:server` directly.
`npm start` checks the port first and gives you a readable message.

**Changes are not reloading**
The API runs under `node --watch` and the client under Vite HMR, so both reload on save.
If the API stops responding, `Ctrl-C` and `npm start` again.

---

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm start` | Run everything — the one you want |
| `npm run reset` | Wipe and re-seed the database |
| `npm run seed` | Add any missing seed data; never deletes anything |
| `npm test` | API test suite (uses a separate throwaway database) |
| `npm run lint` | ESLint |
| `npm run build` | Production build of the client |
| `npm run serve` | Build, then serve the whole app on a single port |

---

## Configuration (`server/.env`)

`npm start` creates this file from `.env.example` on first run and fills in a real
`JWT_SECRET`, so you normally never need to open it.

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | Set to `production` to serve the built SPA from the API process |
| `PORT` | `4110` | API port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/athenaeum` | Point this at a hosted cluster if you prefer |
| `JWT_SECRET` | *generated* | **Required** in production — the server refuses to boot with the default |
| `JWT_EXPIRES_IN` | `7d` | Session lifetime |
| `CLIENT_ORIGIN` | `http://localhost:5180` | Allowed credentialed origin in development |
| `LOAN_PERIOD_DAYS` | `21` | Circulation window |
| `MAX_RENEWALS` | `2` | Renewals permitted per loan |

No real credentials are committed; `server/.env` is git-ignored and only
`server/.env.example` is tracked.

> `dotenv` never overrides a variable that already exists in your shell. If you have
> `NODE_ENV=production` exported globally, `npm start` still forces
> `NODE_ENV=development` for the dev servers — otherwise the API would try to serve the
> built bundle instead of running as a dev server.

### Running in production mode

```bash
npm run serve      # builds the client, then serves everything on PORT
```

The Express process then serves `client/dist` and falls back to `index.html` for
client-side routes, so the whole app runs on a single port.

---

## What is in the repository

| Path | Purpose |
| --- | --- |
| `client/` | React 18 + Vite single-page application |
| `client/src/screens/` | The ten Stitch screens, wired to live data |
| `client/src/components/` | Shared header, footer, book cards, route guards, state blocks |
| `client/src/context/` | Session (auth) and toast providers |
| `client/src/lib/` | API client and formatting helpers |
| `client/public/assets/` | Design assets bundled from the Stitch export |
| `scripts/start.mjs` | The single-command launcher behind `npm start` |
| `server/` | Express API, Mongoose models, routes and the seed script |
| `server/tests/` | End-to-end API test suite (`node:test`) |
| `stitch_source/` | The original extracted Stitch export, kept for provenance (git-ignored) |

---

## Routes

| Route | Screen | Access |
| --- | --- | --- |
| `/` | Home — curator's selection, disciplines, recent acquisitions | Public |
| `/catalog` | Universal catalogue with search, facets, sorting, pagination | Public |
| `/books/:id` | Codex registry record with borrow/return panel | Public (borrowing requires a session) |
| `/categories` | Academic disciplines with live holdings counts | Public |
| `/login` | Scholar login | Public |
| `/register` | Research account registration | Public |
| `/circulation` | Borrow & return — personal ledger for scholars, desk view for staff | Signed in |
| `/profile` | Scholar dossier, active loans, reserve shelf, history | Signed in |
| `/inventory` | Stock integrity, accessioning, audited adjustments | Librarian / Admin |
| `/admin/analytics` | Curator analytics aggregated from live data | Librarian / Admin |
| `*` | Archival "folio 404" | Public |

Navigation links, book cards, category cards and footer links all resolve to real
routes; there are no dead `href="#"` links in the application shell.

---

## API

All endpoints are namespaced under `/api`. Sessions use an **HTTP-only, SameSite=Lax**
cookie — no token is exposed to JavaScript.

### Auth
| Method | Endpoint | Notes |
| --- | --- | --- |
| `POST` | `/auth/register` | Creates a `scholar`; password policy enforced server-side |
| `POST` | `/auth/login` | Rate limited; identical error for unknown email and wrong password |
| `POST` | `/auth/logout` | Clears the session cookie |
| `GET` | `/auth/me` | Current session profile |

### Catalogue
| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/books` | `search`, `category[]`, `author[]`, `accessTier[]`, `codexLanguage[]`, `collection[]`, `yearFrom`, `yearTo`, `availability`, `featured`, `sort`, `page`, `limit` |
| `GET` | `/books/filters` | Facet counts aggregated from live documents |
| `GET` | `/books/:id` | Record + availability + related titles + caller's active loan |
| `POST` | `/books` | Staff only — accession a new record |
| `PATCH` | `/books/:id` | Staff only — metadata corrections |
| `POST` | `/books/:id/stock` | Staff only — audited copy adjustment |

### Circulation
| Method | Endpoint | Notes |
| --- | --- | --- |
| `POST` | `/loans` | Borrow a copy |
| `GET` | `/loans/me` | The caller's loans and history |
| `GET` | `/loans` | Staff only — desk view with `status` and `search` |
| `POST` | `/loans/:id/return` | Owner or staff |
| `POST` | `/loans/:id/renew` | Owner or staff; blocked once overdue or at the renewal cap |

### Disciplines, profile, analytics
| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/categories` | Disciplines with live title/copy/availability counts |
| `GET` | `/categories/:slug` | One discipline plus its catalogue slice |
| `GET` / `PATCH` | `/profile` | Scholar dossier |
| `POST` | `/profile/bookmarks/:bookId` | Toggle a saved title |
| `GET` | `/analytics/overview` | Staff only — KPIs, 12-month trend, top titles, discipline breakdown, audit ledger |

---

## Data model

- **User** — name, unique email, bcrypt hash (cost 12), role (`scholar` \| `librarian` \| `admin`),
  affiliation, discipline, membership tier, bookmarks.
- **Category** — discipline with slug, description, icon, collection note, ordering.
- **Book** — bibliographic record, `category` reference, shelfmark, call number, codex language,
  access tier, digitisation fidelity, `totalCopies` / `availableCopies`, tags, featured flag.
- **Loan** — `book`, `user`, `borrowedAt`, `dueDate`, `returnedAt`, `status`, `renewals`.
  Overdue and due-soon state are virtuals computed from `dueDate`.
- **InventoryTransaction** — append-only audit ledger; every stock movement records
  before/after totals, the delta, the reason and the acting user.

---

## Consistency guarantees

MongoDB documents are the single source of truth; an atomic, conditional update stands in
for a multi-document transaction (which requires a replica set) at every point where two
writers could otherwise corrupt stock:

- **Borrowing** claims a copy with
  `findOneAndUpdate({ _id, availableCopies: { $gt: 0 } }, { $inc: { availableCopies: -1 } })`.
  A second concurrent request for the final copy matches nothing and receives `409`.
- A **partial unique index** on `(book, user, status: 'active')` makes a duplicate active
  loan impossible even under a race; the compensating write releases the copy if loan
  creation fails after the claim.
- **Returning** flips the loan with a guarded update (`status: 'active'`) so a double return
  cannot succeed, then restores the copy but never above `totalCopies`.
- **Stock adjustments** reject any removal that would push the total below the number of
  copies currently on loan, and use a guarded `$inc` so available copies can never go negative.
- Model-level validation additionally rejects `availableCopies > totalCopies`.

Server-side authorisation is enforced on every protected route; the client-side route guard
is only a convenience.

---

## Dependencies and security

`npm audit` is clean across the root, client and server trees. Two advisories were
resolved by deliberate **major** upgrades rather than `npm audit fix --force`, because
both required API changes that a blind force could have broken silently:

| Package | From | To | Advisory | Code changes needed |
| --- | --- | --- | --- | --- |
| `zod` (server) | 3.x | 4.6.7 | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) — memory exhaustion validating oversized constrained collections | None for this schema set; validation was re-verified (see below) |
| `react-router-dom` (client) | 6.x | 7.18.4 | [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6), [GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg) | None — all v7 APIs used here are unchanged |

Both are the *only* patched versions: no fixed 3.x or 6.x release exists, so staying on
the old majors was not an option.

After the zod upgrade, validation was re-checked directly against the running API:
invalid emails are still rejected with a field-level message, oversized tag arrays are
refused, valid input is still accepted, and the 1 MB JSON body limit returns 413.

---

## Testing

```bash
npm test          # API end-to-end suite
npm run lint      # ESLint
npm run build     # production build
```

The suite runs against a real MongoDB using a **separate throwaway database**
(`athenaeum_test`) and cleans up after itself.

> The suite refuses to run against a database whose name does not contain `test`, so it
> can never delete your development catalogue. Earlier versions derived the test URI from
> `MONGODB_URI`; because importing the app runs `dotenv.config()`, that silently resolved
> to the development database and the cleanup hook wiped it. It now uses
> `ATHENAEUM_TEST_URI` and checks the URI *and* the connected database name before any
> delete.

### Results on the current working tree

| Check | Command | Result |
| --- | --- | --- |
| API test suite | `npm test` | **24 / 24 passing** |
| Lint | `npm run lint` | **0 errors, 0 warnings** |
| Production build | `npm run build` | **clean** |
| Dependency audit | `npm audit` (root, client, server) | **0 vulnerabilities** |

The API suite covers registration validation, duplicate-email rejection, session issuance,
wrong-password handling, authorization boundaries (401 unauthenticated vs 403
under-privileged), catalogue search and facet counts, the borrow → renew → return lifecycle,
double-return rejection, concurrent contention for the last copy, stock-adjustment limits,
audit-ledger writes and analytics aggregation.

### Browser verification performed

Driven with `agent-browser` against the running application (Chrome 156, headless):

- All ten routes loaded with **zero console errors and zero page errors**, at 1440, 1280,
  1024, 768 and 390 px wide, with no horizontal overflow at any width.
- Search (home hero → catalogue), sidebar facet toggles, era presets, sorting, view
  switching, pagination, quick-search chips and the empty-results state all behaved.
- Login, registration validation (email/password/confirmation messages), the live password
  strength meter, logout, and the post-logout redirect of a protected route were exercised.
- Book record tabs (Synopsis / Codicology / Circulation / Concordances) each render their
  own panel.
- Borrow → renew → return from the UI, with availability verified either side via the API
  (`4/4 → 3/4 → 4/4`) and the audit ledger checked directly in MongoDB.
- Accessioning a new title through the inventory modal persisted a record plus its
  acquisition ledger entry; the stock modal rejected an impossible removal and then
  successfully added copies.
- Design tokens confirmed from computed styles: body background `rgb(253,249,243)`
  (`#FDF9F3`), brass accent `rgb(197,155,39)` (`#C59B27`), walnut `rgb(43,27,23)`
  (`#2B1B17`), headings in **Newsreader**, UI text in **Plus Jakarta Sans**, and the card
  grid gutter at 24 px.
- Production mode verified on a separate port: the API serves `client/dist`, deep routes
  fall back to `index.html`, unknown `/api/*` paths return 404, and the server **refuses to
  boot in production with the default JWT secret**.

---

## Design provenance

Each screen in `client/src/screens/` was produced from the matching Stitch export by an
automated HTML → JSX conversion (preserving the original class lists), then refactored so
static regions became data-driven while the markup, typography and spacing stayed faithful.
The mapping is:

| Stitch export directory | Screen |
| --- | --- |
| `athenaeum_digital_library_home` | `HomePage.jsx` |
| `athenaeum_digital_library_catalog_book_discovery` | `CatalogPage.jsx` |
| `athenaeum_digital_library_book_details_codex_registry` | `BookDetailsPage.jsx` |
| `athenaeum_digital_library_borrow_return_management` | `CirculationPage.jsx` |
| `athenaeum_digital_library_archival_inventory_stock_management` | `InventoryPage.jsx` |
| `athenaeum_digital_library_curator_admin_analytics` | `AnalyticsPage.jsx` |
| `scholar_user_profile_dr._v._sterling` | `ProfilePage.jsx` |
| `athenaeum_digital_library_scholar_login` | `LoginPage.jsx` |
| `athenaeum_digital_library_register_research_account` | `RegisterPage.jsx` |
| `athenaeum_digital_library_academic_disciplines_categories` | `CategoriesPage.jsx` |

All imagery referenced by the Stitch screens was downloaded and bundled into
`client/public/assets/stitch/` so the application renders identically without depending on
remote hosts. Two Google-hosted logo URLs in the export now return **403**; the header and
footer therefore use the emblem extracted from `athenaeum_library_logo/code.html`, saved as
`client/public/assets/athenaeum-mark.svg`.

---

## Known limitations

These were left unimplemented deliberately rather than faked:

- **Federated single sign-on.** The Google and EduGAIN/Shibboleth buttons are present
  because they are part of the supplied design, but they need an institutional identity
  provider (client ID, tenant, SAML metadata) to work. They currently explain that and
  direct the user to the catalogue credentials form.
- **Semantic question answering.** The Archival Intelligence panel runs a full catalogue
  search across titles, authors, shelfmarks, tags and descriptions. Generative answers
  require a configured model provider, which is not available in this environment; the
  panel says so in its copy.
- **Conservation levy settlement.** Overdue levies are displayed and recorded in the
  circulation ledger but there is no payment provider integration.
- **Browser-based visual regression.** The application was verified in a real browser and its
  design tokens were confirmed from computed styles, but no automated pixel diff against the
  supplied `screen.png` files was run.
- **Colour contrast.** An axe-core audit reports one issue class on the home page: the
  design's `brass-muted` token (`#9E7B20`) used as small uppercase text over
  `cream-surface`/`parchment` measures roughly 4.1:1, just under the WCAG AA 4.5:1
  threshold. This colour comes straight from the supplied `DESIGN.md`, so it was **not**
  changed — altering it would deviate from the specified palette. If AA is required,
  darkening `brass-muted` to about `#8A6A16` in `client/tailwind.config.js` clears the
  threshold while remaining visually near-identical. No other automated accessibility
  violations were found.
